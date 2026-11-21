import { expect, it } from 'vitest';
import { averageOpaqueColorAtThreshold, buildAlphaPaletteTotals, minimumPaletteAlpha } from './alphaPaletteStats';

function legacyAverage(data: Uint8ClampedArray, threshold: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] <= threshold) continue;
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
    count += 1;
  }
  return count ? { r: r / count, g: g / count, b: b / count, count } : null;
}

it('matches the original per-pixel scan exactly for every byte boundary and unusual thresholds', () => {
  let seed = 734;
  const data = Uint8ClampedArray.from({ length: 256 * 4 * 3 }, (_, i) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return i % 4 === 3 ? (i >>> 2) % 256 : seed >>> 24;
  });
  const totals = buildAlphaPaletteTotals(data);
  const thresholds = [
    ...Array.from({ length: 256 }, (_, i) => i),
    ...Array.from({ length: 257 }, (_, i) => i - 0.5),
    -Infinity, Infinity, -1000, 1000, -0, Number.NaN
  ];
  for (const threshold of thresholds) {
    expect(averageOpaqueColorAtThreshold(totals, minimumPaletteAlpha(threshold))).toEqual(legacyAverage(data, threshold));
  }
});

it('handles sparse, transparent, opaque, and empty pixels without special-case color shifts', () => {
  const fixtures = [
    new Uint8ClampedArray(0),
    Uint8ClampedArray.of(255, 7, 99, 0, 32, 5, 245, 0),
    Uint8ClampedArray.of(255, 7, 99, 255, 32, 5, 245, 255),
    Uint8ClampedArray.of(255, 7, 99, 4, 32, 5, 245, 201)
  ];
  for (const data of fixtures) {
    const totals = buildAlphaPaletteTotals(data);
    for (const threshold of [-1, 0, 4, 200, 255, Number.NaN]) {
      expect(averageOpaqueColorAtThreshold(totals, minimumPaletteAlpha(threshold))).toEqual(legacyAverage(data, threshold));
    }
  }
});
