import { deepStrictEqual, strictEqual } from 'node:assert';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { convertBrushFillToDecos, type BrushFillConversionResult, type BrushFillMask } from '../src/lib/conversion/brushFillToDeco';
import type { ImageToDecoConversionOptions } from '../src/lib/conversion/imageToDeco';
import { partOptions } from '../src/mock/options';

const [baseline, sampleArg = '35'] = process.argv.slice(2);
const samples = Number(sampleArg);
if (!baseline || !Number.isSafeInteger(samples) || samples < 1) {
  throw new Error('Usage: node --import tsx scripts/benchBrushFillCoverage.ts TRUSTED_V18_CHECKOUT [samples]');
}
const { convertBrushFillToDecos: previous } = await import(
  pathToFileURL(resolve(baseline, 'src/lib/conversion/brushFillToDeco.ts')).href
) as { convertBrushFillToDecos: typeof convertBrushFillToDecos };
const option = partOptions.deco.find((part) => part.atlas)!;
const source = { type: 'deco', assetId: option.id } as const;

function pointsRow(size: number, dx: number, dy: number): BrushFillMask['points'] {
  return Array.from({ length: size }, (_, i) => ({
    x: dx + i * 2.125, y: dy + Math.sin(i * .37) * 5, radius: 6.25 + (i % 5) * .75
  }));
}
const fixtures = [
  { label: 'single stamp', points: [{ x: 0, y: 0, radius: 3 }], gap: 1, maxLayers: 200 },
  { label: 'fractional and tangent', points: [
    { x: 0, y: 0, radius: 3.6 }, { x: .9, y: -3.6, radius: .9 },
    { x: 13.5, y: 3.6, radius: 3.6 }, { x: 4.45, y: 3.45, radius: -2.7 }
  ], gap: .9, maxLayers: 5000 },
  { label: 'dense connected painting', points: Array.from({ length: 180 }, (_, i) => ({
    x: (i % 15) * 11, y: Math.floor(i / 15) * 11, radius: 8
  })), gap: 1, maxLayers: 5000 },
  { label: 'three far-apart strokes', points: [
    ...pointsRow(85, -1450, -980), ...pointsRow(80, 0, 200), ...pointsRow(80, 1450, 995)
  ], gap: 1.4, maxLayers: 5000 },
  { label: 'editor-size mixed-radius', points: [
    { x: -94, y: -92, radius: 32 }, { x: 96, y: 92, radius: 32 },
    ...pointsRow(9, -6, -4).map((point) => ({ ...point, radius: 1 }))
  ], gap: .55, maxLayers: 5000 },
  { label: 'far-apart mixed-radius stress', points: [
    { x: -1024, y: -1024, radius: 36 }, { x: 1024, y: 1024, radius: 36 },
    ...pointsRow(9, -6, -4).map((point) => ({ ...point, radius: 1 }))
  ], gap: .5, maxLayers: 0 },
  { label: 'dense wide-radius synthetic', points: [
    ...pointsRow(60, -60, -35), { x: .25, y: 1.5, radius: 200 }, ...pointsRow(25, 40, 40)
  ], gap: 2.2, maxLayers: 6000 }
];
function options(gap: number, maxLayers: number): ImageToDecoConversionOptions {
  return { maxSize: 64, alphaThreshold: 120, gapFactor: gap, targetScaleMultiplier: 2,
    targetRatio: 0.5, colorAlgorithm: 'rgb', maxLayers, minSourceOpaquePixels: 1 };
}
function state(result: BrushFillConversionResult) {
  return { ...result, decorations: result.decorations.map(({ id: _id, ...layer }) => layer) };
}
async function compare(mask: BrushFillMask, settings: ImageToDecoConversionOptions) {
  const saved = structuredClone(mask);
  const a = await previous(mask, source, [option], settings);
  const b = await convertBrushFillToDecos(mask, source, [option], settings);
  deepStrictEqual(state(b), state(a));
  deepStrictEqual(mask, saved, 'the ordered input mask must be preserved');
  return b;
}
let randomSeed = 0x8be0b337;
function rng(range: number) {
  randomSeed = (Math.imul(1664525, randomSeed) + 1013904223) >>> 0;
  return Math.floor(randomSeed / 2**32 * range);
}
for (let i = 0; i < 250; i++) {
  const gap = [.1, .53, .9, 1.7, 2.31, 4][i % 6];
  const points = Array.from({ length: 1 + rng(25) }, () => ({
    x: (rng(301) - 150) / 7,
    y: (rng(301) - 150) / 9,
    radius: (rng(89) - 9) / 13
  }));
  await compare({ points }, options(gap, [0, 3, 70, 5000][i % 4]));
}

for (let i = 0; i < 60; i++) {
  const gap = [.5, .55, .9, 1.1][i % 4];
  const radius = 15 + rng(18);
  const anchor = (rng(31) - 15) / 11;
  const points = [
    { x: -65 + anchor, y: -57, radius },
    { x: 65, y: 57 + anchor, radius: 18 + rng(15) },
    // Exactly tangent along the horizontal axis of the first wide circle.
    { x: -65 + anchor + radius, y: -57, radius: 0 },
    ...Array.from({ length: 10 }, () => ({
      x: (rng(371) - 185) / 7, y: (rng(313) - 156) / 9, radius: (1 + rng(5)) / 3
    }))
  ];
  await compare({ points }, options(gap, [0, 3, 300, 5000][i % 4]));
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return { medianMs: +sorted[Math.ceil(sorted.length * .5) - 1].toFixed(4),
    p95Ms: +sorted[Math.ceil(sorted.length * .95) - 1].toFixed(4) };
}

let checksum = 0;
for (const { label, points, gap, maxLayers } of fixtures) {
  const mask = { points }, settings = options(gap, maxLayers);
  const expected = await compare(mask, settings);
  async function sample(convert: typeof convertBrushFillToDecos) {
    const start = performance.now();
    const result = await convert(mask, source, [option], settings);
    const elapsed = performance.now() - start;
    strictEqual(result.sampledPixels, expected.sampledPixels);
    checksum += result.generatedPixels;
    return elapsed;
  }
  const old: number[] = [], next: number[] = [];
  for (let i = -9; i < samples; i++) {
    const forward = i % 2 === 0;
    const a = await sample(forward ? previous : convertBrushFillToDecos);
    const b = await sample(forward ? convertBrushFillToDecos : previous);
    if (i >= 0) {
      old.push(forward ? a : b);
      next.push(forward ? b : a);
    }
  }
  console.log(JSON.stringify({ label, stamps: points.length, gap, hits: expected.sampledPixels,
    generated: expected.generatedPixels, v18: stats(old), current: stats(next) }));
}
console.log({ node: process.version, samples, exactCases: 310 + fixtures.length, checksum });
