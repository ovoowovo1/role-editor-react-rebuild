import { deepStrictEqual, strictEqual } from 'node:assert';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { HEAD_LAYER_ID } from '../src/constants/layers';
import { applyGroupMetadataUpdate, type GroupMetadataUpdate } from '../src/lib/editor/editorGroupMutations';
import { sameRole } from '../src/lib/editor/editorHistoryTypes';
import {
  applyRoleHistoryPatch, createHistoryIdPool, makeBaseRoleHistoryEntry
} from '../src/lib/editor/editorRoleHistoryPatch';
import { syncGroups } from '../src/lib/editor/editorRoleUtils';
import { createDefaultRole, partOptions } from '../src/mock/options';
import type { DecorationGroup, DecorationGroupMember, RoleDocument } from '../src/types/role';

const baselineDirectory = process.argv[2];
const layers = Number(process.argv[3] ?? 5_000);
if (!baselineDirectory || !Number.isSafeInteger(layers) || layers < 230) {
  throw new Error('Usage: node --import tsx scripts/benchGroupMetadata.ts <v12 source directory> [layers >= 230]');
}
function baselineImport(name: string) {
  return import(pathToFileURL(resolve(baselineDirectory, 'src/lib/editor/' + name + '.ts')).href);
}
const v12Mutations = await baselineImport('editorGroupMutations') as typeof import('../src/lib/editor/editorGroupMutations');
const v12Role = await baselineImport('editorRoleUtils') as typeof import('../src/lib/editor/editorRoleUtils');
const v12History = await baselineImport('editorRoleHistoryPatch') as typeof import('../src/lib/editor/editorRoleHistoryPatch');
const v12Equality = await baselineImport('editorHistoryTypes') as typeof import('../src/lib/editor/editorHistoryTypes');

const warmups = 16;
const samples = 60;
const option = partOptions.deco.find((part) => part.atlas) ?? partOptions.deco[0];
const decorations = Array.from({ length: layers }, (_, index) => ({
  id: 'fixture-deco-' + index, code: option.code, assetId: option.id, name: 'Fixture ' + index,
  x: index % 79 - 39, y: index % 71 - 35, scaleX: 1, scaleY: 1, opacity: 1,
  rotation: index % 360, visible: true
}));
function makeGroup(id: string, members: DecorationGroupMember[]): DecorationGroup {
  return { id, name: id, members, itemIds: members.flatMap((entry) => entry.type === 'layer' ? [entry.id] : []), collapsed: false, visible: true };
}
const leaves = Array.from({ length: 115 }, (_, index) => makeGroup(
  'leaf-' + index,
  decorations.slice(Math.floor(index * layers / 115), Math.floor((index + 1) * layers / 115))
    .map(({ id }) => ({ type: 'layer', id }))
));
const parents = Array.from({ length: 9 }, (_, index) => makeGroup(
  'parent-' + index,
  leaves.slice(Math.floor(index * leaves.length / 9), Math.floor((index + 1) * leaves.length / 9))
    .map(({ id }) => ({ type: 'group', id }))
));
const root = makeGroup('root', [
  { type: 'layer', id: HEAD_LAYER_ID }, ...parents.map(({ id }) => ({ type: 'group' as const, id }))
]);
const role = syncGroups({
  ...createDefaultRole(), decorations, headLayerIndex: Math.floor(layers / 2),
  groups: [root, ...parents, ...leaves], updatedAt: '2026-01-01T00:00:00.000Z'
});
strictEqual(role.groups.length, 125);

function previousUpdate(input: RoleDocument, update: GroupMetadataUpdate) {
  // v12 useEditorState.updateRole implementation before React's state setter.
  const clone = v12Role.cloneRole(input);
  if (update.type === 'toggle-collapsed') v12Mutations.toggleGroupCollapsedInRole(clone, update.groupId);
  else v12Mutations.renameGroupInRole(clone, update.groupId, update.name);
  return v12Role.syncGroups(v12Role.touch(clone));
}

function withoutTimestamp(value: RoleDocument) {
  const { updatedAt: _timestamp, ...rest } = value;
  return rest;
}

type Entry = ReturnType<typeof makeBaseRoleHistoryEntry>;
function withoutHistoryTimestamp(entry: Entry) {
  if (!entry) return entry;
  const { updatedAt, ...rest } = entry.patch;
  return { ...entry, patch: { ...rest, ...(updatedAt ? { previousTimestamp: updatedAt.before } : {}) } };
}

function check(input: RoleDocument, update: GroupMetadataUpdate) {
  const previous = previousUpdate(input, update);
  const current = applyGroupMetadataUpdate(input, update);
  deepStrictEqual(withoutTimestamp(current), withoutTimestamp(previous));
  strictEqual(current.decorations, input.decorations);
  strictEqual(current.headLayer, input.headLayer);
  const previousEqual = v12Equality.sameRole(previous, input);
  const currentEqual = sameRole(current, input);
  strictEqual(currentEqual, previousEqual);
  const oldEntry = previousEqual ? null : v12History.makeBaseRoleHistoryEntry(input, previous, v12History.createHistoryIdPool());
  const newEntry = currentEqual ? null : makeBaseRoleHistoryEntry(input, current, createHistoryIdPool());
  deepStrictEqual(withoutHistoryTimestamp(newEntry), withoutHistoryTimestamp(oldEntry));
  if (oldEntry && newEntry) {
    const undo = applyRoleHistoryPatch(current, newEntry.patch, 'before');
    const oldUndo = v12History.applyRoleHistoryPatch(previous, oldEntry.patch, 'before');
    deepStrictEqual(withoutTimestamp(undo), withoutTimestamp(oldUndo));
    deepStrictEqual(withoutTimestamp(undo), withoutTimestamp(input));
    const redo = applyRoleHistoryPatch(undo, newEntry.patch, 'after');
    deepStrictEqual(withoutTimestamp(redo), withoutTimestamp(current));
  }
  return Boolean(newEntry);
}

const updates: GroupMetadataUpdate[] = [
  { type: 'toggle-collapsed', groupId: 'parent-7' },
  { type: 'rename', groupId: 'leaf-92', name: ' Renamed fixture  ' },
  { type: 'rename', groupId: 'leaf-92', name: ' leaf-92 ' },
  { type: 'rename', groupId: 'leaf-92', name: '  ' },
  { type: 'toggle-collapsed', groupId: 'missing' }
];
const createsHistory = updates.map((update) => check(role, update));

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => Number(sorted[Math.ceil(p * sorted.length) - 1].toFixed(4));
  return { medianMs: at(0.5), p95Ms: at(0.95) };
}
let checksum = 0;
function timeAction(update: GroupMetadataUpdate, previous: boolean, withHistory: boolean) {
  const pool = (previous ? v12History.createHistoryIdPool : createHistoryIdPool)();
  return () => {
    const start = performance.now();
    const next = previous ? previousUpdate(role, update) : applyGroupMetadataUpdate(role, update);
    const equivalent = withHistory && (previous ? v12Equality.sameRole : sameRole)(next, role);
    const patch = withHistory && !equivalent
      ? (previous ? v12History.makeBaseRoleHistoryEntry : makeBaseRoleHistoryEntry)(role, next, pool) : null;
    const elapsed = performance.now() - start;
    checksum += next.groups.length + (patch?.patch.groups.fields.length ?? 0);
    return elapsed;
  };
}
function compare(update: GroupMetadataUpdate, withHistory: boolean) {
  const old = timeAction(update, true, withHistory);
  const current = timeAction(update, false, withHistory);
  for (let i = 0; i < warmups; i += 1) { old(); current(); }
  const oldTimes: number[] = [];
  const newTimes: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    if (i % 2 === 0) { oldTimes.push(old()); newTimes.push(current()); }
    else { newTimes.push(current()); oldTimes.push(old()); }
  }
  return { v12: stats(oldTimes), current: stats(newTimes) };
}

const results = updates.slice(0, 3).map((update, index) => ({
  update, createsHistory: createsHistory[index],
  normalizationOnly: compare(update, false),
  withEqualityAndBasePatch: compare(update, true)
}));
console.log(JSON.stringify({
  node: process.version, layers, groups: role.groups.length, nestingLevels: 3,
  equivalentRolesAndHistory: updates.length, warmups, samples, results, checksum
}, null, 2));
