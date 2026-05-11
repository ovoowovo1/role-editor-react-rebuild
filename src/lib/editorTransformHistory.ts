import type { DecorationLayer, RoleDocument, TransformValues } from '../types/role';
import { HEAD_LAYER_ID } from '../constants/layers';
import { getHeadLayerIndex } from './layerOrdering';
import { cloneRole } from './editorRoleUtils';
import { membersForGroup, withGroupMembers } from './groupTree';

export const LOCAL_HISTORY_LIMIT = 200;

export type LocalHistoryEntry =
  | { kind: 'snapshot'; role: RoleDocument }
  | { kind: 'translate'; ids: string[]; dx: number; dy: number; selectionIds: string[] }
  | { kind: 'transform'; target: DecorationTransformTarget[]; selectionIds: string[] };

export interface DecorationTransformTarget {
  id: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export function roundPosition(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundValue(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function transformValuesFromSingleDeco(deco: DecorationLayer): TransformValues {
  return {
    rotate: roundValue(deco.rotation, 3),
    scale: roundValue(Math.abs(deco.scaleX), 3),
    ratio: roundValue(Math.abs(deco.scaleY / (deco.scaleX || 1)), 3),
    posX: roundValue(deco.x, 2),
    posY: roundValue(deco.y, 2)
  };
}

export function cloneHistoryEntry(entry: LocalHistoryEntry): LocalHistoryEntry {
  if (entry.kind === 'snapshot') return { kind: 'snapshot', role: cloneRole(entry.role) };
  if (entry.kind === 'transform') {
    return {
      kind: 'transform',
      target: entry.target.map((item) => ({ ...item })),
      selectionIds: [...entry.selectionIds]
    };
  }
  return {
    kind: 'translate',
    ids: [...entry.ids],
    dx: entry.dx,
    dy: entry.dy,
    selectionIds: [...entry.selectionIds]
  };
}

export function pushLocalHistoryEntry(items: LocalHistoryEntry[], entry: LocalHistoryEntry): LocalHistoryEntry[] {
  return [...items, cloneHistoryEntry(entry)].slice(-LOCAL_HISTORY_LIMIT);
}

export function pushLocalFutureEntry(items: LocalHistoryEntry[], entry: LocalHistoryEntry): LocalHistoryEntry[] {
  return [cloneHistoryEntry(entry), ...items].slice(0, LOCAL_HISTORY_LIMIT);
}

export function makeSnapshotEntry(role: RoleDocument): LocalHistoryEntry {
  return { kind: 'snapshot', role };
}

export function applyTranslateDelta(role: RoleDocument, ids: string[], dx: number, dy: number): RoleDocument {
  const movingIds = new Set(ids.filter((id) => id !== HEAD_LAYER_ID));
  if (!movingIds.size || (Math.abs(dx) <= Number.EPSILON && Math.abs(dy) <= Number.EPSILON)) return role;

  let changed = false;
  const decorations = role.decorations.map((item) => {
    if (!movingIds.has(item.id)) return item;
    changed = true;
    return {
      ...item,
      x: roundPosition(item.x + dx),
      y: roundPosition(item.y + dy)
    };
  });

  if (!changed) return role;
  return {
    ...role,
    decorations,
    updatedAt: new Date().toISOString()
  };
}

export function captureDecorationTransforms(role: RoleDocument, selectionIds: string[]): DecorationTransformTarget[] {
  const selected = new Set(selectionIds.filter((id) => id && id !== HEAD_LAYER_ID));
  if (!selected.size) return [];

  const target: DecorationTransformTarget[] = [];
  for (const item of role.decorations) {
    if (!selected.has(item.id)) continue;
    target.push({
      id: item.id,
      x: item.x,
      y: item.y,
      scaleX: item.scaleX,
      scaleY: item.scaleY,
      rotation: item.rotation
    });
  }
  return target;
}

export function applyDecorationTransformTarget(role: RoleDocument, target: DecorationTransformTarget[]): RoleDocument {
  if (!target.length) return role;
  const targetById = new Map(target.map((item) => [item.id, item]));
  let changed = false;
  const decorations = role.decorations.map((item) => {
    const next = targetById.get(item.id);
    if (!next) return item;
    if (
      item.x === next.x &&
      item.y === next.y &&
      item.scaleX === next.scaleX &&
      item.scaleY === next.scaleY &&
      item.rotation === next.rotation
    ) {
      return item;
    }
    changed = true;
    return { ...item, x: next.x, y: next.y, scaleX: next.scaleX, scaleY: next.scaleY, rotation: next.rotation };
  });

  if (!changed) return role;
  return { ...role, decorations, updatedAt: new Date().toISOString() };
}

export function sameTransformTarget(a: DecorationTransformTarget[], b: DecorationTransformTarget[]): boolean {
  if (a.length !== b.length) return false;
  const bById = new Map(b.map((item) => [item.id, item]));
  for (const item of a) {
    const other = bById.get(item.id);
    if (!other) return false;
    if (item.x !== other.x || item.y !== other.y || item.scaleX !== other.scaleX || item.scaleY !== other.scaleY || item.rotation !== other.rotation) {
      return false;
    }
  }
  return true;
}

export function removeSelectedDecos(role: RoleDocument, selectedIds: string[]): RoleDocument | null {
  const selected = new Set(selectedIds.filter((id) => id !== HEAD_LAYER_ID));
  if (!selected.size) return null;

  const oldHeadIndex = getHeadLayerIndex(role);
  const deletedIndexes: number[] = [];
  const decorations = role.decorations.filter((deco, index) => {
    const remove = selected.has(deco.id);
    if (remove) deletedIndexes.push(index);
    return !remove;
  });
  if (decorations.length === role.decorations.length) return null;

  const removedAboveHead = deletedIndexes.filter((index) => index < oldHeadIndex).length;
  const validIds = new Set(decorations.map((deco) => deco.id));
  validIds.add(HEAD_LAYER_ID);
  const groups = (role.groups ?? [])
    .map((group) =>
      withGroupMembers(
        group,
        membersForGroup(group).filter((member) => member.type === 'group' || (validIds.has(member.id) && !selected.has(member.id))),
        role.groups ?? []
      )
    )
    .filter((group) => group.itemIds.length >= 2);

  return {
    ...role,
    decorations,
    groups,
    headLayerIndex: Math.max(0, Math.min(decorations.length, oldHeadIndex - removedAboveHead)),
    updatedAt: new Date().toISOString()
  };
}

export function validSelectionIds(role: RoleDocument, ids: string[]): string[] {
  const valid = new Set(role.decorations.map((deco) => deco.id));
  valid.add(HEAD_LAYER_ID);
  const seen = new Set<string>();
  return ids.filter((id) => valid.has(id) && !seen.has(id) && seen.add(id));
}

export function nextSelection(current: string[], id: string, additive: boolean): string[] {
  if (!additive) return [id];
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}
