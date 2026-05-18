import {
  GROUP_ROW_PREFIX,
  HEAD_ATOM,
  HEAD_LAYER_ID,
  HEAD_ROW_ID,
  ITEM_ROW_PREFIX
} from '../../constants/layers';
import type { DecorationGroup, RoleDocument } from '../../types/role';
import { createId } from '../math';
import type { LayerReorderOptions } from './editorLayerDrag';
import { atomToLayerId, atomsForRole, deriveRoleFromAtoms, layerIdToAtom, orderedLayerIds } from './layerOrdering';
import { groupForItem } from './editorGroupMutations';
import { syncGroups } from './editorRoleUtils';
import {
  descendantLayerIdsForGroup,
  directParentGroup,
  groupsContainHead,
  isGroupDescendant,
  membersForGroup,
  removeMembersFromAllGroups,
  withGroupMembers
} from './groupTree';

type LayerDragTarget =
  | { kind: 'head' }
  | { kind: 'group'; id: string }
  | { kind: 'item'; id: string };

function parseLayerDragTarget(rawId: string): LayerDragTarget {
  if (rawId === HEAD_ROW_ID) return { kind: 'head' };
  if (rawId.startsWith(GROUP_ROW_PREFIX)) return { kind: 'group', id: rawId.slice(GROUP_ROW_PREFIX.length) };
  if (rawId.startsWith(ITEM_ROW_PREFIX)) return { kind: 'item', id: rawId.slice(ITEM_ROW_PREFIX.length) };
  return { kind: 'item', id: rawId };
}

function atomsForTarget(role: RoleDocument, target: LayerDragTarget, options: LayerReorderOptions = {}): string[] {
  if (options.intent !== 'join-group') {
    if (target.kind === 'head') return [HEAD_ATOM];
    if (target.kind === 'group') {
      const group = role.groups?.find((item) => item.id === target.id);
      return group ? orderedLayerIds(role, descendantLayerIdsForGroup(role.groups ?? [], group.id)).map(layerIdToAtom) : [];
    }
    return role.decorations.some((item) => item.id === target.id) ? [target.id] : [];
  }

  if (options.anchorGroupId) {
    const anchorGroup = role.groups?.find((item) => item.id === options.anchorGroupId);
    if (anchorGroup) return orderedLayerIds(role, descendantLayerIdsForGroup(role.groups ?? [], anchorGroup.id)).map(layerIdToAtom);
  }
  if (target.kind === 'head') return [HEAD_ATOM];
  if (target.kind === 'group') {
    const group = role.groups?.find((item) => item.id === target.id);
    return group ? orderedLayerIds(role, descendantLayerIdsForGroup(role.groups ?? [], group.id)).map(layerIdToAtom) : [];
  }
  return role.decorations.some((item) => item.id === target.id) ? [target.id] : [];
}

function atomsForActive(role: RoleDocument, target: LayerDragTarget, selectedIds: string[]): string[] {
  if (target.kind === 'head') return [HEAD_ATOM];
  if (target.kind === 'group') return atomsForTarget(role, target);

  const activeExists = role.decorations.some((item) => item.id === target.id);
  if (!activeExists) return [];

  const sourceGroup = groupForItem(role.groups ?? [], target.id);
  const selected = new Set(selectedIds);
  if (!sourceGroup && selected.has(target.id)) {
    return atomsForRole(role).filter((atom) => selected.has(atomToLayerId(atom)));
  }
  return [target.id];
}

function groupForTarget(role: RoleDocument, target: LayerDragTarget, options: LayerReorderOptions = {}): DecorationGroup | null {
  if (options.intent !== 'join-group') return null;
  if (options.parentGroupId) return role.groups?.find((group) => group.id === options.parentGroupId) ?? null;
  if (target.kind === 'group') return role.groups?.find((group) => group.id === target.id) ?? null;
  if (target.kind === 'item') return groupForItem(role.groups ?? [], target.id) ?? null;
  if (target.kind === 'head') return groupForItem(role.groups ?? [], HEAD_LAYER_ID) ?? null;
  return null;
}

function hasMoveTarget(movingAtoms: string[], overAtoms: string[]): boolean {
  const movingSet = new Set(movingAtoms);
  return overAtoms.some((atom) => !movingSet.has(atom));
}

function syncGroupsForMovedAtoms(
  role: RoleDocument,
  active: LayerDragTarget,
  over: LayerDragTarget,
  movingAtoms: string[],
  options: LayerReorderOptions = {}
): void {
  const movingIds = movingAtoms.map(atomToLayerId);
  const targetGroup = groupForTarget(role, over, options);
  const targetGroupId = targetGroup?.id ?? null;
  const canJoinTargetGroup = Boolean(targetGroup && !targetGroup.collapsed);
  const anchorId = canJoinTargetGroup && !options.anchorGroupId && over.kind === 'item' ? over.id : canJoinTargetGroup && !options.anchorGroupId && over.kind === 'head' ? HEAD_LAYER_ID : undefined;
  const anchorGroupId = canJoinTargetGroup ? options.anchorGroupId : undefined;
  const movingMembers = active.kind === 'group'
    ? [{ type: 'group' as const, id: active.id }]
    : movingIds.map((id) => ({ type: 'layer' as const, id }));

  if (canJoinTargetGroup && targetGroupId) {
    const baseGroups = removeMembersFromAllGroups(role.groups ?? [], movingMembers);
    role.groups = baseGroups.map((group) => {
      if (group.id !== targetGroupId) return group;
      const members = membersForGroup(group);
      const anchorIndex = anchorGroupId
        ? members.findIndex((member) => member.type === 'group' && member.id === anchorGroupId)
        : anchorId
          ? members.findIndex((member) => member.type === 'layer' && member.id === anchorId)
          : -1;
      const insertIndex = anchorIndex >= 0
        ? anchorIndex + (options.placement === 'after' ? 1 : 0)
        : 0;
      return withGroupMembers(group, [...members.slice(0, insertIndex), ...movingMembers, ...members.slice(insertIndex)], baseGroups);
    });
    return;
  }

  role.groups = removeMembersFromAllGroups(role.groups ?? [], movingMembers);

  if (!canJoinTargetGroup && active.kind === 'item' && over.kind === 'head' && movingAtoms.length === 1) {
    role.groups = (role.groups ?? [])
      .map((group) => withGroupMembers(group, membersForGroup(group).filter((member) => !(member.type === 'layer' && member.id === active.id)), role.groups ?? []))
      .filter((group) => group.itemIds.length >= 2);
  }
}

export function reorderIncludingHead(
  role: RoleDocument,
  activeRowId: string,
  overRowId: string,
  selectedIds: string[],
  options: LayerReorderOptions = {}
): RoleDocument | null {
  const active = parseLayerDragTarget(activeRowId);
  const over = parseLayerDragTarget(overRowId);
  if (options.intent === 'join-group' && active.kind === 'group') {
    const targetGroup = groupForTarget(role, over, options);
    if (!targetGroup || targetGroup.collapsed || targetGroup.id === active.id || isGroupDescendant(role.groups ?? [], active.id, targetGroup.id)) {
      return role;
    }
  }
  const joinTargetGroup = groupForTarget(role, over, options);
  const overAtoms = atomsForTarget(role, over, options);
  const movingAtoms = atomsForActive(role, active, selectedIds);
  const involvesHead = movingAtoms.includes(HEAD_ATOM) || overAtoms.includes(HEAD_ATOM);
  if (!involvesHead) return null;

  if (!movingAtoms.length || !overAtoms.length) return role;

  const originalAtoms = atomsForRole(role);
  if (!hasMoveTarget(movingAtoms, overAtoms)) return role;

  const movingSet = new Set(movingAtoms);
  const overSet = new Set(overAtoms);
  const sourceIndexes = originalAtoms.map((id, index) => (movingSet.has(id) ? index : -1)).filter((index) => index >= 0);
  const overIndexes = originalAtoms.map((id, index) => (overSet.has(id) ? index : -1)).filter((index) => index >= 0);
  if (!sourceIndexes.length || !overIndexes.length) return role;

  const sourceStart = Math.min(...sourceIndexes);
  const overStart = Math.min(...overIndexes);
  const remainingAtoms = originalAtoms.filter((id) => !movingSet.has(id));
  const remainingOverIndexes = remainingAtoms.map((id, index) => (overSet.has(id) ? index : -1)).filter((index) => index >= 0);
  if (!remainingOverIndexes.length) return role;

  const targetIndex = options.intent === 'join-group' && over.kind === 'group' && !options.anchorGroupId
    ? Math.min(...remainingOverIndexes)
    : options.placement === 'before'
      ? Math.min(...remainingOverIndexes)
      : options.placement === 'after'
        ? Math.max(...remainingOverIndexes) + 1
        : sourceStart < overStart
          ? Math.max(...remainingOverIndexes) + 1
          : Math.min(...remainingOverIndexes);
  const nextAtoms = [...remainingAtoms.slice(0, targetIndex), ...movingAtoms, ...remainingAtoms.slice(targetIndex)];
  const nextRole = deriveRoleFromAtoms(role, nextAtoms);
  syncGroupsForMovedAtoms(nextRole, active, over, movingAtoms, options);
  return syncGroups(nextRole);
}

export function toggleHeadVisibility(role: RoleDocument): RoleDocument {
  return {
    ...role,
    headLayer: {
      ...role.headLayer,
      visible: role.headLayer.visible === false
    },
    updatedAt: new Date().toISOString()
  };
}

function nextGroupName(role: RoleDocument): string {
  return `Group ${(role.groups ?? []).length + 1}`;
}

export function nextGroupId(): string {
  return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ungroupedSelectedLayerIds(role: RoleDocument, selectedIds: string[]): string[] {
  const selected = new Set(selectedIds);
  const grouped = new Set((role.groups ?? []).flatMap((group) => descendantLayerIdsForGroup(role.groups ?? [], group.id)));
  return orderedLayerIds(role, selectedIds).filter((id) => selected.has(id) && !grouped.has(id));
}

interface GroupSelectionTarget {
  itemIds: string[];
  parentGroupId: string | null;
}

function groupSelectionTarget(role: RoleDocument, selectedIds: string[]): GroupSelectionTarget | null {
  if (selectedIds.length < 2) return null;
  const selected = new Set(selectedIds);
  if (selected.has(HEAD_LAYER_ID)) return null;
  const groups = role.groups ?? [];
  const directParentByLayerId = new Map<string, string | null>();
  for (const group of groups) {
    for (const member of membersForGroup(group)) {
      if (member.type === 'layer') directParentByLayerId.set(member.id, group.id);
    }
  }

  let parentGroupId: string | null | undefined;
  const itemIds: string[] = [];
  for (const id of orderedLayerIds(role, selectedIds)) {
    if (!selected.has(id) || id === HEAD_LAYER_ID) continue;
    if (!role.decorations.some((item) => item.id === id)) continue;
    const currentParentId = directParentByLayerId.has(id) ? directParentByLayerId.get(id) ?? null : null;
    if (parentGroupId === undefined) {
      parentGroupId = currentParentId;
    } else if (parentGroupId !== currentParentId) {
      return null;
    }
    itemIds.push(id);
  }

  if (itemIds.length < 2 || parentGroupId === undefined) return null;
  if (parentGroupId) {
    const parent = groups.find((group) => group.id === parentGroupId);
    if (!parent) return null;
    const selectedItemIds = new Set(itemIds);
    const orderedParentIds = membersForGroup(parent)
      .filter((member) => member.type === 'layer' && selectedItemIds.has(member.id))
      .map((member) => member.id);
    return orderedParentIds.length >= 2 ? { itemIds: orderedParentIds, parentGroupId } : null;
  }
  return { itemIds, parentGroupId };
}

export function hasGroupableSelectedLayerIds(role: RoleDocument, selectedIds: string[]): boolean {
  return groupSelectionTarget(role, selectedIds) !== null;
}

export function createGroupFromLayerSelection(role: RoleDocument, selectedIds: string[]): RoleDocument | null {
  const target = groupSelectionTarget(role, selectedIds);
  if (!target) return null;
  const groups = role.groups ?? [];
  const childGroup: DecorationGroup = {
    id: nextGroupId(),
    name: nextGroupName(role),
    itemIds: target.itemIds,
    members: target.itemIds.map((id) => ({ type: 'layer', id })),
    visible: true,
    collapsed: false
  };

  if (target.parentGroupId) {
    const nextGroups = groups.map((group) => {
      if (group.id !== target.parentGroupId) return group;
      const selectedSet = new Set(target.itemIds);
      let inserted = false;
      const members = membersForGroup(group).flatMap((member) => {
        if (member.type !== 'layer' || !selectedSet.has(member.id)) return [member];
        if (inserted) return [];
        inserted = true;
        return [{ type: 'group' as const, id: childGroup.id }];
      });
      return withGroupMembers(group, members, [...groups, childGroup]);
    });
    return syncGroups({
      ...role,
      groups: [...nextGroups, childGroup],
      updatedAt: new Date().toISOString()
    });
  }

  return {
    ...role,
    groups: [
      ...groups,
      childGroup
    ],
    updatedAt: new Date().toISOString()
  };
}

export function setGroupVisibilityIncludingHead(role: RoleDocument, groupId: string, visible: boolean): RoleDocument {
  const group = role.groups?.find((item) => item.id === groupId);
  if (!group) return role;
  const groups = role.groups ?? [];
  const ids = new Set(descendantLayerIdsForGroup(groups, groupId));
  const childGroupIds = new Set<string>([groupId]);
  const visitGroup = (id: string) => {
    const current = groups.find((item) => item.id === id);
    if (!current) return;
    for (const member of membersForGroup(current)) {
      if (member.type === 'group' && !childGroupIds.has(member.id)) {
        childGroupIds.add(member.id);
        visitGroup(member.id);
      }
    }
  };
  visitGroup(groupId);
  return {
    ...role,
    groups: groups.map((item) => (childGroupIds.has(item.id) ? { ...item, visible } : item)),
    decorations: role.decorations.map((item) => (ids.has(item.id) ? { ...item, visible } : item)),
    headLayer: ids.has(HEAD_LAYER_ID) ? { ...role.headLayer, visible } : role.headLayer,
    updatedAt: new Date().toISOString()
  };
}

export function ungroupIncludingHead(role: RoleDocument, groupId: string): RoleDocument {
  const groups = role.groups ?? [];
  const group = groups.find((item) => item.id === groupId);
  const ids = new Set(group ? descendantLayerIdsForGroup(groups, group.id) : []);
  const groupMembers = group ? membersForGroup(group) : [];
  const parent = group ? directParentGroup(groups, { type: 'group', id: groupId }) : undefined;
  return {
    ...role,
    groups: groups
      .filter((item) => item.id !== groupId)
      .map((item) => {
        if (parent && item.id === parent.id) {
          const members = membersForGroup(item).flatMap((member) =>
            member.type === 'group' && member.id === groupId ? groupMembers : [member]
          );
          return withGroupMembers(item, members, groups);
        }
        return item;
      }),
    decorations: role.decorations.map((item) => (ids.has(item.id) ? { ...item, visible: true } : item)),
    headLayer: ids.has(HEAD_LAYER_ID) ? { ...role.headLayer, visible: true } : role.headLayer,
    updatedAt: new Date().toISOString()
  };
}

export function groupContainsHeadLayer(role: RoleDocument, groupId: string): boolean {
  return groupsContainHead(role.groups ?? [], groupId);
}

export function decorationIdsFromLayerIds(role: RoleDocument, layerIds: string[]): string[] {
  const existing = new Set(role.decorations.map((item) => item.id));
  return layerIds.filter((id) => existing.has(id));
}

export function toggleLayerSelection(current: string[], ids: string[], additive: boolean): string[] {
  if (!additive) return ids;
  const next = new Set(current);
  const allSelected = ids.every((id) => next.has(id));
  ids.forEach((id) => {
    if (allSelected) next.delete(id);
    else next.add(id);
  });
  return Array.from(next);
}

