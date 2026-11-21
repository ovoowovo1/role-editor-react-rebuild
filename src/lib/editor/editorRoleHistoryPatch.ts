import type {
  DecorationGroup,
  DecorationLayer,
  HeadLayerTransform,
  RoleDocument,
  RoleParts,
  RolePartFrames,
  RolePartScales
} from '../../types/role';
import { cloneGroup } from './groupTree';
import {
  type HistoryIdPool,
  type HistoryValueChange,
  type LocalHistoryEntry,
  type RoleHistoryBaseEntry,
  type RoleHistoryPatch
} from './editorHistoryTypes';

const DECORATION_FIELD_KEYS = [
  'code', 'assetId', 'name', 'x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'
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

const EMPTY_GROUPS: readonly DecorationGroup[] = [];

function sameIdOrder<T extends { id: string }>(before: readonly T[], after: readonly T[]): boolean {
  if (before.length !== after.length) return false;
  for (let index = 0; index < before.length; index += 1) {
    if (before[index] !== after[index] && before[index].id !== after[index].id) return false;
  }
  return true;
}

/** Ordinary edits retain membership and order; only structural edits need ID maps and order arrays. */
function diffHistoryCollection<T extends { id: string }>(
  before: readonly T[],
  after: readonly T[],
  idPool: HistoryIdPool,
  update: (before: T, after: T) => void,
  presence: (before: T | undefined, after: T | undefined, index: number) => void
): HistoryValueChange<Uint32Array> | null {
  if (before === after) return null;
  if (sameIdOrder(before, after)) {
    for (let index = 0; index < before.length; index += 1) {
      if (before[index] !== after[index]) update(before[index], after[index]);
    }
    return null;
  }

  const remaining = new Map(after.map((value) => [value.id, value]));
  for (const previous of before) {
    const next = remaining.get(previous.id);
    if (!next) presence(previous, undefined, internHistoryId(idPool, previous.id));
    else if (next !== previous) update(previous, next);
    remaining.delete(previous.id);
  }
  for (const added of remaining.values()) {
    presence(undefined, added, internHistoryId(idPool, added.id));
  }
  return {
    before: Uint32Array.from(before, (item) => internHistoryId(idPool, item.id)),
    after: Uint32Array.from(after, (item) => internHistoryId(idPool, item.id))
  };
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

  const visibilityIndices: number[] = [];
  const visibilityBefore: number[] = [];
  const visibilityAfter: number[] = [];
  patch.decorations.order = diffHistoryCollection(before.decorations, after.decorations, idPool, (beforeLayer, afterLayer) => {
    if (beforeLayer.visible !== afterLayer.visible) {
      visibilityIndices.push(internHistoryId(idPool, beforeLayer.id));
      visibilityBefore.push(beforeLayer.visible ? 1 : 0);
      visibilityAfter.push(afterLayer.visible ? 1 : 0);
    }

    const changedKeys = DECORATION_FIELD_KEYS.filter((key) => beforeLayer[key] !== afterLayer[key]);
    if (changedKeys.length) {
      patch.decorations.fields.push({
        index: internHistoryId(idPool, beforeLayer.id),
        before: copyDecorationFields(beforeLayer, changedKeys),
        after: copyDecorationFields(afterLayer, changedKeys)
      });
    }
  }, (beforeLayer, afterLayer, index) => {
    patch.decorations.presence.push({
      index,
      before: beforeLayer ? cloneLayer(beforeLayer) : null,
      after: afterLayer ? cloneLayer(afterLayer) : null
    });
  });

  if (visibilityIndices.length) {
    patch.decorations.visibility = {
      indices: Uint32Array.from(visibilityIndices),
      before: Uint8Array.from(visibilityBefore),
      after: Uint8Array.from(visibilityAfter)
    };
  }

  patch.groups.order = diffHistoryCollection(before.groups ?? EMPTY_GROUPS, after.groups ?? EMPTY_GROUPS, idPool, (beforeGroup, afterGroup) => {
    const changedKeys = GROUP_FIELD_KEYS.filter((key) => !groupFieldEqual(beforeGroup, afterGroup, key));
    if (changedKeys.length) {
      patch.groups.fields.push({
        index: internHistoryId(idPool, beforeGroup.id),
        before: copyGroupFields(beforeGroup, changedKeys),
        after: copyGroupFields(afterGroup, changedKeys)
      });
    }
  }, (beforeGroup, afterGroup, index) => {
    patch.groups.presence.push({
      index,
      before: beforeGroup ? cloneGroupValue(beforeGroup) : null,
      after: afterGroup ? cloneGroupValue(afterGroup) : null
    });
  });

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
  values: Map<string, T>,
  order: Uint32Array | null,
  idPool: HistoryIdPool
): T[] {
  if (!order) return Array.from(values.values());
  const ordered: T[] = [];
  for (const index of order) {
    const id = idPool.ids[index];
    const value = values.get(id);
    if (!value) continue;
    ordered.push(value);
    values.delete(id);
  }
  for (const value of values.values()) ordered.push(value);
  return ordered;
}

/** Lazily copy only the changed collection; unrelated item references remain stable. */
function applyFieldOnlyChanges<T extends { id: string }, C>(
  items: T[],
  changes: Map<string, C>,
  update: (item: T, change: C) => T
): T[] {
  if (changes.size === 0) return items;
  if (changes.size === 1) {
    const [id, change] = changes.entries().next().value!;
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return items;
    const next = items.slice();
    next[index] = update(items[index], change);
    return next;
  }
  let next: T[] | undefined;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const change = changes.get(item.id);
    if (change !== undefined) {
      next ??= items.slice();
      next[index] = update(item, change);
    }
  }
  return next ?? items;
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

  const decorations = patch.decorations;
  const visibility = decorations.visibility;
  if (!decorations.order && decorations.presence.length === 0) {
    if (decorations.fields.length || visibility) {
      type DecorationChange = Partial<Omit<DecorationLayer, 'id'>>;
      const changes = new Map<string, DecorationChange>();
      for (const change of decorations.fields) {
        changes.set(patch.idPool.ids[change.index], historyValue(change, direction));
      }
      if (visibility) {
        const values = visibility[direction];
        visibility.indices.forEach((index, position) => {
          const id = patch.idPool.ids[index];
          changes.set(id, { ...changes.get(id), visible: values[position] === 1 });
        });
      }
      next.decorations = applyFieldOnlyChanges(role.decorations, changes, (layer, change) => ({ ...layer, ...change }));
    }
  } else {
    const decorationValues = new Map(role.decorations.map((layer) => [layer.id, layer]));
    for (const presence of decorations.presence) {
      const id = patch.idPool.ids[presence.index];
      const value = historyValue(presence, direction);
      if (value) decorationValues.set(id, cloneLayer(value));
      else decorationValues.delete(id);
    }
    for (const change of decorations.fields) {
      const id = patch.idPool.ids[change.index];
      const layer = decorationValues.get(id);
      if (layer) decorationValues.set(id, applyDecorationFields(layer, historyValue(change, direction)));
    }
    if (visibility) {
      const values = visibility[direction];
      visibility.indices.forEach((index, position) => {
        const id = patch.idPool.ids[index];
        const layer = decorationValues.get(id);
        if (layer) decorationValues.set(id, { ...layer, visible: values[position] === 1 });
      });
    }
    next.decorations = orderedByHistoryIds(decorationValues, decorations.order?.[direction] ?? null, patch.idPool);
  }

  const groups = patch.groups;
  if (!groups.order && groups.presence.length === 0) {
    if (groups.fields.length) {
      const changes = new Map(groups.fields.map((change) => [
        patch.idPool.ids[change.index], historyValue(change, direction)
      ]));
      next.groups = applyFieldOnlyChanges(role.groups ?? [], changes, applyGroupFields);
    }
  } else {
    const groupValues = new Map((role.groups ?? []).map((group) => [group.id, group]));
    for (const presence of groups.presence) {
      const id = patch.idPool.ids[presence.index];
      const value = historyValue(presence, direction);
      if (value) groupValues.set(id, cloneGroupValue(value));
      else groupValues.delete(id);
    }
    for (const change of groups.fields) {
      const id = patch.idPool.ids[change.index];
      const group = groupValues.get(id);
      if (group) groupValues.set(id, applyGroupFields(group, historyValue(change, direction)));
    }
    next.groups = orderedByHistoryIds(groupValues, groups.order?.[direction] ?? null, patch.idPool);
  }

  if (patch.updatedAt) next.updatedAt = historyValue(patch.updatedAt, direction);
  return next;
}
