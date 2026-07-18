import { describe, expect, it } from 'vitest';
import { makePartOption } from '../../../test/roleFixtures';
import { buildDecoDraft, chooseSourceIds, proposeCandidate, sourceChoiceScores } from './candidateSearch';
import { DEFAULT_AUTO_CREATE_TWROLE_SETTINGS } from './contracts';
import { AutoCreateDiagnosticsCollector } from './diagnostics';
import { ExperienceMemory } from './experienceMemory';
import type { SourceTile, TransformedImage, Vec3 } from './internalTypes';
import { SeededRandom } from './numericCore';
import type { VariantCache } from './variantCache';

function source(
  idx: number,
  meanRgb: Vec3 = [100, 100, 100],
  stdRgb: Vec3 = [0, 0, 0],
  alphaRatio = 1
): SourceTile {
  const option = makePartOption(`source-${idx}`);
  return {
    idx,
    option,
    code: option.code,
    assetId: option.id,
    label: option.label,
    canvas: {} as HTMLCanvasElement,
    origW: 20,
    origH: 10,
    thumbW: 20,
    thumbH: 10,
    sFactor: 1,
    localCenterX: 0,
    localCenterY: 0,
    meanRgb,
    stdRgb,
    alphaRatio,
    alphaSum: 255
  };
}

describe('auto-create candidate search', () => {
  it('keeps source index order when top-k scores tie', () => {
    const sources = Array.from({ length: 6 }, (_, index) => source(index));
    const memory = new ExperienceMemory('', sources, true);

    expect(chooseSourceIds(
      sources,
      [100, 100, 100],
      memory,
      new SeededRandom(123),
      DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      undefined,
      3,
      0,
      [0.5, 0.9, 0.9, 0.1, 0.9, 0.8]
    )).toEqual([1, 2, 4]);
  });

  it('clamps top-k and handles an empty source set', () => {
    const sources = [source(0), source(1), source(2)];
    const memory = new ExperienceMemory('', sources, true);

    expect(chooseSourceIds(
      sources,
      [0, 0, 0],
      memory,
      new SeededRandom(1),
      DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      undefined,
      99,
      0,
      [2, 1, 3]
    )).toEqual([2, 0, 1]);
    expect(chooseSourceIds(
      [],
      [0, 0, 0],
      new ExperienceMemory('', [], true),
      new SeededRandom(1),
      DEFAULT_AUTO_CREATE_TWROLE_SETTINGS
    )).toEqual([]);
  });

  it('prefers matching mean color and, for complex targets, matching color variation', () => {
    const sources = [
      source(0, [98, 102, 101], [60, 60, 60]),
      source(1, [220, 30, 20], [60, 60, 60]),
      source(2, [98, 102, 101], [2, 2, 2])
    ];
    const memory = new ExperienceMemory('', sources, true);
    const settings = {
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      gradientStdWeight: 1
    };

    const flatScores = sourceChoiceScores(sources, [100, 100, 100], memory, settings);
    expect(flatScores[0]).toBeGreaterThan(flatScores[1]);

    const gradientScores = sourceChoiceScores(sources, [100, 100, 100], memory, settings, [60, 60, 60]);
    expect(gradientScores[0]).toBeGreaterThan(gradientScores[2]);
  });

  it('maps raster centers to role coordinates while preserving legacy radians', () => {
    const tile = source(0);
    tile.sFactor = 0.5;
    tile.localCenterX = 2;
    tile.localCenterY = -1;

    const draft = buildDecoDraft(tile, 60, 40, 2, 1, 90, 100, 80);

    expect(draft).toMatchObject({
      code: 'source-0',
      assetId: 'source-0',
      x: 9.5,
      y: -2,
      scaleX: 1,
      scaleY: 0.5,
      rotation: 90,
      legacy: {
        c: 'source-0',
        x: 9.5,
        y: -2,
        sx: 1,
        sy: 0.5,
        r: 1.570796
      }
    });
  });

  it('reuses a supplied Candidate and only counts real object allocations', () => {
    const tile = source(0);
    const transformed: TransformedImage = {
      width: 10,
      height: 5,
      data: new Uint8ClampedArray(10 * 5 * 4),
      alphaBounds: [0, 0, 10, 5],
      alphaRowStart: new Int32Array(5),
      alphaRowEnd: new Int32Array(5),
      alphaSum: 255
    };
    const cache = { get: () => transformed } as unknown as VariantCache;
    const diagnostics = new AutoCreateDiagnosticsCollector();
    const settings = {
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      rotationProb: 0,
      flipProb: 0
    };
    const first = proposeCandidate(
      [tile], 0, 100, 100, 200, 200, 0.5,
      new SeededRandom(123), cache, settings,
      { desiredPx: 10, maxRenderedPx: 20 }, diagnostics
    );
    expect(first).not.toBeNull();

    const second = proposeCandidate(
      [tile], 0, 100, 100, 200, 200, 0.5,
      new SeededRandom(456), cache, settings,
      { desiredPx: 10, maxRenderedPx: 20 }, diagnostics, first
    );

    expect(second).toBe(first);
    expect(diagnostics.snapshot().counters.candidateObjectsAllocated).toBe(1);
  });

  it('can reject a strict geometry score bound before rasterization', () => {
    const diagnostics = new AutoCreateDiagnosticsCollector();
    let rasterCalls = 0;
    const cache = {
      get: () => {
        rasterCalls += 1;
        throw new Error('geometry rejection must happen before rasterization');
      }
    } as unknown as VariantCache;

    const candidate = proposeCandidate(
      [source(0)],
      0,
      100,
      100,
      200,
      200,
      0.5,
      new SeededRandom(123),
      cache,
      { ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS, rotationProb: 0, flipProb: 0 },
      { desiredPx: 10, maxRenderedPx: 20, acceptGeometry: () => false },
      diagnostics
    );

    expect(candidate).toBeNull();
    expect(rasterCalls).toBe(0);
    expect(diagnostics.snapshot().counters.candidatesGeometryScoreRejected).toBe(1);
  });
});
