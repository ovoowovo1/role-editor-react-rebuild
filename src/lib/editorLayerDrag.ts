import { GROUP_ROW_PREFIX, ITEM_ROW_PREFIX } from '../constants/layers';
import type { DecorationGroup, RoleDocument } from '../types/role';
import { moveBlock } from './math';
import { groupForItem } from './editorGroupMutations';

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

function indexesForIds(role: RoleDocument, ids: string[]): number[] {
  const wanted = new Set(ids);
  return role.decorations
    .map((item, index) => (wanted.has(item.id) ? index : -1))
    .filter((index) => index >= 0);
}

function moveLayerBlock(current: RoleDocument, movingIds: string[], overIds: string[]): void {
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

  const targetIndex = sourceStart < targetStart
    ? Math.max(...remainingTargetIndexes) + 1
    : Math.min(...remainingTargetIndexes);
  current.decorations = moveBlock(current.decorations, moving, targetIndex);
}

export function reorderBaseEditorLayers(current: RoleDocument, activeRowId: string, overRowId: string, selectedDecorationIds: string[]): void {
  if (activeRowId === overRowId) return;

  const groups: DecorationGroup[] = current.groups ?? [];
  const active = parseLayerDragTarget(activeRowId);
  const over = parseLayerDragTarget(overRowId);

  const activeGroup = active.kind === 'group' ? groups.find((group) => group.id === active.id) : undefined;
  const overGroupFromHeader = over.kind === 'group' ? groups.find((group) => group.id === over.id) : undefined;
  const overGroupFromItem = over.kind === 'item' ? groupForItem(groups, over.id) : undefined;

  let movingIds: string[] = [];
  let overIds: string[] = [];

  if (active.kind === 'group') {
    if (!activeGroup) return;
    movingIds = orderedIds(current, activeGroup.itemIds);

    if (overGroupFromHeader) {
      overIds = orderedIds(current, overGroupFromHeader.itemIds);
    } else if (over.kind === 'item') {
      const targetGroup = overGroupFromItem;
      overIds = targetGroup ? orderedIds(current, targetGroup.itemIds) : [over.id];
    }
  } else {
    const activeItemExists = current.decorations.some((item) => item.id === active.id);
    if (!activeItemExists) return;

    const sourceGroup = groupForItem(groups, active.id);
    const draggingSingleGroupedItem = !!sourceGroup;
    const selectedSet = new Set(selectedDecorationIds);

    movingIds = !draggingSingleGroupedItem && selectedSet.has(active.id)
      ? current.decorations.filter((item) => selectedSet.has(item.id)).map((item) => item.id)
      : [active.id];

    if (overGroupFromHeader) {
      overIds = orderedIds(current, overGroupFromHeader.itemIds);
    } else if (over.kind === 'item') {
      overIds = [over.id];
    }

    if (movingIds.length === 1) {
      const targetGroup = over.kind === 'item' ? overGroupFromItem : undefined;
      current.groups = groups.map((group) => {
        const withoutActive = group.itemIds.filter((id) => id !== active.id);
        if (targetGroup && group.id === targetGroup.id && !withoutActive.includes(active.id)) {
          return { ...group, itemIds: [...withoutActive, active.id] };
        }
        return { ...group, itemIds: withoutActive };
      });
    }
  }

  if (!movingIds.length || !overIds.length || movingIds.some((id) => overIds.includes(id))) return;
  moveLayerBlock(current, movingIds, overIds);
}

