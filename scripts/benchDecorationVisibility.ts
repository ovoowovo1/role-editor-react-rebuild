import { deepStrictEqual, strictEqual } from 'node:assert';
import { performance } from 'node:perf_hooks';
import {
  roleWithSelectedVisibility,
  roleWithToggledDecorationVisibility
} from '../src/lib/editor/editorDecorationMutations';
import { createHistoryIdPool, createRoleHistoryPatch } from '../src/lib/editor/editorRoleHistoryPatch';
import { cloneRole } from '../src/lib/editor/editorRoleUtils';
import { createDefaultRole, partOptions } from '../src/mock/options';
import type { DecorationLayer, RoleDocument } from '../src/types/role';

const layers = Number(process.argv[2] ?? 5_000);
if (!Number.isSafeInteger(layers) || layers < 10) throw new Error('Pass a layer count of at least 10.');
const warmups = 30;
const samples = 120;
const option = partOptions.deco.find((candidate) => candidate.atlas) ?? partOptions.deco[0];
const decorations: DecorationLayer[] = Array.from({ length: layers }, (_, index) => ({
  id: `bench-visible-${index}`, code: option.code, assetId: option.id, name: `Layer ${index}`,
  x: index % 80 - 40, y: Math.floor(index / 80) % 80 - 40,
  scaleX: 1, scaleY: 1, rotation: index % 360, visible: true, opacity: 1
}));
const groupIds = decorations.slice(0, 12).map((item) => item.id);
const role: RoleDocument = {
  ...createDefaultRole(), decorations, headLayerIndex: Math.floor(layers / 2),
  updatedAt: '2026-01-01T00:00:00.000Z',
  groups: [{ id: 'fixture', name: 'Fixture', itemIds: groupIds, visible: true, collapsed: false,
    members: groupIds.map((id) => ({ type: 'layer', id })) }]
};

// Previous command code cloned the document, then mapped the target layers.
function legacySelected(ids: readonly string[], visible: boolean) {
  const next = cloneRole(role);
  const selected = new Set(ids);
  next.decorations = next.decorations.map((item) => selected.has(item.id) ? { ...item, visible } : item);
  return next;
}

function legacyToggle(id: string) {
  const next = cloneRole(role);
  next.decorations = next.decorations.map((item) => item.id === id ? { ...item, visible: !item.visible } : item);
  return next;
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => Number(sorted[Math.ceil(p * sorted.length) - 1].toFixed(4));
  return { medianMs: at(0.5), p95Ms: at(0.95) };
}

let checksum = 0;
function measure(operation: () => RoleDocument, withHistory: boolean) {
  const pool = createHistoryIdPool();
  return () => {
    const start = performance.now();
    const next = operation();
    const patch = withHistory ? createRoleHistoryPatch(role, next, pool) : null;
    const elapsed = performance.now() - start;
    checksum += next.decorations.length + (patch?.decorations.visibility?.indices.length ?? 0);
    return elapsed;
  };
}

function compare(old: () => RoleDocument, current: () => RoleDocument, withHistory: boolean) {
  const before = measure(old, withHistory);
  const after = measure(current, withHistory);
  for (let n = 0; n < warmups; n += 1) {
    before();
    after();
  }
  const oldTimes: number[] = [];
  const newTimes: number[] = [];
  for (let n = 0; n < samples; n += 1) {
    if (n % 2 === 0) {
      oldTimes.push(before());
      newTimes.push(after());
    } else {
      newTimes.push(after());
      oldTimes.push(before());
    }
  }
  return { before: stats(oldTimes), shared: stats(newTimes) };
}

const single = decorations[Math.floor(layers / 2)].id;
const sparse = decorations.filter((_, index) => index % 250 === 0).map(({ id }) => id);
const dense = decorations.filter((_, index) => index % 5 !== 0).map(({ id }) => id);
const cases = [
  { name: 'toggle-one', selected: 1, old: () => legacyToggle(single),
    current: () => roleWithToggledDecorationVisibility(role, single), changed: 1 },
  { name: 'hide-sparse', selected: sparse.length, old: () => legacySelected(sparse, false),
    current: () => roleWithSelectedVisibility(role, sparse, false), changed: sparse.length },
  { name: 'hide-dense', selected: dense.length, old: () => legacySelected(dense, false),
    current: () => roleWithSelectedVisibility(role, dense, false), changed: dense.length },
  { name: 'show-already-visible', selected: dense.length, old: () => legacySelected(dense, true),
    current: () => roleWithSelectedVisibility(role, dense, true), changed: 0 }
];

const results = cases.map(({ name, selected, old, current, changed }) => {
  const before = old();
  const shared = current();
  deepStrictEqual(shared, before, `role values differ in ${name}`);
  const beforeReplaced = before.decorations.filter((item, index) => item !== decorations[index]).length;
  const afterReplaced = shared.decorations.filter((item, index) => item !== decorations[index]).length;
  strictEqual(afterReplaced, changed, `expected only changed layers to be replaced in ${name}`);
  strictEqual(shared.groups, role.groups, `expected group identity to be preserved in ${name}`);
  if (changed === 0) strictEqual(shared, role, 'no-op should retain role identity');
  const beforePatch = createRoleHistoryPatch(role, before);
  const afterPatch = createRoleHistoryPatch(role, shared);
  deepStrictEqual(afterPatch, beforePatch, `history patch differs in ${name}`);
  return {
    name, selected, changed,
    replacedDecorationRecords: { before: beforeReplaced, shared: afterReplaced },
    mutationOnly: compare(old, current, false),
    mutationAndHistoryPatch: compare(old, current, true)
  };
});
console.log(JSON.stringify({ node: process.version, layers, warmups, samples, results, checksum }, null, 2));
