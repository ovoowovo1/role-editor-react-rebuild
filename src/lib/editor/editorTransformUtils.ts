import type { DecorationGroup, DecorationLayer, RoleDocument, TransformValues } from '../../types/role';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { getHeadLayerIndex } from './layerOrdering';
import { createGroupTreeIndex, membersForGroup, type GroupTreeIndex } from './groupTree';
import {
  LOCAL_HISTORY_LIMIT,
  type DecorationTransformTarget,
  type LocalHistoryEntry
} from './editorHistoryTypes';

export type { DecorationTransformTarget, LocalHistoryEntry } from './editorHistoryTypes';
export { LOCAL_HISTORY_LIMIT } from './editorHistoryTypes';
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
  if (entry.kind === 'patch') {
    // Patches own immutable scalar/typed-array data. Selection arrays are
    // treated as immutable by the selection hook and can be shared between
    // entries; the old full RoleDocument is intentionally not copied.
    return {
      kind: 'patch',
      patch: entry.patch,
      selectionIds: entry.selectionIds,
      inverseSelectionIds: entry.inverseSelectionIds
    };
  }
  if (entry.kind === 'transform') {
    return {
      kind: 'transform',
      target: entry.target.map((item) => ({ ...item })),
      selectionIds: entry.selectionIds
    };
  }
  return {
    kind: 'translate',
    ids: [...entry.ids],
    dx: entry.dx,
    dy: entry.dy,
    selectionIds: entry.selectionIds
  };
}

export function pushLocalHistoryEntry(items: LocalHistoryEntry[], entry: LocalHistoryEntry): LocalHistoryEntry[] {
  return [...items, cloneHistoryEntry(entry)].slice(-LOCAL_HISTORY_LIMIT);
}

export function pushLocalFutureEntry(items: LocalHistoryEntry[], entry: LocalHistoryEntry): LocalHistoryEntry[] {
  return [cloneHistoryEntry(entry), ...items].slice(0, LOCAL_HISTORY_LIMIT);
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
  const selected = new Set(selectedIds);
  selected.delete(HEAD_LAYER_ID);
  if (!selected.size) return null;

  const oldHeadIndex = getHeadLayerIndex(role);
  let removedAboveHead = 0;
  const decorations = role.decorations.filter((deco, index) => {
    const remove = selected.has(deco.id);
    if (remove && index < oldHeadIndex) removedAboveHead++;
    return !remove;
  });
  if (decorations.length === role.decorations.length) return null;

  const previousGroups = role.groups ?? [];
  const groups: DecorationGroup[] = [];
  if (previousGroups.length) {
    const validIds = new Set(decorations.map((deco) => deco.id));
    validIds.add(HEAD_LAYER_ID);
    let tree: GroupTreeIndex | undefined;
    for (const group of previousGroups) {
      const members: NonNullable<DecorationGroup['members']> = [];
      const itemIds: string[] = [];
      for (const member of membersForGroup(group)) {
        if (member.type === 'layer') {
          if (!validIds.has(member.id) || selected.has(member.id)) continue;
          itemIds.push(member.id);
        } else {
          // The previous command expanded nested members from the original
          // group graph. Share that graph's lookup across the whole edit.
          tree ??= createGroupTreeIndex(previousGroups);
          for (const id of tree.descendantLayerIds(member.id)) itemIds.push(id);
        }
        members.push(member);
      }
      if (itemIds.length >= 2) groups.push({ ...group, members, itemIds });
    }
  }

  return {
    ...role,
    decorations,
    groups,
    headLayerIndex: Math.max(0, Math.min(decorations.length, oldHeadIndex - removedAboveHead)),
    updatedAt: new Date().toISOString()
  };
}

export function validSelectionIds(role: RoleDocument, ids: string[]): string[] {
  if (!ids.length) return [];

  // Most operations validate a small selection on a large role. Track only
  // requested IDs, and stop scanning as soon as every one has been found.
  if (ids.length < role.decorations.length / 4) {
    const missing = new Set(ids);
    missing.delete(HEAD_LAYER_ID);
    if (missing.size) {
      for (const decoration of role.decorations) {
        if (missing.delete(decoration.id) && missing.size === 0) break;
      }
    }
    const seen = new Set<string>();
    return ids.filter((id) => !missing.has(id) && !seen.has(id) && seen.add(id));
  }

  const valid = new Set<string>([HEAD_LAYER_ID]);
  for (const decoration of role.decorations) valid.add(decoration.id);
  return ids.filter((id) => valid.delete(id));
}
