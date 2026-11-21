import { deepStrictEqual, strictEqual } from 'node:assert';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { HEAD_ATOM, HEAD_LAYER_ID } from '../src/constants/layers';
import {
  DEFAULT_INSERT_SETTINGS, getInsertVirtualIndex, insertDecorations, type InsertDraftSettings
} from '../src/lib/editor/editorInsertSettings';
import { createDefaultRole, partOptions } from '../src/mock/options';
import type { DecorationLayer, RoleDocument } from '../src/types/role';

const baselineDirectory = process.argv[2];
const layerCount = Number(process.argv[3] ?? 5_000);
if (!baselineDirectory || !Number.isSafeInteger(layerCount) || layerCount < 10) {
  throw new Error('Usage: node --import tsx scripts/benchDecorationInsertion.ts <v10 source directory> [layers >= 10]');
}
const baseline = await import(pathToFileURL(resolve(
  baselineDirectory, 'src/lib/editor/editorInsertSettings.ts'
)).href) as Pick<typeof import('../src/lib/editor/editorInsertSettings'), 'getInsertVirtualIndex' | 'insertDecorations'>;
const warmups = 30;
const samples = 120;
const atlasOptions = partOptions.deco.filter((option) => option.atlas).slice(0, 12);
if (!atlasOptions.length) throw new Error('Expected generated decoration atlas options.');

function decoration(id: string, index: number): DecorationLayer {
  const option = atlasOptions[index % atlasOptions.length];
  return {
    id, code: option.code, assetId: option.id, name: 'Fixture ' + index,
    x: index % 81 - 40, y: index % 67 - 33, scaleX: index % 5 === 0 ? -1 : 1,
    scaleY: 1, rotation: index % 360, visible: true, opacity: 1
  };
}

const existing = Array.from({ length: layerCount }, (_, index) => decoration('existing-' + index, index));
const head = Math.floor(existing.length / 2);
const groupIds = [existing[0].id, existing[1].id];
const role: RoleDocument = {
  ...createDefaultRole('royal', 'female'),
  decorations: existing,
  headLayerIndex: head,
  groups: [{
    id: 'fixture-group', name: 'Fixture group', itemIds: groupIds,
    members: groupIds.map((id) => ({ type: 'layer', id })),
    visible: true, collapsed: true
  }],
  updatedAt: '2026-01-01T00:00:00.000Z'
};

function settings(placement: InsertDraftSettings['placement'], index = ''): InsertDraftSettings {
  return { ...DEFAULT_INSERT_SETTINGS, placement, index };
}
const placements = [
  { name: 'top', settings: settings('top') },
  { name: 'before-head', settings: settings('after_index', String(head)) },
  { name: 'after-head', settings: settings('after_index', String(head + 1)) },
  { name: 'bottom', settings: settings('bottom') }
];

function withoutTimestamp(value: RoleDocument) {
  const { updatedAt: _timestamp, ...rest } = value;
  return rest;
}

function check(input: RoleDocument, incoming: DecorationLayer[], prefs: InsertDraftSettings) {
  strictEqual(getInsertVirtualIndex(input, prefs), baseline.getInsertVirtualIndex(input, prefs));
  const old = baseline.insertDecorations(input, incoming, prefs);
  const current = insertDecorations(input, incoming, prefs);
  deepStrictEqual(withoutTimestamp(current), withoutTimestamp(old));
  strictEqual(current.groups, input.groups);
  strictEqual(current.headLayer, input.headLayer);
  // Identity checks apply to alias/last-wins fallback as well as direct copy.
  current.decorations.forEach((item, index) => strictEqual(item, old.decorations[index]));
  if (incoming.length === 0) strictEqual(current, input);
  return current;
}

let edgeCases = 0;
const ordinary = [decoration('new-first', 7), decoration('new-second', 11)];
const duplicate = decoration(existing[23 % existing.length].id, 5);
const duplicateIncoming = [decoration('new-duplicate', 4), decoration('new-duplicate', 9)];
const explicitHead = [decoration(HEAD_ATOM, 2), decoration(HEAD_LAYER_ID, 3)];
const roles = [
  role, { ...role, headLayerIndex: 0 }, { ...role, headLayerIndex: layerCount },
  { ...role, headLayerIndex: 1.6 }, { ...role, headLayerIndex: NaN },
  { ...role, decorations: [existing[0], duplicate, ...existing.slice(1)] },
  { ...role, decorations: [explicitHead[0], ...existing] },
  { ...role, decorations: [], headLayerIndex: 0 }
];
const edgePlacements = [
  ...placements.map((mode) => mode.settings),
  settings('after_index', '-1'), settings('after_index', '1.5'), settings('after_index', '0'),
  settings('after_index', '0x2'), settings('after_index', '1000000000')
];
for (const input of roles) {
  for (const incoming of [ordinary, [duplicate], duplicateIncoming, explicitHead, []]) {
    for (const prefs of edgePlacements) {
      check(input, incoming, prefs);
      edgeCases += 1;
    }
  }
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => Number(sorted[Math.ceil(p * sorted.length) - 1].toFixed(4));
  return { medianMs: at(0.5), p95Ms: at(0.95) };
}
let checksum = 0;
function time(fn: () => RoleDocument) {
  const start = performance.now();
  const result = fn();
  const ms = performance.now() - start;
  checksum += result.decorations.length + result.headLayerIndex;
  return ms;
}

function compare(incoming: DecorationLayer[], prefs: InsertDraftSettings) {
  const output = check(role, incoming, prefs);
  const before = () => baseline.insertDecorations(role, incoming, prefs);
  const after = () => insertDecorations(role, incoming, prefs);
  for (let i = 0; i < warmups; i += 1) { before(); after(); }
  const beforeTimes: number[] = [];
  const afterTimes: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    if (i % 2 === 0) {
      beforeTimes.push(time(before)); afterTimes.push(time(after));
    } else {
      afterTimes.push(time(after)); beforeTimes.push(time(before));
    }
  }
  return { expectedHeadIndex: output.headLayerIndex, v10: stats(beforeTimes), current: stats(afterTimes) };
}

const results = [1, 20, 2_000].flatMap((size) => {
  const incoming = Array.from({ length: size }, (_, index) => decoration('incoming-' + index, index));
  return placements.map(({ name, settings: prefs }) => ({ inserted: size, placement: name, ...compare(incoming, prefs) }));
});
console.log(JSON.stringify({ node: process.version, existingLayers: layerCount, edgeCases, warmups, samples, results, checksum }, null, 2));
