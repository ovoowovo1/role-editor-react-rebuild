import { describe, expect, it, vi } from 'vitest';
import { makePartOption } from '../../../test/roleFixtures';
import { proposeCandidate } from './candidateSearch';
import { DEFAULT_AUTO_CREATE_TWROLE_SETTINGS } from './contracts';
import { AutoCreateDiagnosticsCollector } from './diagnostics';
import type { SourceTile, TransformedImage } from './internalTypes';
import type { SeededRandom } from './numericCore';
import type { VariantCache } from './variantCache';
import { variantGeometry } from './variantCache';

function rectangularSource(): SourceTile {
  const option = makePartOption('wide-source');
  return {
    idx: 0,
    option,
    code: option.code,
    assetId: option.id,
    label: option.label,
    canvas: {} as OffscreenCanvas,
    origW: 16,
    origH: 8,
    thumbW: 16,
    thumbH: 8,
    sFactor: 1,
    localCenterX: 0,
    localCenterY: 0,
    meanRgb: [128, 128, 128],
    stdRgb: [0, 0, 0],
    alphaRatio: 1,
    alphaSum: 16 * 8 * 255
  };
}

describe('auto-create candidate geometry rejection', () => {
  it('rejects a grossly oversized rotation before rasterizing it', () => {
    const source = rectangularSource();
    const get = vi.fn();
    const cache = { get } as unknown as VariantCache;
    const diagnostics = new AutoCreateDiagnosticsCollector();
    const next = vi.fn()
      .mockReturnValueOnce(1) // horizontal flip
      .mockReturnValueOnce(1) // vertical flip
      .mockReturnValueOnce(0) // take the rotation branch
      .mockReturnValueOnce(0); // take a discrete rotation
    const rng = {
      normal: vi.fn(() => 0),
      next,
      choice: vi.fn(() => 45)
    } as unknown as SeededRandom;

    // Transparent rotation padding may cross the canvas, but a 34x34 raster is
    // beyond the proposal safety limit for a 16x16 target and cannot be useful.
    expect(variantGeometry(source, 1, 1, 0)).toMatchObject({ width: 16, height: 8 });
    expect(variantGeometry(source, 1, 1, 45)).toMatchObject({ width: 17, height: 17 });

    const candidate = proposeCandidate(
      [source],
      0,
      8,
      8,
      16,
      16,
      0,
      rng,
      cache,
      DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      {
        desiredPx: 32,
        maxRenderedPx: 32,
        rotationProb: 1,
        flipProb: 0,
        centerJitterPx: 0
      },
      diagnostics
    );

    expect(candidate).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(diagnostics.snapshot().counters).toMatchObject({
      candidatesProposed: 1,
      candidatesGeometryRejected: 1,
      candidateObjectsAllocated: 0,
      variantCacheMisses: 0
    });
  });

  it('defers a small full-raster overflow until visible alpha containment is known', () => {
    const source = rectangularSource();
    const transformed: TransformedImage = {
      width: 17,
      height: 17,
      data: new Uint8ClampedArray(17 * 17 * 4),
      alphaBounds: [1, 1, 16, 16],
      alphaRowStart: new Int32Array(17),
      alphaRowEnd: new Int32Array(17),
      alphaSum: 255
    };
    const get = vi.fn(() => transformed);
    const cache = { get } as unknown as VariantCache;
    const next = vi.fn()
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);
    const rng = {
      normal: vi.fn(() => 0),
      next,
      choice: vi.fn(() => 45)
    } as unknown as SeededRandom;

    const candidate = proposeCandidate(
      [source],
      0,
      8,
      8,
      16,
      16,
      0,
      rng,
      cache,
      DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      {
        desiredPx: 16,
        maxRenderedPx: 16,
        rotationProb: 1,
        flipProb: 0,
        centerJitterPx: 0
      }
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.bbox[2]).toBeGreaterThan(16);
    expect(candidate?.bbox[3]).toBeGreaterThan(16);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
