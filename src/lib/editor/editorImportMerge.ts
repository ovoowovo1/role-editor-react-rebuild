import type { DecorationGroup, DecorationLayer, EditorClipboardItem, PartOption, RoleDocument } from '../../types/role';
import { createId } from '../math';
import { insertDecorations, type InsertDraftSettings } from './editorInsertSettings';
import { syncGroups } from './editorRoleUtils';
import { descendantLayerIdsForGroup, membersForGroup } from './groupTree';
import { nextGroupId } from './headLayerMutations';

export interface DecorationBatchGroupDraft {
  name?: string;
  itemIds: string[];
}

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

  return {
    role: syncGroups({
      ...baseRole,
      groups: [...(baseRole.groups ?? []), ...importedGroups],
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

export function insertGroupedDecorationBatchIntoRole(
  role: RoleDocument,
  decorations: DecorationLayer[],
  groupDrafts: DecorationBatchGroupDraft[],
  groupName: string,
  settings: InsertDraftSettings
): { role: RoleDocument; copiedIds: string[] } | null {
  const idMap = new Map<string, string>();
  const copied = decorations.map((item) => {
    const next = copyDecoration(item);
    idMap.set(item.id, next.id);
    return next;
  });
  if (!copied.length) return null;

  const baseRole = insertDecorations(role, copied, settings);
  const copiedIds = copied.map((item) => item.id);
  const groups: DecorationGroup[] = [...(baseRole.groups ?? [])];

  groupDrafts.forEach((draft, index) => {
    const seen = new Set<string>();
    const itemIds = draft.itemIds
      .map((id) => idMap.get(id))
      .filter((id): id is string => Boolean(id))
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    if (itemIds.length < 2) return;
    groups.push({
      id: createId('group'),
      name: draft.name?.trim() || `${groupName.trim() || nextGroupName(baseRole)} ${index + 1}`,
      itemIds,
      members: itemIds.map((id) => ({ type: 'layer', id })),
      visible: true,
      collapsed: false
    });
  });

  return {
    role: syncGroups({
      ...baseRole,
      groups,
      updatedAt: new Date().toISOString()
    }),
    copiedIds
  };
}
