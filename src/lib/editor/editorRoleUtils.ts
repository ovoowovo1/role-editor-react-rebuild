import type { DecorationLayer, RoleDocument } from '../../types/role';
import {
  DEFAULT_POSITION_RANGE,
  HEAD_DECO_MAX_SCALE,
  HEAD_DECO_MIN_SCALE,
  MAX_POSITION_RANGE,
  ORIGINAL_DECO_MAX_RATIO,
  ORIGINAL_DECO_MAX_SCALE,
  ORIGINAL_DECO_MIN_RATIO,
  ORIGINAL_DECO_MIN_SCALE
} from '../../constants/editor';
import { clamp } from '../math';
import { getHeadLayerIndex } from './layerOrdering';
import { cloneGroup, normalizeGroupsForRole } from './groupTree';

export function cloneRole(role: RoleDocument): RoleDocument {
  return {
    ...role,
    decorations: role.decorations.map((item) => ({ ...item })),
    groups: (role.groups ?? []).map(cloneGroup),
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
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_POSITION_RANGE) : DEFAULT_POSITION_RANGE;
}

export function clampDecoRatio(value: number): number {
  return clamp(Math.abs(value), ORIGINAL_DECO_MIN_RATIO, ORIGINAL_DECO_MAX_RATIO);
}

function isHeadDecoLayer(item: DecorationLayer): boolean {
  return item.code === 'head';
}

export function decorationScaleBounds(item: DecorationLayer): { min: number; max: number } {
  if (isHeadDecoLayer(item)) return { min: HEAD_DECO_MIN_SCALE, max: HEAD_DECO_MAX_SCALE };
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
  const groups = normalizeGroupsForRole(role);
  return { ...role, headLayerIndex: getHeadLayerIndex(role), groups };
}

