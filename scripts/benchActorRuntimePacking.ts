import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { gafFrameInstances } from '../src/lib/runtime/gafFrameInstances';
import type { GafRuntimeManifest, GafTimeline } from '../src/types/gafRuntime';

const [baseline, beforeDist, afterDist, sampleArg = '20'] = process.argv.slice(2);
const samples = Number(sampleArg);
if (!baseline || !beforeDist || !afterDist || !Number.isSafeInteger(samples) || samples < 1) {
  throw new Error('Usage: node --import tsx scripts/benchActorRuntimePacking.ts TRUSTED_V17_CHECKOUT V17_DIST CURRENT_DIST [samples]');
}
const { gafFrameInstances: oldDecode } = await import(
  pathToFileURL(resolve(baseline, 'src/lib/runtime/gafFrameInstances.ts')).href
) as { gafFrameInstances: typeof gafFrameInstances };
const generated = (dir: string, name: string) => readFileSync(resolve(dir, 'src/generated/' + name + '.json'), 'utf8');
const current = resolve(import.meta.dirname, '..');
const runtimeName = 'gafRuntimeManifest';
const oldRaw = generated(baseline, runtimeName);
const newRaw = generated(current, runtimeName);
const baselineRuntime = JSON.parse(oldRaw);
const runtime = JSON.parse(newRaw);
const { actorRuntime: beforeActor, ...beforeRest } = baselineRuntime;
const { actorRuntime: afterActor, ...afterRest } = runtime;
deepStrictEqual(afterRest, beforeRest);
for (const name of ['gafDecorationRuntimeManifest', 'gafWeaponRuntimeManifest']) {
  strictEqual(generated(current, name), generated(baseline, name), name);
}

function frameKeys(timeline: GafTimeline) {
  return Object.keys('frames' in timeline ? timeline.frames : timeline.packedFrames);
}
function metadata(manifest: GafRuntimeManifest) {
  const { matrixPool: _pool, matrixPoolFloat32LE: _binary, timelinesById, ...rest } = manifest;
  return {
    ...rest,
    timelinesById: Object.fromEntries(Object.entries(timelinesById).map(([id, timeline]) => {
      if ('frames' in timeline) { const { frames, ...meta } = timeline; return [id, meta]; }
      const { packedFrames, ...meta } = timeline;
      return [id, meta];
    }))
  };
}
deepStrictEqual(metadata(afterActor), metadata(beforeActor));
let frames = 0, instances = 0;
for (const [timelineId, timeline] of Object.entries((beforeActor as GafRuntimeManifest).timelinesById)) {
  const other = (afterActor as GafRuntimeManifest).timelinesById[timelineId];
  const keys = frameKeys(timeline);
  deepStrictEqual(frameKeys(other), keys);
  for (const frame of [...keys, '__nonexistent_bench_frame__']) {
    const before = oldDecode(beforeActor, timeline, frame);
    const after = gafFrameInstances(afterActor, other, frame);
    deepStrictEqual(after, before, `${timelineId}:${frame}`);
    if (frame !== '__nonexistent_bench_frame__') {
      instances += before.length;
      frames++;
    }
  }
}

const bytes = (input: string | Buffer) => ({ raw: Buffer.byteLength(input), gzip: gzipSync(input).length });
function atomicMatrixBytes(actor: GafRuntimeManifest) {
  if (actor.matrixPoolFloat32LE) {
    const binary = Buffer.from(actor.matrixPoolFloat32LE, 'base64');
    return { binaryBytes: binary.length, base64Bytes: actor.matrixPoolFloat32LE.length,
      uniqueMatrices: binary.length / 24 };
  }
  if (actor.matrixPool) return {
    serializedPoolBytes: Buffer.byteLength(JSON.stringify(actor.matrixPool)),
    uniqueMatrices: actor.matrixPool.length
  };
  let serializedMatrixValueBytes = 0;
  const unique = new Set<string>();
  for (const timeline of Object.values(actor.timelinesById)) if ('frames' in timeline) {
    for (const frame of Object.values(timeline.frames)) for (const { matrix } of frame) {
      serializedMatrixValueBytes += Buffer.byteLength(JSON.stringify(matrix));
      unique.add(JSON.stringify([matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty]));
    }
  }
  return { serializedMatrixValueBytes, uniqueMatrices: unique.size };
}
console.log(JSON.stringify({
  node: process.version, parity: { timelines: Object.keys(beforeActor.timelinesById).length, frames, instances },
  sourceManifest: { v17: bytes(oldRaw), current: bytes(newRaw) },
  actorJSON: { v17: bytes(JSON.stringify(beforeActor)), current: bytes(JSON.stringify(afterActor)) },
  matrixRepresentationOnly: { v17: atomicMatrixBytes(beforeActor), current: atomicMatrixBytes(afterActor) }
}));

interface Chunk {
  file: string;
  imports?: string[];
  css?: string[];
}
function bundle(dist: string) {
  const manifest = JSON.parse(readFileSync(resolve(dist, '.vite/manifest.json'), 'utf8')) as Record<string, Chunk>;
  const read = (file: string) => readFileSync(resolve(dist, file));
  const oneShot = (files: Iterable<string>) => [...files].reduce((sum, file) => {
    const size = bytes(read(file));
    return { raw: sum.raw + size.raw, gzip: sum.gzip + size.gzip };
  }, { raw: 0, gzip: 0 });
  function graph(entries: string[]) {
    const seenKeys = new Set<string>(), seenFiles = new Set<string>();
    function visit(key: string) {
      if (seenKeys.has(key)) return;
      const chunk = manifest[key];
      ok(chunk, key);
      seenKeys.add(key);
      seenFiles.add(chunk.file);
      chunk.css?.forEach((css) => seenFiles.add(css));
      chunk.imports?.forEach(visit);
    }
    entries.forEach(visit);
    return oneShot(seenFiles);
  }
  const files = readdirSync(resolve(dist, 'assets'));
  const asset = (pattern: RegExp) => {
    const found = files.filter((file) => pattern.test(file));
    strictEqual(found.length, 1);
    return bytes(read('assets/' + found[0]));
  };
  const batchScripts = [...read('batch-render.html').toString('utf8').matchAll(/<script[^>]+src="\/?([^"]+)"/g)]
    .map((match) => match[1]);
  const batchEntries = Object.keys(manifest).filter((key) => batchScripts.includes(manifest[key].file));
  ok(batchEntries.length > 0);
  strictEqual(batchEntries.length, batchScripts.length);
  return {
    runtime: asset(/^gaf-runtime-.*\.js$/),
    weapon: asset(/^(?:gaf-weapon-|gafWeaponRuntimeManifest-).*\.json$/),
    editorShell: graph(['index.html']),
    editorWithStage: graph(['index.html', 'src/components/CharacterStage.tsx']),
    batch: graph(batchEntries)
  };
}
console.log(JSON.stringify({ build: { v17: bundle(beforeDist), current: bundle(afterDist) } }));

function decodeAll(manifest: GafRuntimeManifest, decode: typeof gafFrameInstances) {
  let decoded = 0;
  for (const timeline of Object.values(manifest.timelinesById)) {
    for (const frame of frameKeys(timeline)) decoded += decode(manifest, timeline, frame).length;
  }
  return decoded;
}
function measure(raw: string, decode: typeof gafFrameInstances) {
  const t0 = performance.now();
  const { actorRuntime } = JSON.parse(raw) as { actorRuntime: GafRuntimeManifest };
  const t1 = performance.now();
  const cold = decodeAll(actorRuntime, decode);
  const t2 = performance.now();
  const repeat = decodeAll(actorRuntime, decode);
  const t3 = performance.now();
  strictEqual(cold, instances);
  strictEqual(repeat, instances);
  return [t1-t0, t2-t1, t3-t2];
}
function summarize(series: number[][]) {
  function stats(column: number) {
    const values = series.map((item) => item[column]).sort((a, b) => a - b);
    return { medianMs: +values[Math.ceil(values.length * .5)-1].toFixed(3),
      p95Ms: +values[Math.ceil(values.length * .95)-1].toFixed(3) };
  }
  return { sourceJsonParse: stats(0), allFramesFirstRead: stats(1), allFramesSecondRead: stats(2) };
}
const before: number[][] = [], after: number[][] = [];
for (let i = -6; i < samples; i++) {
  const forward = i % 2 === 0;
  const a = forward ? measure(oldRaw, oldDecode) : measure(newRaw, gafFrameInstances);
  const b = forward ? measure(newRaw, gafFrameInstances) : measure(oldRaw, oldDecode);
  if (i >= 0) {
    before.push(forward ? a : b);
    after.push(forward ? b : a);
  }
}
console.log(JSON.stringify({ timings: { samples, v17: summarize(before), current: summarize(after) } }));
