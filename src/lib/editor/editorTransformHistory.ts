import type {
  DecorationGroup,
  DecorationLayer,
  HeadLayerTransform,
  RoleDocument,
  RoleParts,
  RolePartFrames,
  RolePartScales,
  TransformValues
} from '../../types/role';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { EDITOR_LOCAL_HISTORY_LIMIT } from '../../constants/editor';
import { getHeadLayerIndex } from './layerOrdering';
import { cloneGroup, membersForGroup, withGroupMembers } from './groupTree';

export const LOCAL_HISTORY_LIMIT = EDITOR_LOCAL_HISTORY_LIMIT;

export function sameRole(a: RoleDocument, b: RoleDocument): boolean {
  if (a === b) return true;
  if (a.decorations.length !== b.decorations.length) return false;
  if ((a.groups ?? []).length !== (b.groups ?? []).length) return false;
  return JSON.stringify({ ...a, updatedAt: undefined }) === JSON.stringify({ ...b, updatedAt: undefined });
}

export interface HistoryValueChange<T> {
  before: T;
  after: T;
}

export interface HistoryIdPool {
  ids: string[];
  indexById: Map<string, number>;
}

export interface DecorationLayerFieldPatch {
  index: number;
  before: Partial<Omit<DecorationLayer, 'id' | 'visible'>>;
  after: Partial<Omit<DecorationLayer, 'id' | 'visible'>>;
}

export interface DecorationPresencePatch {
  index: number;
  before: DecorationLayer | null;
  after: DecorationLayer | null;
}

export interface CompactVisibilityPatch {
  indices: Uint32Array;
  before: Uint8Array;
  after: Uint8Array;
}

export interface GroupFieldPatch {
  index: number;
  before: Partial<Omit<DecorationGroup, 'id'>>;
  after: Partial<Omit<DecorationGroup, 'id'>>;
}

export interface GroupPresencePatch {
  index: number;
  before: DecorationGroup | null;
  after: DecorationGroup | null;
}

export interface RoleHistoryPatch {
  idPool: HistoryIdPool;
  schemaVersion?: HistoryValueChange<number>;
  name?: HistoryValueChange<string>;
  camp?: HistoryValueChange<string>;
  gender?: HistoryValueChange<RoleDocument['gender']>;
  positionRange?: HistoryValueChange<RoleDocument['positionRange']>;
  parts?: HistoryValueChange<RoleParts>;
  partFrames?: HistoryValueChange<RolePartFrames>;
  partScales?: HistoryValueChange<RolePartScales>;
  headLayerIndex?: HistoryValueChange<number>;
  updatedAt?: HistoryValueChange<string>;
  headLayer: Partial<{
    [K in keyof HeadLayerTransform]: HistoryValueChange<HeadLayerTransform[K]>;
  }>;
  decorations: {
    fields: DecorationLayerFieldPatch[];
    presence: DecorationPresencePatch[];
    visibility: CompactVisibilityPatch | null;
    order: { before: Uint32Array; after: Uint32Array } | null;
  };
  groups: {
    fields: GroupFieldPatch[];
    presence: GroupPresencePatch[];
    order: { before: Uint32Array; after: Uint32Array } | null;
  };
}

export interface RoleHistoryBaseEntry {
  kind: 'patch';
  patch: RoleHistoryPatch;
}

export type LocalHistoryEntry =
  | { kind: 'patch'; patch: RoleHistoryPatch; selectionIds: string[]; inverseSelectionIds: string[] }
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

const DECORATION_FIELD_KEYS = [
  'code',
  'assetId',
  'name',
  'x',
  'y',
  'scaleX',
  'scaleY',
  'rotation',
  'opacity'
] as const satisfies readonly (keyof Omit<DecorationLayer, 'id' | 'visible'>)[];

const GROUP_FIELD_KEYS = ['name', 'itemIds', 'members', 'visible', 'collapsed'] as const;

export function createHistoryIdPool(): HistoryIdPool {
  return { ids: [], indexById: new Map() };
}

function internHistoryId(pool: HistoryIdPool, id: string): number {
  const existing = pool.indexById.get(id);
  if (existing !== undefined) return existing;
  const index = pool.ids.length;
  pool.ids.push(id);
  pool.indexById.set(id, index);
  return index;
}

function cloneLayer(layer: DecorationLayer): DecorationLayer {
  return { ...layer };
}

function cloneGroupValue(group: DecorationGroup): DecorationGroup {
  return cloneGroup(group);
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function typedArraysEqual(a: Uint32Array, b: Uint32Array): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function membersEqual(a: DecorationGroup['members'], b: DecorationGroup['members']): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((member, index) => member.type === b[index].type && member.id === b[index].id);
}

function groupFieldEqual(group: DecorationGroup, other: DecorationGroup, key: (typeof GROUP_FIELD_KEYS)[number]): boolean {
  if (key === 'itemIds') return arraysEqual(group.itemIds, other.itemIds);
  if (key === 'members') return membersEqual(group.members, other.members);
  return group[key] === other[key];
}

function copyGroupField(group: DecorationGroup, key: (typeof GROUP_FIELD_KEYS)[number]): unknown {
  if (key === 'itemIds') return [...group.itemIds];
  if (key === 'members') return group.members?.map((member) => ({ ...member }));
  return group[key];
}

function copyDecorationFields(
  layer: DecorationLayer,
  keys: readonly (typeof DECORATION_FIELD_KEYS)[number][]
): Partial<Omit<DecorationLayer, 'id' | 'visible'>> {
  const result: Partial<Omit<DecorationLayer, 'id' | 'visible'>> = {};
  for (const key of keys) {
    (result as Record<string, unknown>)[key] = layer[key];
  }
  return result;
}

function copyGroupFields(
  group: DecorationGroup,
  keys: readonly (typeof GROUP_FIELD_KEYS)[number][]
): Partial<Omit<DecorationGroup, 'id'>> {
  const result: Partial<Omit<DecorationGroup, 'id'>> = {};
  for (const key of keys) {
    (result as Record<string, unknown>)[key] = copyGroupField(group, key);
  }
  return result;
}

function rolePartsEqual(a: RoleParts, b: RoleParts): boolean {
  return a.head === b.head && a.hand === b.hand && a.foot === b.foot && a.cape === b.cape;
}

function rolePartFramesEqual(a: RolePartFrames, b: RolePartFrames): boolean {
  return a.head === b.head && a.hand === b.hand && a.foot === b.foot && a.cape === b.cape;
}

function rolePartScalesEqual(a: RolePartScales, b: RolePartScales): boolean {
  return a.head === b.head && a.hand === b.hand && a.foot === b.foot && a.cape === b.cape;
}

function hasHeadLayerChanges(headLayer: RoleHistoryPatch['headLayer']): boolean {
  return Object.keys(headLayer).length > 0;
}

function hasSubstantivePatchChanges(patch: RoleHistoryPatch): boolean {
  return Boolean(
    patch.schemaVersion ||
      patch.name ||
      patch.camp ||
      patch.gender ||
      patch.positionRange ||
      patch.parts ||
      patch.partFrames ||
      patch.partScales ||
      patch.headLayerIndex ||
      hasHeadLayerChanges(patch.headLayer) ||
      patch.decorations.fields.length ||
      patch.decorations.presence.length ||
      patch.decorations.visibility ||
      patch.decorations.order ||
      patch.groups.fields.length ||
      patch.groups.presence.length ||
      patch.groups.order
  );
}

export function createRoleHistoryPatch(
  before: RoleDocument,
  after: RoleDocument,
  idPool: HistoryIdPool = createHistoryIdPool()
): RoleHistoryPatch | null {
  const patch: RoleHistoryPatch = {
    idPool,
    headLayer: {},
    decorations: { fields: [], presence: [], visibility: null, order: null },
    groups: { fields: [], presence: [], order: null }
  };

  if (before.schemaVersion !== after.schemaVersion) patch.schemaVersion = { before: before.schemaVersion, after: after.schemaVersion };
  if (before.name !== after.name) patch.name = { before: before.name, after: after.name };
  if (before.camp !== after.camp) patch.camp = { before: before.camp, after: after.camp };
  if (before.gender !== after.gender) patch.gender = { before: before.gender, after: after.gender };
  if (before.positionRange !== after.positionRange) patch.positionRange = { before: before.positionRange, after: after.positionRange };
  if (!rolePartsEqual(before.parts, after.parts)) patch.parts = { before: { ...before.parts }, after: { ...after.parts } };
  if (!rolePartFramesEqual(before.partFrames, after.partFrames)) {
    patch.partFrames = { before: { ...before.partFrames }, after: { ...after.partFrames } };
  }
  if (!rolePartScalesEqual(before.partScales, after.partScales)) {
    patch.partScales = { before: { ...before.partScales }, after: { ...after.partScales } };
  }
  if (before.headLayerIndex !== after.headLayerIndex) {
    patch.headLayerIndex = { before: before.headLayerIndex, after: after.headLayerIndex };
  }

  const headLayerKeys: (keyof HeadLayerTransform)[] = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'visible', 'opacity'];
  for (const key of headLayerKeys) {
    if (before.headLayer[key] !== after.headLayer[key]) {
      patch.headLayer[key] = { before: before.headLayer[key], after: after.headLayer[key] } as never;
    }
  }

  const beforeDecorations = new Map(before.decorations.map((layer) => [layer.id, layer]));
  const afterDecorations = new Map(after.decorations.map((layer) => [layer.id, layer]));
  const allDecorationIds = new Set([...beforeDecorations.keys(), ...afterDecorations.keys()]);
  const visibilityIndices: number[] = [];
  const visibilityBefore: number[] = [];
  const visibilityAfter: number[] = [];

  for (const id of allDecorationIds) {
    const beforeLayer = beforeDecorations.get(id);
    const afterLayer = afterDecorations.get(id);
    const index = internHistoryId(idPool, id);
    if (!beforeLayer || !afterLayer) {
      patch.decorations.presence.push({
        index,
        before: beforeLayer ? cloneLayer(beforeLayer) : null,
        after: afterLayer ? cloneLayer(afterLayer) : null
      });
      continue;
    }

    if (beforeLayer.visible !== afterLayer.visible) {
      visibilityIndices.push(index);
      visibilityBefore.push(beforeLayer.visible ? 1 : 0);
      visibilityAfter.push(afterLayer.visible ? 1 : 0);
    }

    const changedKeys = DECORATION_FIELD_KEYS.filter((key) => beforeLayer[key] !== afterLayer[key]);
    if (changedKeys.length) {
      patch.decorations.fields.push({
        index,
        before: copyDecorationFields(beforeLayer, changedKeys),
        after: copyDecorationFields(afterLayer, changedKeys)
      });
    }
  }

  if (visibilityIndices.length) {
    patch.decorations.visibility = {
      indices: Uint32Array.from(visibilityIndices),
      before: Uint8Array.from(visibilityBefore),
      after: Uint8Array.from(visibilityAfter)
    };
  }

  const beforeDecorationOrder = Uint32Array.from(before.decorations.map((layer) => internHistoryId(idPool, layer.id)));
  const afterDecorationOrder = Uint32Array.from(after.decorations.map((layer) => internHistoryId(idPool, layer.id)));
  if (!typedArraysEqual(beforeDecorationOrder, afterDecorationOrder)) {
    patch.decorations.order = { before: beforeDecorationOrder, after: afterDecorationOrder };
  }

  const beforeGroups = new Map((before.groups ?? []).map((group) => [group.id, group]));
  const afterGroups = new Map((after.groups ?? []).map((group) => [group.id, group]));
  const allGroupIds = new Set([...beforeGroups.keys(), ...afterGroups.keys()]);
  for (const id of allGroupIds) {
    const beforeGroup = beforeGroups.get(id);
    const afterGroup = afterGroups.get(id);
    const index = internHistoryId(idPool, id);
    if (!beforeGroup || !afterGroup) {
      patch.groups.presence.push({
        index,
        before: beforeGroup ? cloneGroupValue(beforeGroup) : null,
        after: afterGroup ? cloneGroupValue(afterGroup) : null
      });
      continue;
    }
    const changedKeys = GROUP_FIELD_KEYS.filter((key) => !groupFieldEqual(beforeGroup, afterGroup, key));
    if (changedKeys.length) {
      patch.groups.fields.push({
        index,
        before: copyGroupFields(beforeGroup, changedKeys),
        after: copyGroupFields(afterGroup, changedKeys)
      });
    }
  }

  const beforeGroupOrder = Uint32Array.from((before.groups ?? []).map((group) => internHistoryId(idPool, group.id)));
  const afterGroupOrder = Uint32Array.from((after.groups ?? []).map((group) => internHistoryId(idPool, group.id)));
  if (!typedArraysEqual(beforeGroupOrder, afterGroupOrder)) {
    patch.groups.order = { before: beforeGroupOrder, after: afterGroupOrder };
  }

  if (!hasSubstantivePatchChanges(patch)) return null;
  if (before.updatedAt !== after.updatedAt) patch.updatedAt = { before: before.updatedAt, after: after.updatedAt };
  return patch;
}

export function makeRoleHistoryEntry(
  before: RoleDocument,
  after: RoleDocument,
  selectionIds: string[] = [],
  inverseSelectionIds: string[] = selectionIds,
  idPool?: HistoryIdPool
): LocalHistoryEntry | null {
  const patch = createRoleHistoryPatch(before, after, idPool);
  if (!patch) return null;
  return { kind: 'patch', patch, selectionIds, inverseSelectionIds };
}

export function makeBaseRoleHistoryEntry(
  before: RoleDocument,
  after: RoleDocument,
  idPool: HistoryIdPool
): RoleHistoryBaseEntry | null {
  const patch = createRoleHistoryPatch(before, after, idPool);
  if (!patch) return null;
  return { kind: 'patch', patch };
}

type HistoryDirection = 'before' | 'after';

function historyValue<T>(change: HistoryValueChange<T>, direction: HistoryDirection): T {
  return direction === 'before' ? change.before : change.after;
}

function applyDecorationFields(
  layer: DecorationLayer,
  fields: Partial<Omit<DecorationLayer, 'id' | 'visible'>>
): DecorationLayer {
  return { ...layer, ...fields };
}

function applyGroupFields(
  group: DecorationGroup,
  fields: Partial<Omit<DecorationGroup, 'id'>>
): DecorationGroup {
  const next = { ...group } as DecorationGroup & { members?: DecorationGroup['members'] };
  for (const key of GROUP_FIELD_KEYS) {
    if (!(key in fields)) continue;
    const value = fields[key];
    if (key === 'itemIds') next.itemIds = [...(value as string[])];
    else if (key === 'members') {
      if (value === undefined) delete next.members;
      else next.members = (value as NonNullable<DecorationGroup['members']>).map((member) => ({ ...member }));
    } else if (key === 'name' || key === 'visible' || key === 'collapsed') {
      next[key] = value as never;
    }
  }
  return next;
}

function orderedByHistoryIds<T extends { id: string }>(
  values: Map<number, T>,
  order: Uint32Array | null,
  idPool: HistoryIdPool
): T[] {
  if (!order) return Array.from(values.values());
  const ordered: T[] = [];
  const used = new Set<number>();
  for (const index of order) {
    const value = values.get(index);
    if (!value) continue;
    ordered.push(value);
    used.add(index);
  }
  values.forEach((value, index) => {
    if (!used.has(index) && idPool.ids[index] === value.id) ordered.push(value);
  });
  return ordered;
}

export function applyRoleHistoryPatch(
  role: RoleDocument,
  patch: RoleHistoryPatch,
  direction: HistoryDirection
): RoleDocument {
  const next: RoleDocument = { ...role };
  if (patch.schemaVersion) next.schemaVersion = historyValue(patch.schemaVersion, direction) as RoleDocument['schemaVersion'];
  if (patch.name) next.name = historyValue(patch.name, direction);
  if (patch.camp) next.camp = historyValue(patch.camp, direction);
  if (patch.gender) next.gender = historyValue(patch.gender, direction);
  if (patch.positionRange) {
    const positionRange = historyValue(patch.positionRange, direction);
    if (positionRange === undefined) delete next.positionRange;
    else next.positionRange = positionRange;
  }
  if (patch.parts) next.parts = { ...historyValue(patch.parts, direction) };
  if (patch.partFrames) next.partFrames = { ...historyValue(patch.partFrames, direction) };
  if (patch.partScales) next.partScales = { ...historyValue(patch.partScales, direction) };
  if (patch.headLayerIndex) next.headLayerIndex = historyValue(patch.headLayerIndex, direction);

  if (hasHeadLayerChanges(patch.headLayer)) {
    const headLayer = { ...role.headLayer };
    for (const key of Object.keys(patch.headLayer) as (keyof HeadLayerTransform)[]) {
      const change = patch.headLayer[key];
      if (change) (headLayer as Record<string, unknown>)[key] = historyValue(change as HistoryValueChange<unknown>, direction);
    }
    next.headLayer = headLayer;
  }

  const decorationValues = new Map<number, DecorationLayer>();
  for (const layer of role.decorations) {
    const index = patch.idPool.indexById.get(layer.id);
    if (index !== undefined) decorationValues.set(index, layer);
  }
  for (const presence of patch.decorations.presence) {
    const value = historyValue(presence, direction);
    if (value) decorationValues.set(presence.index, cloneLayer(value));
    else decorationValues.delete(presence.index);
  }
  for (const change of patch.decorations.fields) {
    const layer = decorationValues.get(change.index);
    if (layer) decorationValues.set(change.index, applyDecorationFields(layer, historyValue(change, direction)));
  }
  if (patch.decorations.visibility) {
    const visibility = patch.decorations.visibility;
    const values = direction === 'before' ? visibility.before : visibility.after;
    visibility.indices.forEach((index, position) => {
      const layer = decorationValues.get(index);
      if (layer) decorationValues.set(index, { ...layer, visible: values[position] === 1 });
    });
  }
  next.decorations = orderedByHistoryIds(decorationValues, patch.decorations.order?.[direction] ?? null, patch.idPool);

  const groupValues = new Map<number, DecorationGroup>();
  for (const group of role.groups ?? []) {
    const index = patch.idPool.indexById.get(group.id);
    if (index !== undefined) groupValues.set(index, group);
  }
  for (const presence of patch.groups.presence) {
    const value = historyValue(presence, direction);
    if (value) groupValues.set(presence.index, cloneGroupValue(value));
    else groupValues.delete(presence.index);
  }
  for (const change of patch.groups.fields) {
    const group = groupValues.get(change.index);
    if (group) groupValues.set(change.index, applyGroupFields(group, historyValue(change, direction)));
  }
  next.groups = orderedByHistoryIds(groupValues, patch.groups.order?.[direction] ?? null, patch.idPool);

  if (patch.updatedAt) next.updatedAt = historyValue(patch.updatedAt, direction);
  return next;
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
