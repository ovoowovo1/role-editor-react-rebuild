import type { DecorationGroup, DecorationLayer, EditorClipboardItem, PartOption, RoleDocument } from '../../types/role';
import { createId } from '../math';
import { insertDecorations, type InsertDraftSettings } from './editorInsertSettings';
import { syncGroups } from './editorRoleUtils';
import { descendantLayerIdsForGroup, membersForGroup, topLevelGroupIds } from './groupTree';
import { nextGroupId } from './headLayerMutations';

export function nextGroupName(role: RoleDocument): string {
  return `Group ${(role.groups ?? []).length + 1}`;
}

export function makeCenteredDecoration(option: PartOption): DecorationLayer {
  return {
    id: createId('deco'),
    code: option.code,
    assetId: option.id,
    name: option.label,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

export function copyDecoration(
  item: DecorationLayer | EditorClipboardItem,
  patch: Partial<DecorationLayer> = {}
): DecorationLayer {
  return { ...item, id: createId('deco'), ...patch };
}

export function remapImportedGroups(
  incoming: RoleDocument,
  idMap: Map<string, string>,
  fallbackName: (group: DecorationGroup) => string
): DecorationGroup[] {
  const groupIdMap = new Map((incoming.groups ?? []).map((group) => [group.id, nextGroupId()]));
  return (incoming.groups ?? [])
    .map((group): DecorationGroup | null => {
      const members = membersForGroup(group)
        .map((member) => {
          if (member.type === 'group') {
            const mappedGroupId = groupIdMap.get(member.id);
            return mappedGroupId ? { type: 'group' as const, id: mappedGroupId } : null;
          }
          const mappedId = idMap.get(member.id);
          return mappedId ? { type: 'layer' as const, id: mappedId } : null;
        })
        .filter((member): member is NonNullable<typeof member> => member !== null);
      const itemIds = descendantLayerIdsForGroup(incoming.groups ?? [], group.id)
        .map((id) => idMap.get(id))
        .filter((id): id is string => Boolean(id));
      if (itemIds.length < 2) return null;
      return {
        id: groupIdMap.get(group.id) ?? nextGroupId(),
        name: group.name || fallbackName(group),
        visible: group.visible !== false,
        collapsed: group.collapsed === true,
        itemIds,
        members
      };
    })
    .filter((group): group is DecorationGroup => group !== null);
}

function wrapImportedGroups(
  baseRole: RoleDocument,
  incoming: RoleDocument,
  copied: DecorationLayer[],
  importedGroups: DecorationGroup[],
  idMap: Map<string, string>
): DecorationGroup | null {
  if (copied.length < 2) return null;

  const topLevelIds = topLevelGroupIds(importedGroups);
  const topLevelGroupByLayerId = new Map<string, string>();
  for (const groupId of topLevelIds) {
    for (const layerId of descendantLayerIdsForGroup(importedGroups, groupId)) {
      topLevelGroupByLayerId.set(layerId, groupId);
    }
  }

  const members: DecorationGroup['members'] = [];
  const addedGroups = new Set<string>();
  for (const item of incoming.decorations) {
    const copiedId = idMap.get(item.id);
    if (!copiedId) continue;
    const groupId = topLevelGroupByLayerId.get(copiedId);
    if (groupId) {
      if (addedGroups.has(groupId)) continue;
      addedGroups.add(groupId);
      members.push({ type: 'group', id: groupId });
      continue;
    }
    members.push({ type: 'layer', id: copiedId });
  }

  if (!members.length) return null;
  return {
    id: nextGroupId(),
    name: incoming.name.trim() || nextGroupName(baseRole),
    itemIds: copied.map((item) => item.id),
    members,
    visible: true,
    collapsed: true
  };
}

export function mergeImportedDecorationsIntoRole(
  role: RoleDocument,
  incoming: RoleDocument,
  settings: InsertDraftSettings
): { role: RoleDocument; copiedIds: string[] } | null {
  const idMap = new Map<string, string>();
  const copied = incoming.decorations.map((item) => {
    const next = copyDecoration(item);
    idMap.set(item.id, next.id);
    return next;
  });
  if (!copied.length) return null;

  const baseRole = insertDecorations(role, copied, settings);
  const importedGroups = remapImportedGroups(incoming, idMap, (group) => group.name);
  const wrapperGroup = wrapImportedGroups(baseRole, incoming, copied, importedGroups, idMap);
  const groups = wrapperGroup
    ? [...(baseRole.groups ?? []), wrapperGroup, ...importedGroups]
    : [...(baseRole.groups ?? []), ...importedGroups];

  return {
    role: syncGroups({
      ...baseRole,
      groups,
      updatedAt: new Date().toISOString()
    }),
    copiedIds: copied.map((item) => item.id)
  };
}

export function insertDecorationBatchIntoRole(
  role: RoleDocument,
  decorations: DecorationLayer[],
  groupName: string,
  settings: InsertDraftSettings
): { role: RoleDocument; copiedIds: string[] } | null {
  const copied = decorations.map((item) => copyDecoration(item));
  if (!copied.length) return null;

  const baseRole = insertDecorations(role, copied, settings);
  const copiedIds = copied.map((item) => item.id);
  const groups: DecorationGroup[] = [...(baseRole.groups ?? [])];

  if (copiedIds.length >= 2) {
    groups.push({
      id: createId('group'),
      name: groupName.trim() || nextGroupName(baseRole),
      itemIds: copiedIds,
      members: copiedIds.map((id) => ({ type: 'layer', id })),
      visible: true,
      collapsed: false
    });
  }

  return {
    role: syncGroups({
      ...baseRole,
      groups,
      updatedAt: new Date().toISOString()
    }),
    copiedIds
  };
}
