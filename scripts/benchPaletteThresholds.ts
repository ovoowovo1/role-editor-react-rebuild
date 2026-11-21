import { deepStrictEqual } from 'node:assert';
import { performance } from 'node:perf_hooks';
import {
  averageOpaqueColorAtThreshold,
  buildAlphaPaletteTotals,
  minimumPaletteAlpha
} from '../src/lib/conversion/alphaPaletteStats';

const count = Number(process.argv[2] ?? 128);
const warmups = 8;
const samples = 30;
if (!Number.isSafeInteger(count) || count < 1 || count > 512) {
  throw new Error('Pass a sprite count between 1 and 512 (default 128).');
}

// Deterministic RGBA sprites with transparent margins, opaque interiors and
// mixed-alpha edges/interiors. No browser APIs or injected pixel-read mocks.
const dimensions = [[24, 24], [42, 58], [60, 75], [84, 134]] as const;
function spritePixels(index: number) {
  const [width, height] = dimensions[index % dimensions.length];
  const data = new Uint8ClampedArray(width * height * 4);
  let seed = (0x6a09e667 ^ (index + 1)) >>> 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const offset = (y * width + x) * 4;
      data[offset] = seed & 255;
      data[offset + 1] = (seed >>> 8) & 255;
      data[offset + 2] = (seed >>> 16) & 255;
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      data[offset + 3] = edge < 2 ? 0 : edge < 5 || seed % 11 < 3 ? seed >>> 24 : 255;
    }
  }
  return data;
}
const sprites = Array.from({ length: count }, (_, index) => spritePixels(index));
const rasterBytes = sprites.reduce((total, sprite) => total + sprite.byteLength, 0);
if (rasterBytes > 8 * 1024 * 1024) throw new Error('Fixture exceeds the 8 MiB palette cache. Use fewer sprites.');

// Exact pre-bucket averaging rule used by buildDecoPalette before v6.
function scan(data: Uint8ClampedArray, threshold: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let opaquePixels = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] <= threshold) continue;
    r += data[index];
    g += data[index + 1];
    b += data[index + 2];
    opaquePixels += 1;
  }
  return opaquePixels ? { r: r / opaquePixels, g: g / opaquePixels, b: b / opaquePixels, count: opaquePixels } : null;
}
// First lookup in the final build still scans raw RGBA; the predicate uses
// the canonical minimum alpha rather than comparing the unnormalized input.
function scanAtMinimumAlpha(data: Uint8ClampedArray, minimumAlpha: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < minimumAlpha) continue;
    r += data[index];
    g += data[index + 1];
    b += data[index + 2];
    count += 1;
  }
  return count ? { r: r / count, g: g / count, b: b / count, count } : null;
}

const outputShape = (value: ReturnType<typeof scan>) =>
  value && [value.r, value.g, value.b, value.count];

for (const data of sprites) {
  const totals = buildAlphaPaletteTotals(data);
  for (const threshold of [-1, 0, 63, 90, 120, 149.9, 150, 170, 210, 254, 255, 300]) {
    const expected = outputShape(scan(data, threshold));
    const minimum = minimumPaletteAlpha(threshold);
    deepStrictEqual(outputShape(scanAtMinimumAlpha(data, minimum)), expected);
    deepStrictEqual(outputShape(averageOpaqueColorAtThreshold(totals, minimum)), expected);
  }
}

function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (percentile: number) => Number(sorted[Math.ceil(percentile * sorted.length) - 1].toFixed(4));
  return { medianMs: at(0.5), p95Ms: at(0.95) };
}

let checksum = 0;
function time(run: () => number) {
  const start = performance.now();
  const current = run();
  const duration = performance.now() - start;
  checksum += current;
  return duration;
}

function measure(repeated: () => number, totals: () => number) {
  for (let iteration = 0; iteration < warmups; iteration += 1) {
    deepStrictEqual(repeated(), totals());
  }
  const oldTimes: number[] = [];
  const newTimes: number[] = [];
  for (let iteration = 0; iteration < samples; iteration += 1) {
    if (iteration % 2 === 0) {
      oldTimes.push(time(repeated));
      newTimes.push(time(totals));
    } else {
      newTimes.push(time(totals));
      oldTimes.push(time(repeated));
    }
  }
  return { repeatedScan: summary(oldTimes), reusedTotals: summary(newTimes) };
}

const getCount = (value: ReturnType<typeof scan>) => value?.count ?? 0;
function previousThresholds(thresholds: readonly number[]) {
  let total = 0;
  for (const data of sprites) {
    for (const threshold of thresholds) total += getCount(scan(data, threshold));
  }
  return total;
}

const first = 120;
const second = 150;
const later = [170, 90, 210];
const afterFirst = [second, ...later];
const sequence = [first, ...afterFirst];
const firstMinimum = minimumPaletteAlpha(first);
const prebuilt = sprites.map(buildAlphaPaletteTotals);
const firstThreshold = measure(
  () => previousThresholds([first]),
  () => {
    let total = 0;
    for (const data of sprites) total += getCount(scanAtMinimumAlpha(data, firstMinimum));
    return total;
  }
);
const secondDistinctThreshold = measure(
  () => previousThresholds([second]),
  () => {
    let total = 0;
    for (const retainedRaster of sprites) {
      const totals = buildAlphaPaletteTotals(retainedRaster);
      total += getCount(averageOpaqueColorAtThreshold(totals, minimumPaletteAlpha(second)));
    }
    return total;
  }
);
const laterThresholds = measure(
  () => previousThresholds(later),
  () => {
    let total = 0;
    for (const totals of prebuilt) {
      for (const threshold of later) total += getCount(averageOpaqueColorAtThreshold(totals, minimumPaletteAlpha(threshold)));
    }
    return total;
  }
);
const fiveFromCold = measure(
  () => previousThresholds(sequence),
  () => {
    let total = 0;
    for (const data of sprites) {
      total += getCount(scanAtMinimumAlpha(data, firstMinimum));
      const totals = buildAlphaPaletteTotals(data);
      for (const threshold of afterFirst) {
        total += getCount(averageOpaqueColorAtThreshold(totals, minimumPaletteAlpha(threshold)));
      }
    }
    return total;
  }
);

console.log(JSON.stringify({
  node: process.version,
  count,
  dimensions,
  rasterBytes,
  thresholds: sequence,
  samples,
  warmups,
  parity: 'identical first-scan/bucket RGB means and opaque sample counts across 12 thresholds on every sprite',
  modeledAtlasReadbacks: {
    firstThreshold: { previous: count, reused: count },
    secondDistinctThreshold: { previous: count, reused: 0 },
    threeNewThresholdsAfterBucketsBuilt: { previous: count * later.length, reused: 0 },
    fiveDistinctThresholdsFromCold: { previous: count * sequence.length, reused: count }
  },
  cpuOnly: { firstThreshold, secondDistinctThreshold, laterThresholds, fiveFromCold },
  checksum
}, null, 2));
