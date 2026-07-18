import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDecorationLayer, makePartOption } from '../../../test/roleFixtures';
import { ColorLearningCollage, replacePartialSseCannotBeat } from './collageEngine';
import {
  ALPHA_MSE_WEIGHT,
  AUTO_CREATE_SNAPSHOT_VERSION,
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  INV_255,
  autoCreateSnapshotSettingsSignature,
  type AutoCreateTwroleSettings,
  type AutoCreateTwroleSnapshot
} from './contracts';
import { AutoCreateDiagnosticsCollector } from './diagnostics';
import type { Candidate, SourceTile, TileRecord, TransformedImage } from './internalTypes';
import { SeededRandom, TileSpatialIndex } from './numericCore';

const { proposeCandidateMock } = vi.hoisted(() => ({
  proposeCandidateMock: vi.fn()
}));

vi.mock('./candidateSearch', async (importOriginal) => {
  const original = await importOriginal<typeof import('./candidateSearch')>();
  return {
    ...original,
    proposeCandidate: proposeCandidateMock
  };
});

interface EngineInternals {
  tiles: TileRecord[];
  activeTileCount: number;
  canvas: Float32Array;
  spatialIndex: TileSpatialIndex;
}

function source(): SourceTile {
  const option = makePartOption('red-source');
  return {
    idx: 0,
    option,
    code: option.code,
    assetId: option.id,
    label: option.label,
    canvas: {} as OffscreenCanvas,
    origW: 1,
    origH: 1,
    thumbW: 1,
    thumbH: 1,
    sFactor: 1,
    localCenterX: 0,
    localCenterY: 0,
    meanRgb: [255, 0, 0],
    stdRgb: [0, 0, 0],
    alphaRatio: 1,
    alphaSum: 255
  };
}

function engine({
  width = 1,
  target = new Uint8ClampedArray(width * 4),
  mask = new Uint8Array(width).fill(1),
  containmentMask = new Uint8Array(width).fill(1),
  settings = {},
  diagnostics = null
}: {
  width?: number;
  target?: Uint8ClampedArray;
  mask?: Uint8Array;
  containmentMask?: Uint8Array;
  settings?: Partial<AutoCreateTwroleSettings>;
  diagnostics?: AutoCreateDiagnosticsCollector | null;
} = {}): ColorLearningCollage {
  if (width === 1 && target.every((value) => value === 0)) target.set([255, 0, 0, 255]);
  return new ColorLearningCollage(
    [source()],
    target,
    new Float32Array(target),
    mask,
    containmentMask,
    width,
    1,
    new SeededRandom(123),
    {
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      colorTopk: 1,
      exploration: 0,
      replaceCandidateBatch: 1,
      replaceMinGainMse: 0,
      resetExperience: true,
      ...settings
    },
    diagnostics
  );
}

function tile(id: string, bbox: TileRecord['bbox'] = [0, 0, 1, 1]): TileRecord {
  return {
    active: true,
    sourceId: 0,
    sxInternal: 1,
    syInternal: 1,
    rDeg: 0,
    bbox,
    centerX: 0.5,
    centerY: 0.5,
    decoration: makeDecorationLayer(id),
    legacy: { c: id, x: 0, y: 0, sx: 1, sy: 1, r: 0 },
    gainMse: 1
  };
}

function canonicalSnapshotTile(
  id: string,
  centerX: number,
  bbox: TileRecord['bbox']
): AutoCreateTwroleSnapshot['tiles'][number] {
  const x = centerX - 1;
  return {
    ...tile(id, bbox),
    centerX,
    decoration: makeDecorationLayer(id, {
      code: 'red-source',
      assetId: 'red-source',
      name: 'red-source',
      x,
      y: 0
    }),
    legacy: { c: 'red-source', x, y: 0, sx: 1, sy: 1, r: 0 }
  };
}

function opaqueRed(): TransformedImage {
  return {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255]),
    alphaBounds: [0, 0, 1, 1],
    alphaRowStart: new Int32Array([0]),
    alphaRowEnd: new Int32Array([1]),
    alphaSum: 255
  };
}

function redCandidate(): Candidate {
  return {
    sourceId: 0,
    sxInternal: 1,
    syInternal: 1,
    rDeg: 0,
    centerX: 0.5,
    centerY: 0.5,
    rgba: opaqueRed(),
    bbox: [0, 0, 1, 1],
    sseBefore: 0,
    sseAfter: 0,
    globalGainMse: 0,
    score: 0
  };
}

function paddedRedCandidate(): Candidate {
  const rgba: TransformedImage = {
    width: 3,
    height: 1,
    data: new Uint8ClampedArray([
      0, 0, 0, 0,
      255, 0, 0, 255,
      0, 0, 0, 0
    ]),
    alphaBounds: [1, 0, 2, 1],
    alphaRowStart: new Int32Array([1]),
    alphaRowEnd: new Int32Array([2]),
    alphaSum: 255
  };
  return {
    sourceId: 0,
    sxInternal: 1,
    syInternal: 1,
    rDeg: 0,
    centerX: 1.5,
    centerY: 0.5,
    rgba,
    bbox: [0, 0, 3, 1],
    sseBefore: 0,
    sseAfter: 0,
    globalGainMse: 0,
    score: 0
  };
}

function snapshot(tiles: AutoCreateTwroleSnapshot['tiles']): AutoCreateTwroleSnapshot {
  return {
    version: AUTO_CREATE_SNAPSHOT_VERSION,
    targetWidth: 2,
    targetHeight: 1,
    sourceWidth: 2,
    sourceHeight: 1,
    sourceCount: 1,
    sourceSignature: 'test',
    settingsSignature: autoCreateSnapshotSettingsSignature(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS),
    experienceState: JSON.stringify({
      version: 1,
      source_stats: { source: { trials: 0, accepted: 0, gain_sum: 0, ema_gain: 0 } },
      color_stats: {}
    }),
    step: 1,
    totalSteps: 2,
    finalPruneStep: 0,
    seed: 123,
    rngState: 123,
    rngSpareNormal: null,
    accepted: tiles.length,
    rejected: 0,
    pruned: 0,
    replaced: 0,
    mse: 0,
    tiles,
    warnings: []
  };
}

describe('auto-create collage ordering and reversible edits', () => {
  beforeEach(() => {
    proposeCandidateMock.mockReset();
  });

  it('does not early-reject a Replace candidate on a rounded threshold alone', () => {
    const beforeSse = 875118345331.6674;
    const denominator = 37247514.30227785;
    const incumbentGain = 4211.650522194938;
    const roundedThreshold = beforeSse - incumbentGain * denominator;

    expect((beforeSse - roundedThreshold) / denominator).toBeGreaterThan(incumbentGain);
    expect(replacePartialSseCannotBeat(
      beforeSse,
      roundedThreshold,
      denominator,
      incumbentGain
    )).toBe(false);
  });

  it('exports editor layers top-first while keeping legacy draw order bottom-first', () => {
    const collage = engine();
    const internals = collage as unknown as EngineInternals;
    internals.tiles.push(tile('bottom'), tile('middle'), tile('top'));

    expect(collage.exportDecorations().map((decoration) => decoration.id)).toEqual([
      'top',
      'middle',
      'bottom'
    ]);
    expect(collage.exportLegacyDeco().map((decoration) => decoration.c)).toEqual([
      'bottom',
      'middle',
      'top'
    ]);
  });

  it('prunes an invalid out-of-bounds tile and updates active counts', () => {
    const collage = engine();
    const internals = collage as unknown as EngineInternals;
    const invalid = tile('invalid', [2, 2, 3, 3]);
    internals.tiles.push(invalid);
    internals.activeTileCount = 1;
    internals.spatialIndex.update(0, invalid.bbox);

    expect(collage.tryPruneOnce()).toBe(true);
    expect(invalid.active).toBe(false);
    expect(collage.activeCount()).toBe(0);
    expect(collage.pruned).toBe(1);
    expect(collage.tryPruneOnce()).toBe(false);
  });

  it('replaces a tile only when the candidate improves the masked error', () => {
    proposeCandidateMock.mockImplementation(() => redCandidate());
    const collage = engine();
    const internals = collage as unknown as EngineInternals;
    const old = tile('blue-old');
    internals.tiles.push(old);
    internals.activeTileCount = 1;
    internals.canvas.set([0, 0, 255, 255]);
    internals.spatialIndex.update(0, old.bbox);

    expect(collage.tryReplaceOnce(1, 1)).toBe(true);
    expect(proposeCandidateMock).toHaveBeenCalledTimes(1);
    expect(collage.activeCount()).toBe(1);
    expect(collage.replaced).toBe(1);
    expect(collage.currentMse()).toBe(0);
    expect(collage.exportDecorations()).toHaveLength(1);
    expect(collage.exportDecorations()[0]).toMatchObject({
      code: 'red-source',
      assetId: 'red-source'
    });
  });

  it('keeps Replace tie order and stops partial SSE at the incumbent', () => {
    const first = redCandidate();
    const secondRgba: TransformedImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        255, 0, 0, 255
      ]),
      alphaBounds: [0, 0, 2, 1],
      alphaRowStart: new Int32Array([0]),
      alphaRowEnd: new Int32Array([2]),
      alphaSum: 510
    };
    const second: Candidate = {
      ...redCandidate(),
      centerX: 1,
      rgba: secondRgba,
      bbox: [0, 0, 2, 1]
    };
    proposeCandidateMock
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(() => second);
    const diagnostics = new AutoCreateDiagnosticsCollector();
    const target = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255
    ]);
    const collage = engine({
      width: 2,
      target,
      mask: new Uint8Array([1, 0]),
      settings: { replaceCandidateBatch: 2 },
      diagnostics
    });
    const internals = collage as unknown as EngineInternals;
    const old = tile('blue-old');
    internals.tiles.push(old);
    internals.activeTileCount = 1;
    internals.canvas.set([0, 0, 255, 255]);
    internals.spatialIndex.update(0, old.bbox);

    expect(collage.tryReplaceOnce(1, 1)).toBe(true);
    expect(collage.exportDecorations()[0].x).toBe(-0.5);
    expect(diagnostics.snapshot().counters.replaceAfterSseEarlyRejected).toBe(1);
  });

  it('compares Replace candidates by global gain when their unions differ', () => {
    const first = redCandidate();
    const secondRgba: TransformedImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        255, 0, 0, 255
      ]),
      alphaBounds: [0, 0, 2, 1],
      alphaRowStart: new Int32Array([0]),
      alphaRowEnd: new Int32Array([2]),
      alphaSum: 510
    };
    const second: Candidate = {
      ...redCandidate(),
      centerX: 1,
      rgba: secondRgba,
      bbox: [0, 0, 2, 1]
    };
    proposeCandidateMock
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(() => second);
    const target = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255
    ]);
    const collage = engine({
      width: 2,
      target,
      settings: { replaceCandidateBatch: 2 }
    });
    const internals = collage as unknown as EngineInternals;
    const old = tile('blue-old');
    internals.tiles.push(old);
    internals.activeTileCount = 1;
    internals.canvas.set([0, 0, 255, 255]);
    internals.spatialIndex.update(0, old.bbox);

    expect(collage.tryReplaceOnce(1, 1)).toBe(true);
    expect(collage.exportDecorations()[0].x).toBe(0);
  });

  it('rejects an Add candidate when one visible source pixel is outside containment', () => {
    proposeCandidateMock.mockImplementation(() => redCandidate());
    const collage = engine({ containmentMask: new Uint8Array([0]) });

    expect(collage.tryAdd(1, 1)).toBe(false);
    expect(collage.activeCount()).toBe(0);
    expect(collage.rejected).toBe(1);
  });

  it('accepts an Add candidate whose transparent padding crosses the target silhouette', () => {
    proposeCandidateMock.mockImplementation(() => paddedRedCandidate());
    const target = new Uint8ClampedArray([
      0, 0, 0, 0,
      255, 0, 0, 255,
      0, 0, 0, 0
    ]);
    const collage = engine({
      width: 3,
      target,
      mask: new Uint8Array([0, 1, 0]),
      containmentMask: new Uint8Array([0, 1, 0])
    });

    expect(collage.tryAdd(1, 1)).toBe(true);
    expect(collage.activeCount()).toBe(1);
  });

  it('accepts transparent full-raster padding outside the canvas', () => {
    const candidate = paddedRedCandidate();
    candidate.centerX = 0.5;
    candidate.bbox = [-1, 0, 2, 1];
    proposeCandidateMock.mockImplementation(() => candidate);
    const collage = engine();

    expect(collage.tryAdd(1, 1)).toBe(true);
    expect(collage.activeCount()).toBe(1);
    expect(collage.currentMse()).toBe(0);
  });

  it('keeps the earliest candidate when optimized evaluation scores tie', () => {
    const first = redCandidate();
    const second = redCandidate();
    second.centerX = 1.5;
    second.bbox = [1, 0, 2, 1];
    proposeCandidateMock
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(() => second);
    const target = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255
    ]);
    const collage = engine({
      width: 2,
      target,
      settings: { candidateBatch: 2, tilePenaltyMse: 0 }
    });

    expect(collage.tryAdd(1, 1)).toBe(true);
    expect(collage.exportDecorations()[0].x).toBe(-0.5);
  });

  it('stops after-SSE once a candidate cannot beat the incumbent', () => {
    const first = redCandidate();
    const blueRgba: TransformedImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 255, 255,
        0, 0, 255, 255
      ]),
      alphaBounds: [0, 0, 2, 1],
      alphaRowStart: new Int32Array([0]),
      alphaRowEnd: new Int32Array([2]),
      alphaSum: 510
    };
    const second: Candidate = {
      ...redCandidate(),
      centerX: 1,
      rgba: blueRgba,
      bbox: [0, 0, 2, 1]
    };
    proposeCandidateMock
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(() => second);
    const diagnostics = new AutoCreateDiagnosticsCollector();
    const target = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255
    ]);
    const collage = engine({
      width: 2,
      target,
      settings: { candidateBatch: 2, tilePenaltyMse: 0 },
      diagnostics
    });

    expect(collage.tryAdd(1, 1)).toBe(true);
    expect(diagnostics.snapshot().counters.candidateAfterSseEarlyRejected).toBe(1);
  });

  it('matches a scalar alpha/SSE reference for semi-transparent source pixels', () => {
    const target = new Uint8ClampedArray([
      80, 20, 10, 128,
      1, 2, 3, 4,
      0, 200, 0, 255
    ]);
    const rgba: TransformedImage = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        200, 40, 20, 128,
        0, 0, 0, 0,
        0, 220, 0, 255
      ]),
      alphaBounds: [0, 0, 3, 1],
      alphaRowStart: new Int32Array([0]),
      alphaRowEnd: new Int32Array([3]),
      alphaSum: 383
    };
    const candidate: Candidate = {
      ...redCandidate(),
      centerX: 1.5,
      rgba,
      bbox: [0, 0, 3, 1]
    };
    const collage = engine({
      width: 3,
      target,
      mask: new Uint8Array([1, 0, 1]),
      containmentMask: new Uint8Array([1, 1, 1]),
      settings: { tilePenaltyMse: 0.25 }
    });

    let expectedBefore = 0;
    let expectedAfter = 0;
    for (const x of [0, 2]) {
      const offset = x * 4;
      const alphaByte = rgba.data[offset + 3];
      const beforeR = 0;
      const beforeG = 0;
      const beforeB = 0;
      const beforeA = 0;
      const dr = beforeR - target[offset];
      const dg = beforeG - target[offset + 1];
      const db = beforeB - target[offset + 2];
      const da = beforeA - target[offset + 3];
      expectedBefore += dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;
      const srcA = alphaByte * INV_255;
      const afterR = alphaByte === 255 ? rgba.data[offset] : rgba.data[offset] * srcA;
      const afterG = alphaByte === 255 ? rgba.data[offset + 1] : rgba.data[offset + 1] * srcA;
      const afterB = alphaByte === 255 ? rgba.data[offset + 2] : rgba.data[offset + 2] * srcA;
      const afterA = alphaByte;
      const ar = afterR - target[offset];
      const ag = afterG - target[offset + 1];
      const ab = afterB - target[offset + 2];
      const aa = afterA - target[offset + 3];
      expectedAfter += ar * ar + ag * ag + ab * ab + ALPHA_MSE_WEIGHT * aa * aa;
    }

    const evaluated = (collage as unknown as {
      evaluateCandidateCore: (value: Candidate, incumbent: number) => Candidate | null;
    }).evaluateCandidateCore(candidate, Number.NEGATIVE_INFINITY);
    const globalDen = 2 * (3 + ALPHA_MSE_WEIGHT);
    expect(evaluated).not.toBeNull();
    expect(evaluated?.sseBefore).toBeCloseTo(expectedBefore, 10);
    expect(evaluated?.sseAfter).toBeCloseTo(expectedAfter, 10);
    expect(evaluated?.globalGainMse).toBeCloseTo((expectedBefore - expectedAfter) / globalDen, 10);
    expect(evaluated?.score).toBeCloseTo((expectedBefore - expectedAfter) / globalDen - 0.25, 10);
  });

  it('does not let Replace bypass the containment mask', () => {
    const outside = redCandidate();
    outside.centerX = 1.5;
    outside.bbox = [1, 0, 2, 1];
    proposeCandidateMock.mockImplementation(() => outside);
    const target = new Uint8ClampedArray([
      0, 0, 255, 255,
      255, 0, 0, 255
    ]);
    const collage = engine({
      width: 2,
      target,
      containmentMask: new Uint8Array([1, 0])
    });
    const internals = collage as unknown as EngineInternals;
    const old = tile('blue-old');
    internals.tiles.push(old);
    internals.activeTileCount = 1;
    internals.canvas.set([0, 0, 255, 255], 0);
    internals.spatialIndex.update(0, old.bbox);

    expect(collage.tryReplaceOnce(1, 1)).toBe(false);
    expect(collage.replaced).toBe(0);
    expect(collage.exportDecorations()[0].id).toBe('blue-old');
  });

  it('restores a checkpoint transactionally and rejects the whole snapshot when one tile escapes containment', () => {
    const collage = engine({ width: 2, containmentMask: new Uint8Array([1, 0]) });
    const internals = collage as unknown as EngineInternals & {
      cache: { get: () => TransformedImage };
    };
    internals.cache.get = vi.fn(() => opaqueRed());
    const valid = canonicalSnapshotTile('valid', 0.5, [0, 0, 1, 1]);
    const invalid = canonicalSnapshotTile('invalid', 1.5, [1, 0, 2, 1]);

    expect(collage.restoreFromSnapshot(snapshot([valid, invalid]))).toBe(false);
    expect(collage.activeCount()).toBe(0);
    expect(collage.exportDecorations()).toEqual([]);
  });

  it('restores canonical v3 output but rejects a decoration transform that disagrees with its raster', () => {
    const valid = canonicalSnapshotTile('valid', 0.5, [0, 0, 1, 1]);
    const restored = engine({ width: 2 });
    (restored as unknown as EngineInternals & { cache: { get: () => TransformedImage } }).cache.get = vi.fn(() => opaqueRed());

    expect(restored.restoreFromSnapshot(snapshot([valid]))).toBe(true);
    expect(restored.activeCount()).toBe(1);

    const corrupted = engine({ width: 2 });
    (corrupted as unknown as EngineInternals & { cache: { get: () => TransformedImage } }).cache.get = vi.fn(() => opaqueRed());
    const mismatched = canonicalSnapshotTile('mismatched', 0.5, [0, 0, 1, 1]);
    mismatched.decoration.scaleX = 2;

    expect(corrupted.restoreFromSnapshot(snapshot([mismatched]))).toBe(false);
    expect(corrupted.activeCount()).toBe(0);
  });

  it('restores a canonical tile whose transparent raster padding crosses the canvas', () => {
    const collage = engine();
    const padded = paddedRedCandidate().rgba;
    (collage as unknown as EngineInternals & { cache: { get: () => TransformedImage } }).cache.get = vi.fn(() => padded);
    const restoredTile = canonicalSnapshotTile('padded', 0.5, [-1, 0, 2, 1]);
    restoredTile.decoration.x = 0;
    restoredTile.legacy.x = 0;

    expect(collage.restoreFromSnapshot(snapshot([restoredTile]))).toBe(true);
    expect(collage.activeCount()).toBe(1);
    expect(collage.currentMse()).toBe(0);
  });

  it('rejects malformed v3 tile data without partially mutating or throwing', () => {
    const collage = engine({ width: 2 });
    const malformed = snapshot([]);
    malformed.tiles = [null as unknown as AutoCreateTwroleSnapshot['tiles'][number]];

    expect(() => collage.restoreFromSnapshot(malformed)).not.toThrow();
    expect(collage.restoreFromSnapshot(malformed)).toBe(false);
    expect(collage.activeCount()).toBe(0);
  });

  it('checks containment again at commit time', () => {
    const collage = engine({ containmentMask: new Uint8Array([0]) });
    const commit = (collage as unknown as { acceptCandidate: (candidate: Candidate) => void }).acceptCandidate.bind(collage);

    expect(() => commit(redCandidate())).toThrow(/containment mask/i);
    expect(collage.activeCount()).toBe(0);
  });
});
