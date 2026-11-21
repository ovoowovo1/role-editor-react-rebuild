const CHANNELS = 4;
const ALPHA_LEVELS = 256;

interface OpaqueColorAverage {
  r: number;
  g: number;
  b: number;
  count: number;
}

/** Original predicate is !(byteAlpha <= threshold), including for NaN. */
export function minimumPaletteAlpha(threshold: number): number {
  const next = Math.floor(threshold) + 1;
  return Number.isNaN(next) ? 0 : Math.min(ALPHA_LEVELS, Math.max(0, next));
}

/**
 * Build suffix totals for exact byte alpha thresholds. Canvas returns integer
 * color bytes and Float64 sums are exact for any realizable raster size.
 */
export function buildAlphaPaletteTotals(data: Uint8ClampedArray): Float64Array {
  const totals = new Float64Array(ALPHA_LEVELS * CHANNELS);
  for (let offset = 0; offset < data.length; offset += CHANNELS) {
    const bin = data[offset + 3] * CHANNELS;
    totals[bin] += data[offset];
    totals[bin + 1] += data[offset + 1];
    totals[bin + 2] += data[offset + 2];
    totals[bin + 3] += 1;
  }
  for (let bin = totals.length - CHANNELS - 1; bin >= 0; bin -= 1) {
    totals[bin] += totals[bin + CHANNELS];
  }
  return totals;
}

export function averageOpaqueColorAtThreshold(
  totals: Float64Array,
  minimumAlpha: number
): OpaqueColorAverage | null {
  if (minimumAlpha === ALPHA_LEVELS) return null;
  const bin = minimumAlpha * CHANNELS;
  const count = totals[bin + 3];
  if (!count) return null;
  return {
    r: totals[bin] / count,
    g: totals[bin + 1] / count,
    b: totals[bin + 2] / count,
    count
  };
}
