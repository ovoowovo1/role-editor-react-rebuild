import { deepStrictEqual, strictEqual } from 'node:assert';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { HEAD_LAYER_ID } from '../src/constants/layers';
import { applyBaseRoleAppearanceUpdate } from '../src/lib/editor/editorRoleCommands';
import { sameRole } from '../src/lib/editor/editorHistoryTypes';
import * as history from '../src/lib/editor/editorRoleHistoryPatch';
import { syncGroups } from '../src/lib/editor/editorRoleUtils';
import { camps, createDefaultRole, partOptions } from '../src/mock/options';
import type { DecorationGroup, DecorationGroupMember, RoleDocument } from '../src/types/role';

const [baseline, sampleArg = '80'] = process.argv.slice(2);
const samples = Number(sampleArg);
if (!baseline || !Number.isSafeInteger(samples) || samples < 1) {
  throw new Error('Usage: node --import tsx scripts/benchRoleAppearanceUpdates.ts TRUSTED_V19_CHECKOUT [samples]');
}
const oldImport = (module: string) => import(pathToFileURL(resolve(baseline, 'src/lib/editor/' + module + '.ts')).href);
const oldCommands = await oldImport('editorRoleCommands') as typeof import('../src/lib/editor/editorRoleCommands');
const oldRole = await oldImport('editorRoleUtils') as typeof import('../src/lib/editor/editorRoleUtils');
const oldHistory = await oldImport('editorRoleHistoryPatch') as typeof history;
const oldEquality = await oldImport('editorHistoryTypes') as typeof import('../src/lib/editor/editorHistoryTypes');
type Update = Parameters<typeof applyBaseRoleAppearanceUpdate>[1];

function fullCloneUpdate(input: RoleDocument, change: Update) {
  // v19 useEditorState.updateRole around the exact appearance updaters.
  const draft = oldRole.cloneRole(input);
  const changed = change.type === 'part' ? oldCommands.roleWithChosenBodyPart(draft, change.tab, change.option)
    : change.type === 'camp' ? { ...draft, camp: change.camp }
    : { ...draft, gender: change.gender };
  return oldRole.syncGroups(oldRole.touch(changed));
}

const deco = partOptions.deco.find((option) => option.atlas)!;
const decorations = Array.from({ length: 5000 }, (_, i) => ({
  id: 'fixture-' + i, name: 'Fixture ' + i, code: deco.code, assetId: deco.id,
  x: i % 120 - 60, y: i % 110 - 55, rotation: i % 360, opacity: 1, visible: true, scaleX: 1, scaleY: 1
}));
const plain: RoleDocument = { ...createDefaultRole(), decorations, headLayerIndex: 400, updatedAt: '2026-01-01T00:00:00.000Z' };
const group = (id: string, members: DecorationGroupMember[]): DecorationGroup => ({
  id, name: id, members, itemIds: members.flatMap((item) => item.type === 'layer' ? [item.id] : []),
  visible: true, collapsed: false
});
const leaf = Array.from({ length: 115 }, (_, i) => group('leaf-' + i, [
  ...decorations.slice(Math.floor(i * 5000 / 115), Math.floor((i + 1) * 5000 / 115))
    .map(({ id }) => ({ type: 'layer' as const, id })),
  ...(i === 8 ? [{ type: 'layer' as const, id: HEAD_LAYER_ID }] : [])
]));
const branches = Array.from({ length: 9 }, (_, i) => group('branch-' + i,
  leaf.slice(Math.floor(i * 115 / 9), Math.floor((i + 1) * 115 / 9)).map(({ id }) => ({ type: 'group', id }))));
const root = group('root', branches.map(({ id }) => ({ type: 'group', id })));
const canonical = syncGroups({ ...plain, groups: [root, ...branches, ...leaf] });
strictEqual(canonical.groups.length, 125);
const legacy: RoleDocument = { ...canonical, headLayerIndex: 6000.25, groups: [
  ...canonical.groups.filter(({ id }) => id !== 'leaf-3' && id !== 'leaf-4'),
  { id: 'leaf-3', name: 'stale mixed id list', itemIds: ['missing-id', 'fixture-140', HEAD_LAYER_ID, 'fixture-140'], collapsed: true, visible: false },
  group('leaf-4', [{ type: 'group', id: 'root' }, { type: 'layer', id: 'fixture-195' }]),
  group('leaf-4', [{ type: 'layer', id: 'fixture-201' }])
] };
const malformed: RoleDocument = { ...plain, decorations: [
  ...decorations.slice(0, -1), { ...decorations.at(-1)!, x: Number.NaN }
] };
const firstHead = partOptions.head.find((option) => option.id === plain.parts.head)!;
const anotherHead = partOptions.head.find((option) => option.id !== plain.parts.head)!;
const updates: [string, Update][] = [
  ['camp', { type: 'camp', camp: camps.find(({ code }) => code !== plain.camp)!.code }],
  ['gender', { type: 'gender', gender: 'female' }],
  ['head part', { type: 'part', tab: 'head', option: anotherHead }],
  ['same camp', { type: 'camp', camp: plain.camp }],
  ['same gender', { type: 'gender', gender: plain.gender }],
  ['same head part', { type: 'part', tab: 'head', option: firstHead }]
];
for (const tab of ['hand', 'foot', 'cape'] as const) {
  updates.push([tab, { type: 'part', tab, option: partOptions[tab].find((option) => option.id !== plain.parts[tab])! }]);
}
const stripTimestamp = ({ updatedAt: _time, ...rest }: RoleDocument) => rest;
function withoutGeneratedTimestamp(entry: ReturnType<typeof history.makeBaseRoleHistoryEntry>) {
  if (!entry) return entry;
  const { updatedAt, ...patch } = entry.patch;
  return { ...entry, patch: { ...patch, ...(updatedAt ? { previousTimestamp: updatedAt.before } : {}) } };
}
function step(input: RoleDocument, change: Update, previous: boolean, pool: ReturnType<typeof history.createHistoryIdPool>) {
  const next = (previous ? fullCloneUpdate : applyBaseRoleAppearanceUpdate)(input, change);
  const same = (previous ? oldEquality.sameRole : sameRole)(input, next);
  const entry = same ? null : (previous ? oldHistory : history).makeBaseRoleHistoryEntry(input, next, pool);
  return { next, entry, present: same ? input : next };
}
function stats(values: number[]) {
  const sorted = [...values].sort((a,b) => a-b);
  return { medianMs: +sorted[Math.ceil(sorted.length * .5) - 1].toFixed(4),
    p95Ms: +sorted[Math.ceil(sorted.length * .95) - 1].toFixed(4) };
}
let parity = 0, checksum = 0;
for (const [label, input] of [['no groups', plain], ['canonical', canonical], ['legacy', legacy], ['NaN fallback', malformed]] as const) {
  const saved = structuredClone(input);
  for (const [action, command] of updates) {
    const a = step(input, command, true, oldHistory.createHistoryIdPool());
    const b = step(input, command, false, history.createHistoryIdPool());
    deepStrictEqual(stripTimestamp(b.next), stripTimestamp(a.next));
    deepStrictEqual(withoutGeneratedTimestamp(b.entry), withoutGeneratedTimestamp(a.entry));
    strictEqual(a.present === input, b.present === input);
    if (input !== malformed) strictEqual(b.next.decorations, input.decorations);
    else strictEqual(b.next.decorations.at(-1) === input.decorations.at(-1), false);
    strictEqual(a.next.decorations.some((item, i) => item === input.decorations[i]), false);
    if (a.entry && b.entry) {
      const beforeUndo = oldHistory.applyRoleHistoryPatch(a.present, a.entry.patch, 'before');
      const afterUndo = history.applyRoleHistoryPatch(b.present, b.entry.patch, 'before');
      deepStrictEqual(stripTimestamp(afterUndo), stripTimestamp(beforeUndo));
      deepStrictEqual(stripTimestamp(history.applyRoleHistoryPatch(afterUndo, b.entry.patch, 'after')),
        stripTimestamp(oldHistory.applyRoleHistoryPatch(beforeUndo, a.entry.patch, 'after')));
    }
    parity++;
    if (input === malformed || !['camp', 'gender', 'head part', 'same head part'].includes(action)) continue;
    const legacyPool = oldHistory.createHistoryIdPool(), currentPool = history.createHistoryIdPool();
    function sample(previous: boolean) {
      const t0 = performance.now();
      const result = step(input, command, previous, previous ? legacyPool : currentPool);
      const elapsed = performance.now() - t0;
      checksum += result.present.decorations.length + (result.entry ? 1 : 0);
      return elapsed;
    }
    const before: number[] = [], after: number[] = [];
    for (let i = -12; i < samples; i++) {
      const forward = i % 2 === 0;
      const first = sample(forward), second = sample(!forward);
      if (i >= 0) { before.push(forward ? first : second); after.push(forward ? second : first); }
    }
    console.log(JSON.stringify({ fixture: label, action, groups: input.groups.length, hasHistory: Boolean(b.entry),
      retainedLayerRecords: [0, input.decorations.length], v19: stats(before), current: stats(after) }));
  }
  deepStrictEqual(input, saved);
}
console.log({ node: process.version, samples, parity, checksum });
