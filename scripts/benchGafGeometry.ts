import { deepStrictEqual } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { resolveGafFrameOneDisplayList } from '../src/lib/runtime/gafFrameDisplayList';
import { resolveGafFrameOneGeometry, type GafFrameOneGeometry } from '../src/lib/runtime/gafFrameOneGeometry';
import { decorationRuntimeManifest } from '../src/lib/runtime/gafRuntimeManifest';

const manifest = decorationRuntimeManifest;
if (!manifest) throw new Error('Generated decoration runtime manifest is missing. Run npm run generate:gaf.');
const timelineScale = manifest.timelineScale ?? 1;
const fullResolve = (timelineId: string) => resolveGafFrameOneDisplayList(manifest, timelineId, { timelineScale });
const cacheResolve = (timelineId: string) => resolveGafFrameOneGeometry(manifest, timelineId, timelineScale);
const catalog = [...new Set(Object.entries(manifest.timelinesByLinkage)
  .filter(([linkage, timelineId]) => linkage !== 'rootTimeline' && Object.hasOwn(manifest.timelinesById, timelineId))
  .map(([, timelineId]) => timelineId))];
if (!catalog.length) throw new Error('The generated decoration manifest has no linked timeline IDs.');

function measure(resolve: (timelineId: string) => readonly GafFrameOneGeometry[], ids: readonly string[]) {
  let textureDraws = 0;
  let alphaSum = 0;
  const start = performance.now();
  for (const id of ids) {
    const geometry = resolve(id);
    textureDraws += geometry.length;
    for (const item of geometry) alphaSum += item.alpha;
  }
  return { durationMs: performance.now() - start, textureDraws, alphaSum };
}

function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (rank: number) => Number(sorted[Math.ceil(sorted.length * rank) - 1].toFixed(4));
  return { medianMs: at(0.5), p95Ms: at(0.95), samples: values.length };
}

const path = fileURLToPath(import.meta.url);
const coldCase = process.argv[2];
if (coldCase === '--cold-old' || coldCase === '--cold-new') {
  // One untouched process per sample: no cached geometry or frame decoding
  // from an earlier sample. Startup/module loading is outside the timer.
  console.log(JSON.stringify(measure(coldCase === '--cold-old' ? fullResolve : cacheResolve, catalog)));
} else {
  const layers = Number(process.argv[2] ?? 5_000);
  if (!Number.isSafeInteger(layers) || layers < 1) throw new Error('Layer count must be a positive integer.');
  const coldOriginal: number[] = [];
  const coldCached: number[] = [];
  function isolatedCold(kind: '--cold-old' | '--cold-new') {
    return JSON.parse(execFileSync(process.execPath, [...process.execArgv, path, kind], { encoding: 'utf8' })) as ReturnType<typeof measure>;
  }
  let coldTextureDraws = 0;
  for (let index = 0; index < 6; index += 1) {
    const before = isolatedCold(index % 2 === 0 ? '--cold-old' : '--cold-new');
    const after = isolatedCold(index % 2 === 0 ? '--cold-new' : '--cold-old');
    const old = index % 2 === 0 ? before : after;
    const cached = index % 2 === 0 ? after : before;
    deepStrictEqual(old.textureDraws, cached.textureDraws);
    deepStrictEqual(old.alphaSum, cached.alphaSum);
    coldTextureDraws = cached.textureDraws;
    coldOriginal.push(old.durationMs);
    coldCached.push(cached.durationMs);
  }

  let verifiedTextureDraws = 0;
  for (const id of catalog) {
    const expected = fullResolve(id).map(({ elementId, alpha, matrix }) => ({ elementId, alpha, matrix }));
    deepStrictEqual(cacheResolve(id), expected, `geometry playback parity for canonical timeline ${id}`);
    verifiedTextureDraws += expected.length;
  }
  const repeatedCodes = ['third_deco_05', 'third_xmas_deco_05', 'royal_xmas_deco_06'];
  const repeatIds = repeatedCodes.map((linkage) => {
    const id = manifest.timelinesByLinkage[linkage];
    if (id === undefined || !Object.hasOwn(manifest.timelinesById, id)) {
      throw new Error(`Benchmark decoration is missing from the generated manifest: ${linkage}`);
    }
    return id;
  });
  const repeated = Array.from({ length: layers }, (_, index) => repeatIds[index % repeatIds.length]);
  const mixed = Array.from({ length: layers }, (_, index) => catalog[index % catalog.length]);
  function measureRole(ids: string[]) {
    for (let index = 0; index < 8; index += 1) {
      measure(fullResolve, ids);
      measure(cacheResolve, ids);
    }
    const oldTimes: number[] = [];
    const cacheTimes: number[] = [];
    let textureDraws = 0;
    for (let index = 0; index < 30; index += 1) {
      const old = index % 2 === 0 ? measure(fullResolve, ids) : undefined;
      const cached = measure(cacheResolve, ids);
      const before = old ?? measure(fullResolve, ids);
      deepStrictEqual(before.textureDraws, cached.textureDraws);
      deepStrictEqual(before.alphaSum, cached.alphaSum);
      textureDraws = cached.textureDraws;
      oldTimes.push(before.durationMs);
      cacheTimes.push(cached.durationMs);
    }
    return { layers: ids.length, distinctTimelines: new Set(ids).size, textureDraws, before: summary(oldTimes), cached: summary(cacheTimes) };
  }

  console.log(JSON.stringify({
    node: process.version,
    timelineScale,
    parity: { canonicalTimelines: catalog.length, textureDraws: verifiedTextureDraws, fields: ['painter order', 'element ID', 'alpha', 'all six affine components'] },
    firstAccessCatalogSweep: { distinctTimelines: catalog.length, textureDraws: coldTextureDraws, before: summary(coldOriginal), cached: summary(coldCached) },
    repeatedRoleWarm: measureRole(repeated),
    mixedRoleWarm: measureRole(mixed)
  }, null, 2));
}
