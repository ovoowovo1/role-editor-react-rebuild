import { strictEqual } from 'node:assert';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import {
  bestPaletteMatch,
  buildDecoPalette,
  IMAGE_TO_DECO_PRESETS,
  type ColorMatchAlgorithm,
  type DecoPaletteEntry
} from '../src/lib/conversion/imageToDeco';
import { partOptions } from '../src/mock/options';

const baselineDirectory = process.argv[2];
const pixels = Number(process.argv[3] ?? 5_000);
if (!baselineDirectory || !Number.isSafeInteger(pixels) || pixels < 32 || pixels > 2 ** 24) {
  throw new Error('Usage: node --import tsx scripts/benchPaletteMatching.ts <v11 source directory> [sampled pixels]');
}
const old = (await import(pathToFileURL(resolve(
  baselineDirectory, 'src/lib/conversion/imageToDeco.ts'
)).href) as Pick<typeof import('../src/lib/conversion/imageToDeco'), 'bestPaletteMatch'>).bestPaletteMatch;

const warmups = 5;
const samples = 20;
const modes: ColorMatchAlgorithm[] = ['cielab', 'weighted-rgb', 'rgb', 'luminance', 'hsv', 'hsl', 'brightness-color'];
let random = 0x6c078965;
function colorKey() {
  random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
  return random & 0xffffff;
}
const channels = (key: number) => [key >> 16, (key >> 8) & 255, key & 255] as const;

async function makePalette(): Promise<DecoPaletteEntry[]> {
  // Use production Lab/HSV/HSL derivation. A deterministic one-pixel shim only
  // supplies fixture RGB bytes during setup, outside all measurements.
  const saved = {
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    Image: Object.getOwnPropertyDescriptor(globalThis, 'Image'),
    requestAnimationFrame: Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame')
  };
  class FixtureImage {
    rgb = 0;
    naturalWidth = 1;
    naturalHeight = 1;
    onload?: () => void;
    set src(src: string) {
      this.rgb = Number(src.slice('palette-fixture:'.length));
      queueMicrotask(() => this.onload?.());
    }
  }
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: { createElement() {
      let key = 0;
      return { getContext: () => ({
        drawImage(image: FixtureImage) { key = image.rgb; },
        getImageData() { return { data: new Uint8ClampedArray([...channels(key), 255]) }; }
      }) };
    } } },
    Image: { configurable: true, value: FixtureImage },
    requestAnimationFrame: { configurable: true, value: (callback: FrameRequestCallback) => setImmediate(() => callback(performance.now())) }
  });
  try {
    const options = partOptions.deco.filter((option) => option.atlas).map((option) => ({
      ...option, atlas: undefined, icon: 'palette-fixture:' + colorKey()
    }));
    const palette = await buildDecoPalette(options, { ...IMAGE_TO_DECO_PRESETS.detail, minSourceOpaquePixels: 1 });
    strictEqual(palette.length, options.length);
    if (palette.length < 10) throw new Error('Expected a real decoration catalog in the fixture.');
    return palette;
  } finally {
    Object.entries(saved).forEach(([key, descriptor]) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
}

const palette = await makePalette();
const distinct = Array.from({ length: pixels }, colorKey);
strictEqual(new Set(distinct).size, pixels);
const repeated = Array.from({ length: pixels }, (_, index) => distinct[index % 32]);
const tieFirst = palette[0];
const tieSecond = { ...tieFirst, option: palette[1].option };
for (const mode of modes) {
  for (const key of distinct) {
    const rgb = channels(key);
    strictEqual(bestPaletteMatch(...rgb, palette, mode), old(...rgb, palette, mode), mode + ':' + key);
  }
  for (const pair of [[tieFirst, tieSecond], [tieSecond, tieFirst]]) {
    strictEqual(old(tieFirst.r, tieFirst.g, tieFirst.b, pair, mode), pair[0], mode + ' original tie');
    strictEqual(bestPaletteMatch(tieFirst.r, tieFirst.g, tieFirst.b, pair, mode), pair[0], mode + ' current tie');
  }
}

function stats(durations: number[]) {
  const sorted = [...durations].sort((a, b) => a - b);
  const at = (percentile: number) => Number(sorted[Math.ceil(sorted.length * percentile) - 1].toFixed(4));
  return { medianMs: at(0.5), p95Ms: at(0.95) };
}
let checksum = 0;
function run(match: typeof bestPaletteMatch, keys: number[], mode: ColorMatchAlgorithm, memoize: boolean) {
  const memo = memoize ? new Map<number, DecoPaletteEntry>() : null;
  let count = 0;
  let scans = 0;
  const start = performance.now();
  for (const key of keys) {
    let best = memo?.get(key);
    if (!best) {
      best = match(...channels(key), palette, mode);
      memo?.set(key, best);
      scans += 1;
    }
    count += best.r + best.g + best.b;
  }
  const elapsed = performance.now() - start;
  checksum += count;
  return { elapsed, scans };
}

function compare(keys: number[], mode: ColorMatchAlgorithm, memoize: boolean) {
  for (let i = 0; i < warmups; i += 1) {
    run(old, keys, mode, memoize);
    run(bestPaletteMatch, keys, mode, memoize);
  }
  const oldTimes: number[] = [];
  const newTimes: number[] = [];
  let scans = 0;
  for (let i = 0; i < samples; i += 1) {
    const before = i % 2 === 0 ? run(old, keys, mode, memoize) : undefined;
    const after = run(bestPaletteMatch, keys, mode, memoize);
    const legacy = before ?? run(old, keys, mode, memoize);
    strictEqual(legacy.scans, after.scans);
    scans = after.scans;
    oldTimes.push(legacy.elapsed);
    newTimes.push(after.elapsed);
  }
  return { scans, v11: stats(oldTimes), current: stats(newTimes) };
}
const results = modes.map((mode) => ({
  mode,
  distinct: compare(distinct, mode, false),
  repeatedDirect: compare(repeated, mode, false),
  repeatedWithConversionMemo: compare(repeated, mode, true)
}));
console.log(JSON.stringify({
  node: process.version, entries: palette.length, pixels, warmups, samples,
  parity: { winners: pixels * modes.length, orderingTies: modes.length * 2 },
  results, checksum
}, null, 2));
