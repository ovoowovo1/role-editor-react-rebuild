import { GROUP_ROW_PREFIX, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup, RoleDocument } from '../../types/role';
import { moveBlock } from '../math';
import { groupForItem } from './editorGroupMutations';
import { syncGroups, touch } from './editorRoleUtils';
import {
  descendantLayerIdsForGroup,
  isGroupDescendant,
  membersForGroup,
  removeMembersFromAllGroups,
  withGroupMembers
} from './groupTree';

export type LayerDropIntent = 'sort' | 'join-group';
export type LayerDropPlacement = 'before' | 'after';

export interface LayerReorderOptions {
  intent?: LayerDropIntent;
  placement?: LayerDropPlacement;
  parentGroupId?: string;
  anchorGroupId?: string;
}

type LayerDragTarget =
  | { kind: 'group'; id: string }
  | { kind: 'item'; id: string };

function parseLayerDragTarget(rawId: string): LayerDragTarget {
  if (rawId.startsWith(GROUP_ROW_PREFIX)) return { kind: 'group', id: rawId.slice(GROUP_ROW_PREFIX.length) };
  if (rawId.startsWith(ITEM_ROW_PREFIX)) return { kind: 'item', id: rawId.slice(ITEM_ROW_PREFIX.length) };
  return { kind: 'item', id: rawId };
}

function orderedIds(role: RoleDocument, ids: string[]): string[] {
  const wanted = new Set(ids);
  return role.decorations.filter((item) => wanted.has(item.id)).map((item) => item.id);
}

function groupLayerIds(role: RoleDocument, group: DecorationGroup): string[] {
  return orderedIds(role, descendantLayerIdsForGroup(role.groups ?? [], group.id));
}

function indexesForIds(role: RoleDocument, ids: string[]): number[] {
  const wanted = new Set(ids);
  return role.decorations
    .map((item, index) => (wanted.has(item.id) ? index : -1))
    .filter((index) => index >= 0);
}

function moveLayerBlock(current: RoleDocument, movingIds: string[], overIds: string[], placement?: LayerDropPlacement): void {
  const movingSet = new Set(movingIds);
  const moving = current.decorations.filter((item) => movingSet.has(item.id));
  if (!moving.length) return;

  const targetIndexes = indexesForIds(current, overIds).filter((index) => !movingSet.has(current.decorations[index]?.id));
  if (!targetIndexes.length) return;

  const sourceIndexes = indexesForIds(current, movingIds);
  const sourceStart = Math.min(...sourceIndexes);
  const targetStart = Math.min(...targetIndexes);
  const remaining = current.decorations.filter((item) => !movingSet.has(item.id));
  const remainingTargetIds = new Set(overIds.filter((id) => !movingSet.has(id)));
  const remainingTargetIndexes = remaining
    .map((item, index) => (remainingTargetIds.has(item.id) ? index : -1))
    .filter((index) => index >= 0);
  if (!remainingTargetIndexes.length) return;

  const targetIndex = placement === 'before'
    ? Math.min(...remainingTargetIndexes)
    : placement === 'after'
      ? Math.max(...remainingTargetIndexes) + 1
      : sourceStart < targetStart
        ? Math.max(...remainingTargetIndexes) + 1
        : Math.min(...remainingTargetIndexes);
  current.decorations = moveBlock(current.decorations, moving, targetIndex);
}

function hasMoveTarget(movingIds: string[], overIds: string[]): boolean {
  const movingSet = new Set(movingIds);
  return overIds.some((id) => !movingSet.has(id));
}

function removeMovingIdsFromGroups(groups: DecorationGroup[], movingIds: string[]): DecorationGroup[] {
  const movingSet = new Set(movingIds);
  return groups.map((group) =>
    withGroupMembers(
      group,
      membersForGroup(group).filter((member) => !(member.type === 'layer' && movingSet.has(member.id))),
      groups
    )
  );
}

function ungroupedSelectedIds(current: RoleDocument, groups: DecorationGroup[], selectedDecorationIds: string[]): string[] {
  const selectedSet = new Set(selectedDecorationIds);
  const groupedIds = new Set(groups.flatMap((group) => descendantLayerIdsForGroup(groups, group.id)));
  return current.decorations
    .filter((item) => selectedSet.has(item.id) && !groupedIds.has(item.id))
    .map((item) => item.id);
}

function insertLayerIdsInGroup(
  group: DecorationGroup,
  groups: DecorationGroup[],
  movingIds: string[],
  anchorId?: string,
  placement?: LayerDropPlacement,
  anchorGroupId?: string
): DecorationGroup {
  const movingSet = new Set(movingIds);
  const members = membersForGroup(group).filter((member) => !(member.type === 'layer' && movingSet.has(member.id)));
  const idsToInsert = movingIds
    .filter((id) => !members.some((member) => member.type === 'layer' && member.id === id))
    .map((id) => ({ type: 'layer' as const, id }));
  const anchorIndex = anchorGroupId
    ? members.findIndex((member) => member.type === 'group' && member.id === anchorGroupId)
    : anchorId
      ? members.findIndex((member) => member.type === 'layer' && member.id === anchorId)
      : -1;
  const insertIndex = anchorIndex >= 0
    ? anchorIndex + (placement === 'after' ? 1 : 0)
    : 0;
  return withGroupMembers(group, [...members.slice(0, insertIndex), ...idsToInsert, ...members.slice(insertIndex)], groups);
}

function insertGroupInGroup(
  group: DecorationGroup,
  groups: DecorationGroup[],
  movingGroupId: string,
  anchorId?: string,
  placement?: LayerDropPlacement,
  anchorGroupId?: string
): DecorationGroup {
  const members = membersForGroup(group).filter((member) => !(member.type === 'group' && member.id === movingGroupId));
  const movingMember = { type: 'group' as const, id: movingGroupId };
  const anchorIndex = anchorGroupId
    ? members.findIndex((member) => member.type === 'group' && member.id === anchorGroupId)
    : anchorId
      ? members.findIndex((member) => member.type === 'layer' && member.id === anchorId)
      : -1;
  const insertIndex = anchorIndex >= 0
    ? anchorIndex + (placement === 'after' ? 1 : 0)
    : 0;
  return withGroupMembers(group, [...members.slice(0, insertIndex), movingMember, ...members.slice(insertIndex)], groups);
}

export function reorderBaseEditorLayers(
  current: RoleDocument,
  activeRowId: string,
  overRowId: string,
  selectedDecorationIds: string[],
  options: LayerReorderOptions = {}
): void {
  if (activeRowId === overRowId) return;

  const groups: DecorationGroup[] = current.groups ?? [];
  const active = parseLayerDragTarget(activeRowId);
  const over = parseLayerDragTarget(overRowId);

  const activeGroup = active.kind === 'group' ? groups.find((group) => group.id === active.id) : undefined;
  const overGroupFromHeader = over.kind === 'group' ? groups.find((group) => group.id === over.id) : undefined;
  const overGroupFromItem = over.kind === 'item' ? groupForItem(groups, over.id) : undefined;
  const parentGapGroup = options.parentGroupId ? groups.find((group) => group.id === options.parentGroupId) : undefined;
  const requestedJoinGroup = parentGapGroup ?? overGroupFromHeader ?? overGroupFromItem;
  let joinTargetGroup = options.intent === 'join-group' && requestedJoinGroup && !requestedJoinGroup.collapsed
    ? requestedJoinGroup
    : undefined;
  const joinAnchorId = joinTargetGroup && !options.anchorGroupId && over.kind === 'item' && overGroupFromItem?.id === joinTargetGroup.id
    ? over.id
    : undefined;
  const joinAnchorGroupId = joinTargetGroup && options.anchorGroupId ? options.anchorGroupId : undefined;
  const joinAnchorGroup = joinAnchorGroupId ? groups.find((group) => group.id === joinAnchorGroupId) : undefined;

  let movingIds: string[] = [];
  let overIds: string[] = [];

  if (active.kind === 'group') {
    if (!activeGroup) return;
    movingIds = groupLayerIds(current, activeGroup);
    const originalOverIds = overGroupFromHeader
      ? groupLayerIds(current, overGroupFromHeader)
      : over.kind === 'item'
        ? overGroupFromItem ? groupLayerIds(current, overGroupFromItem) : [over.id]
        : [];

    if (joinTargetGroup) {
      if (joinTargetGroup.id === activeGroup.id || isGroupDescendant(groups, activeGroup.id, joinTargetGroup.id)) return;
      const baseGroups = removeMembersFromAllGroups(groups, [{ type: 'group', id: activeGroup.id }]);
      current.groups = baseGroups.map((group) =>
        group.id === joinTargetGroup.id
          ? insertGroupInGroup(group, baseGroups, activeGroup.id, joinAnchorId, options.placement, joinAnchorGroupId)
          : group
      );
    }

    if (overGroupFromHeader) {
      overIds = originalOverIds;
    } else if (over.kind === 'item') {
      overIds = originalOverIds;
    }
  } else {
    const activeItemExists = current.decorations.some((item) => item.id === active.id);
    if (!activeItemExists) return;

    const sourceGroup = groupForItem(groups, active.id);
    const draggingSingleGroupedItem = !!sourceGroup;
    const selectedSet = new Set(selectedDecorationIds);
    if (joinTargetGroup && sourceGroup?.id === joinTargetGroup.id && !joinAnchorGroupId) {
      return;
    }

    movingIds = joinTargetGroup && !draggingSingleGroupedItem && selectedSet.has(active.id)
      ? ungroupedSelectedIds(current, groups, selectedDecorationIds)
      : !draggingSingleGroupedItem && selectedSet.has(active.id)
        ? current.decorations.filter((item) => selectedSet.has(item.id)).map((item) => item.id)
        : [active.id];

    if (joinTargetGroup) {
      overIds = joinAnchorGroup
        ? groupLayerIds(current, joinAnchorGroup)
        : joinAnchorId
          ? [joinAnchorId]
          : groupLayerIds(current, joinTargetGroup);
    } else if (overGroupFromHeader) {
      overIds = groupLayerIds(current, overGroupFromHeader);
    } else if (over.kind === 'item') {
      const sameGroupMove = sourceGroup && overGroupFromItem && sourceGroup.id === overGroupFromItem.id;
      overIds = overGroupFromItem && !sameGroupMove
        ? groupLayerIds(current, overGroupFromItem)
        : [over.id];
    }

    if (!movingIds.length || !overIds.length || !hasMoveTarget(movingIds, overIds)) return;

    if (movingIds.length) {
      const sameGroupMove = movingIds.length === 1 && sourceGroup && overGroupFromItem && sourceGroup.id === overGroupFromItem.id;
      if (joinTargetGroup) {
        const joinTargetGroupId = joinTargetGroup.id;
        const baseGroups = removeMovingIdsFromGroups(groups, movingIds);
        current.groups = baseGroups.map((group) =>
          group.id === joinTargetGroupId
            ? insertLayerIdsInGroup(group, baseGroups, movingIds, joinAnchorId, options.placement, joinAnchorGroupId)
            : group
        );
      } else if (!sameGroupMove) {
        current.groups = removeMovingIdsFromGroups(groups, movingIds);
      }
    }
  }

  if (!movingIds.length || !overIds.length || !hasMoveTarget(movingIds, overIds)) return;
  moveLayerBlock(current, movingIds, overIds, joinTargetGroup && !joinAnchorId && !joinAnchorGroup ? 'before' : options.placement);
}

function sameGroups(a: DecorationGroup[] | undefined, b: DecorationGroup[] | undefined): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftGroup = left[index];
    const rightGroup = right[index];
    if (
      leftGroup.id !== rightGroup.id ||
      leftGroup.name !== rightGroup.name ||
      leftGroup.collapsed !== rightGroup.collapsed ||
      leftGroup.visible !== rightGroup.visible ||
      leftGroup.itemIds.length !== rightGroup.itemIds.length ||
      membersForGroup(leftGroup).length !== membersForGroup(rightGroup).length
    ) {
      return false;
    }
    for (let itemIndex = 0; itemIndex < leftGroup.itemIds.length; itemIndex += 1) {
      if (leftGroup.itemIds[itemIndex] !== rightGroup.itemIds[itemIndex]) return false;
    }
    const leftMembers = membersForGroup(leftGroup);
    const rightMembers = membersForGroup(rightGroup);
    for (let memberIndex = 0; memberIndex < leftMembers.length; memberIndex += 1) {
      if (leftMembers[memberIndex].type !== rightMembers[memberIndex].type || leftMembers[memberIndex].id !== rightMembers[memberIndex].id) {
        return false;
      }
    }
  }
  return true;
}

export function reorderBaseEditorLayersImmutable(
  role: RoleDocument,
  activeRowId: string,
  overRowId: string,
  selectedDecorationIds: string[],
  options: LayerReorderOptions = {}
): RoleDocument | null {
  if (activeRowId === overRowId) return null;

  const draft: RoleDocument = {
    ...role,
    decorations: role.decorations,
    groups: (role.groups ?? []).map((group) => ({
      ...group,
      itemIds: [...group.itemIds],
      members: membersForGroup(group)
    }))
  };

  reorderBaseEditorLayers(draft, activeRowId, overRowId, selectedDecorationIds, options);

  if (draft.decorations === role.decorations && sameGroups(draft.groups, role.groups)) {
    return null;
  }

  return syncGroups(touch(draft));
}
