import { GROUP_ROW_PREFIX, HEAD_LAYER_ID, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup } from '../../types/role';
import type { LayerDropIntent, LayerDropPlacement } from '../../lib/editorLayerDrag';
import { directParentGroup, isGroupDescendant, membersForGroup } from '../../lib/groupTree';
import type { LayerRowModel } from './layerListModels';

export const ITEM_ROW_HEIGHT = 77;
export const GROUP_ROW_HEIGHT = 60;
export const SPACER_ROW_HEIGHT = 98;
export const VIRTUAL_OVERSCAN_ROWS = 8;
export const VIRTUAL_DRAG_OVERSCAN_ROWS = 20;

export type VirtualLayerRow = LayerRowModel | {
  key: string;
  rowId: string;
  type: 'spacer';
  selected: false;
};

export interface VirtualRenderItem {
  row: VirtualLayerRow;
  index: number;
  top: number;
  height: number;
}

export interface DraggableTarget {
  rowId: string;
  index: number;
  center: number;
  top: number;
  bottom: number;
  row: LayerRowModel;
}

export interface VirtualLayout {
  totalHeight: number;
  visibleItems: VirtualRenderItem[];
  offsets: number[];
  heights: number[];
  rowIndexById: Map<string, number>;
  draggableTargets: DraggableTarget[];
}

export interface LayerDragState {
  activeRowId: string;
  overRowId: string;
  mode: 'pointer' | 'keyboard';
  intent: LayerDropIntent;
  placement?: LayerDropPlacement;
  joinGroupId?: string;
  parentGroupId?: string;
  anchorGroupId?: string;
}

export function parseLayerNumberInput(value: string): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  const parts = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (!parts.length) return [];

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) throw new Error(`Invalid range: ${part}`);
      const step = start <= end ? 1 : -1;
      for (let current = start; current !== end + step; current += step) {
        if (!seen.has(current)) {
          seen.add(current);
          result.push(current);
        }
      }
      continue;
    }

    if (!/^\d+$/.test(part)) throw new Error(`Invalid item number: ${part}`);
    const number = Number(part);
    if (!Number.isInteger(number) || number < 1) throw new Error(`Invalid item number: ${part}`);
    if (!seen.has(number)) {
      seen.add(number);
      result.push(number);
    }
  }

  return result;
}

export function layerRowHeight(row: VirtualLayerRow): number {
  if (row.type === 'group') return GROUP_ROW_HEIGHT;
  if (row.type === 'spacer') return SPACER_ROW_HEIGHT;
  return ITEM_ROW_HEIGHT;
}

export function isDraggableRow(row: VirtualLayerRow): row is LayerRowModel {
  return row.type !== 'spacer';
}

export function buildVirtualItems(
  rows: VirtualLayerRow[],
  scrollTop: number,
  viewportHeight: number,
  overscanRows: number
): VirtualLayout {
  const offsets: number[] = [];
  const heights: number[] = [];
  const rowIndexById = new Map<string, number>();
  const draggableTargets: DraggableTarget[] = [];
  let totalHeight = 0;

  rows.forEach((row, index) => {
    const height = layerRowHeight(row);
    const top = totalHeight;
    rowIndexById.set(row.rowId, index);
    offsets.push(totalHeight);
    heights.push(height);
    totalHeight += height;
    if (isDraggableRow(row)) {
      draggableTargets.push({
        rowId: row.rowId,
        index,
        center: top + height / 2,
        top,
        bottom: top + height,
        row
      });
    }
  });

  const viewportBottom = scrollTop + Math.max(viewportHeight, 1);
  let startIndex = 0;
  while (startIndex < rows.length && offsets[startIndex] + heights[startIndex] < scrollTop) {
    startIndex += 1;
  }
  startIndex = Math.max(0, startIndex - overscanRows);

  let endIndex = startIndex;
  while (endIndex < rows.length && offsets[endIndex] <= viewportBottom) {
    endIndex += 1;
  }
  endIndex = Math.min(rows.length, endIndex + overscanRows);

  const visibleItems: VirtualRenderItem[] = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    visibleItems.push({
      row: rows[index],
      index,
      top: offsets[index],
      height: heights[index]
    });
  }

  return { totalHeight, visibleItems, offsets, heights, rowIndexById, draggableTargets };
}

export function closestDraggableRowId(targets: DraggableTarget[], virtualY: number): string | null {
  if (!targets.length) return null;

  let low = 0;
  let high = targets.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (targets[mid].center < virtualY) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const next = low < targets.length ? targets[low] : null;
  const previous = low > 0 ? targets[low - 1] : null;
  if (!previous) return next?.rowId ?? null;
  if (!next) return previous.rowId;
  return Math.abs(next.center - virtualY) < Math.abs(virtualY - previous.center) ? next.rowId : previous.rowId;
}

export function closestDraggableTarget(targets: DraggableTarget[], virtualY: number): DraggableTarget | null {
  const rowId = closestDraggableRowId(targets, virtualY);
  return rowId ? targets.find((target) => target.rowId === rowId) ?? null : null;
}

export function layerIdFromRowId(rowId: string): string | null {
  if (rowId === HEAD_ROW_ID) return HEAD_LAYER_ID;
  if (rowId.startsWith(ITEM_ROW_PREFIX)) return rowId.slice(ITEM_ROW_PREFIX.length);
  if (rowId.startsWith(GROUP_ROW_PREFIX)) return null;
  return rowId || null;
}

export function groupIdFromRowId(rowId: string): string | null {
  return rowId.startsWith(GROUP_ROW_PREFIX) ? rowId.slice(GROUP_ROW_PREFIX.length) : null;
}

export function canJoinTargetGroup(activeRowId: string, target: DraggableTarget, groups: DecorationGroup[]): boolean {
  if (!target.row.group || target.row.group.collapsed) return false;
  if (target.row.type !== 'group' && !target.row.grouped) return false;
  const activeGroupId = groupIdFromRowId(activeRowId);
  if (activeGroupId) {
    return target.row.group.id !== activeGroupId && !isGroupDescendant(groups, activeGroupId, target.row.group.id);
  }
  const activeLayerId = layerIdFromRowId(activeRowId);
  return Boolean(activeLayerId && !membersForGroup(target.row.group).some((member) => member.type === 'layer' && member.id === activeLayerId));
}

export function canJoinGroupId(
  activeRowId: string,
  groupId: string,
  groups: DecorationGroup[],
  allowExistingLayer = false
): boolean {
  const targetGroup = groups.find((group) => group.id === groupId);
  if (!targetGroup || targetGroup.collapsed) return false;
  const activeGroupId = groupIdFromRowId(activeRowId);
  if (activeGroupId) return targetGroup.id !== activeGroupId && !isGroupDescendant(groups, activeGroupId, targetGroup.id);
  const activeLayerId = layerIdFromRowId(activeRowId);
  return Boolean(
    activeLayerId &&
    (
      allowExistingLayer ||
      !membersForGroup(targetGroup).some((member) => member.type === 'layer' && member.id === activeLayerId)
    )
  );
}

export function dropStateForTarget(
  target: DraggableTarget,
  virtualY: number,
  mode: LayerDragState['mode'],
  canJoinGroup: boolean,
  activeRowId: string | undefined,
  groups: DecorationGroup[]
): Pick<LayerDragState, 'overRowId' | 'intent' | 'placement' | 'joinGroupId' | 'parentGroupId' | 'anchorGroupId'> {
  if (mode === 'pointer' && target.row.group) {
    const yInRow = virtualY - target.top;
    const height = Math.max(1, target.bottom - target.top);
    if (target.row.type === 'group' && target.row.grouped && activeRowId) {
      const parent = directParentGroup(groups, { type: 'group', id: target.row.group.id });
      const placement = yInRow < height * 0.25 ? 'before' : yInRow > height * 0.75 ? 'after' : undefined;
      if (parent && placement && canJoinGroupId(activeRowId, parent.id, groups, true)) {
        return {
          overRowId: target.rowId,
          intent: 'join-group',
          placement,
          joinGroupId: parent.id,
          parentGroupId: parent.id,
          anchorGroupId: target.row.group.id
        };
      }
    }
    if (target.row.type === 'group' && canJoinGroup && yInRow >= height * 0.25 && yInRow <= height * 0.75) {
      return {
        overRowId: target.rowId,
        intent: 'join-group',
        joinGroupId: target.row.group.id
      };
    }
    if (target.row.type !== 'group' && target.row.grouped && canJoinGroup) {
      return {
        overRowId: target.rowId,
        intent: 'join-group',
        placement: yInRow < height / 2 ? 'before' : 'after',
        joinGroupId: target.row.group.id
      };
    }
    return {
      overRowId: target.rowId,
      intent: 'sort',
      placement: yInRow < height / 2 ? 'before' : 'after'
    };
  }

  return {
    overRowId: target.rowId,
    intent: 'sort'
  };
}

export function nextDraggableRowId(rows: VirtualLayerRow[], startIndex: number, direction: 1 | -1): string | null {
  for (let index = startIndex + direction; index >= 0 && index < rows.length; index += direction) {
    const row = rows[index];
    if (isDraggableRow(row)) return row.rowId;
  }
  return null;
}

