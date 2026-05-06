import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import { HEAD_LAYER_ID } from '../constants/layers';
import { clamp } from './math';
import { getHeadLayerIndex } from './layerOrdering';

export const ORIGINAL_DECO_MIN_SCALE = 0.001;
export const ORIGINAL_DECO_MAX_SCALE = 1;
export const ORIGINAL_DECO_MIN_RATIO = 0.001;
export const ORIGINAL_DECO_MAX_RATIO = 2;

export function cloneRole(role: RoleDocument): RoleDocument {
  return {
    ...role,
    decorations: role.decorations.map((item) => ({ ...item })),
    groups: (role.groups ?? []).map((group) => ({
      ...group,
      itemIds: [...group.itemIds]
    })),
    partFrames: { ...role.partFrames },
    partScales: { ...role.partScales },
    headLayer: { ...role.headLayer }
  };
}

export function touch(role: RoleDocument): RoleDocument {
  return { ...role, updatedAt: new Date().toISOString() };
}

export function orderedSelectedDecorations(role: RoleDocument, selectedIds: string[]): DecorationLayer[] {
  const selected = new Set(selectedIds);
  return role.decorations.filter((deco) => selected.has(deco.id));
}

export function getFirstSelected(role: RoleDocument, selectedIds: string[]): DecorationLayer | undefined {
  const selected = new Set(selectedIds);
  return role.decorations.find((deco) => selected.has(deco.id));
}

export function positionRangeFromRole(role: RoleDocument): number {
  const raw = role.positionRange;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 60;
}

export function clampDecoRatio(value: number): number {
  return clamp(Math.abs(value), ORIGINAL_DECO_MIN_RATIO, ORIGINAL_DECO_MAX_RATIO);
}

function isHeadDecoLayer(item: DecorationLayer): boolean {
  return item.code === 'head';
}

export function decorationScaleBounds(item: DecorationLayer): { min: number; max: number } {
  if (isHeadDecoLayer(item)) return { min: 1, max: 2 };
  return { min: ORIGINAL_DECO_MIN_SCALE, max: ORIGINAL_DECO_MAX_SCALE };
}

export function clampDecoScaleForLayer(value: number, item: DecorationLayer): number {
  const { min, max } = decorationScaleBounds(item);
  return clamp(Math.abs(value), min, max);
}

export function shiftHeadLayerForInsert(role: RoleDocument, insertIndex: number, count: number): void {
  const headIndex = getHeadLayerIndex(role);
  role.headLayerIndex = insertIndex <= headIndex ? headIndex + count : headIndex;
}

export function shiftHeadLayerForDeletedIndexes(role: RoleDocument, oldHeadIndex: number, deletedIndexes: number[]): void {
  const removedAboveHead = deletedIndexes.filter((index) => index >= 0 && index < oldHeadIndex).length;
  role.headLayerIndex = clamp(oldHeadIndex - removedAboveHead, 0, role.decorations.length);
}

export function syncGroups(role: RoleDocument): RoleDocument {
  const existingIds = new Set(role.decorations.map((item) => item.id));
  existingIds.add(HEAD_LAYER_ID);
  const claimedIds = new Set<string>();
  const groups = (role.groups ?? [])
    .map((group) => {
      const itemIds = group.itemIds.filter((id) => existingIds.has(id) && !claimedIds.has(id));
      itemIds.forEach((id) => claimedIds.add(id));
      return { ...group, itemIds } satisfies DecorationGroup;
    })
    .filter((group) => group.itemIds.length >= 2);
  return { ...role, headLayerIndex: getHeadLayerIndex(role), groups };
}

