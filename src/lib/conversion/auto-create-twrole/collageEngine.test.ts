import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDecorationLayer, makePartOption } from '../../../test/roleFixtures';
import {
  ColorLearningCollage,
  candidateUpperBoundCannotBeat,
  remainingUpperBoundsCannotBeat,
  replacePartialSseCannotBeat,
  type AutoCreateLearningRunIdentity
} from './collageEngine';
import {
  ALPHA_MSE_WEIGHT,
  AUTO_CREATE_SNAPSHOT_VERSION,
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  INV_255,
  autoCreateSnapshotSettingsSignature,
  type AutoCreateRankerRunInfo,
  type AutoCreateTwroleSettings,
  type AutoCreateTwroleSnapshot
} from './contracts';
import type { CandidateDescriptor } from './candidateSearch';
import { AutoCreateDiagnosticsCollector } from './diagnostics';
import type { Candidate, SourceTile, TileRecord, TransformedImage } from './internalTypes';
import type { DenseRankerPredictor } from './learning/denseRanker';
import { FEATURE_NAMES } from './learning/featureSchema';
import { SeededRandom, TileSpatialIndex } from './numericCore';

const {
  proposeCandidateMock,
  proposeCandidateDescriptorMock,
  materializeCandidateMock
} = vi.hoisted(() => ({
  proposeCandidateMock: vi.fn(),
  proposeCandidateDescriptorMock: vi.fn(),
  materializeCandidateMock: vi.fn()
}));

vi.mock('./candidateSearch', async (importOriginal) => {
  const original = await importOriginal<typeof import('./candidateSearch')>();
  return {
    ...original,
    proposeCandidate: proposeCandidateMock,
    proposeCandidateDescriptor: (...args: Parameters<typeof original.proposeCandidateDescriptor>) =>
      proposeCandidateDescriptorMock.getMockImplementation()
        ? proposeCandidateDescriptorMock(...args)
        : original.proposeCandidateDescriptor(...args),
    materializeCandidate: (...args: Parameters<typeof original.materializeCandidate>) =>
      materializeCandidateMock.getMockImplementation()
        ? materializeCandidateMock(...args)
        : original.materializeCandidate(...args)
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
  diagnostics = null,
  rankerInfo,
  ranker = null,
  learningIdentity = null,
  decorationRunHash = null
}: {
  width?: number;
  target?: Uint8ClampedArray;
  mask?: Uint8Array;
  containmentMask?: Uint8Array;
  settings?: Partial<AutoCreateTwroleSettings>;
  diagnostics?: AutoCreateDiagnosticsCollector | null;
  rankerInfo?: AutoCreateRankerRunInfo;
  ranker?: DenseRankerPredictor | null;
  learningIdentity?: AutoCreateLearningRunIdentity | null;
  decorationRunHash?: string | null;
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
    diagnostics,
    rankerInfo,
    ranker,
    learningIdentity,
    decorationRunHash
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

function opaqueRedLevelCandidate(red: number, x = 0, alpha = 255): Candidate {
  const clamped = Math.max(0, Math.min(255, Math.round(red)));
  const clampedAlpha = Math.max(1, Math.min(255, Math.round(alpha)));
  return {
    ...redCandidate(),
    centerX: x + 0.5,
    rgba: {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([clamped, 0, 0, clampedAlpha]),
      alphaBounds: [0, 0, 1, 1],
      alphaRowStart: new Int32Array([0]),
      alphaRowEnd: new Int32Array([1]),
      alphaSum: clampedAlpha
    },
    bbox: [x, 0, x + 1, 1]
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

function descriptor(
  proposalIndex: number,
  cheapUpperBound = 1,
  bbox: CandidateDescriptor['bbox'] = [0, 0, 1, 1]
): CandidateDescriptor {
  return {
    sourceIndex: 0,
    sourceId: 0,
    sxInternal: 1,
    syInternal: 1,
    rDeg: 0,
    centerX: (bbox[0] + bbox[2]) / 2,
    centerY: (bbox[1] + bbox[3]) / 2,
    bbox,
    proposalIndex,
    cheapUpperBound,
    exploration: false,
    cacheVariant: true
  };
}

function readyRankerInfo(modelRevision = 'model-rev'): AutoCreateRankerRunInfo {
  return {
    requestedStrategy: 'strict-ml-typed',
    effectiveStrategy: 'strict-ml-typed',
    status: 'ready',
    runtime: 'typed',
    learningScope: 'test',
    featureSchema: 'auto-create-numeric-v1',
    rankingPolicy: 'strict-cascade-v1',
    modelRevision
  };
}

function snapshot(tiles: AutoCreateTwroleSnapshot['tiles']): AutoCreateTwroleSnapshot {
  const redPixels = tiles.length;
  const errorSse = redPixels * 2 * 255 * 255;
  return {
    version: AUTO_CREATE_SNAPSHOT_VERSION,
    targetWidth: 2,
    targetHeight: 1,
    sourceWidth: 2,
    sourceHeight: 1,
    sourceCount: 1,
    sourceSignature: 'test',
    targetSignature: 'test-target',
    settingsSignature: autoCreateSnapshotSettingsSignature(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS),
    learningScope: 'test',
    learningRunHash: 'test-run',
    rankerRevision: null,
    rankerFeatureSchema: 'auto-create-numeric-v1',
    rankingPolicySignature: 'strict-cascade-v1',
    experienceState: JSON.stringify({
      version: 1,
      source_stats: { source: { trials: 0, accepted: 0, gain_sum: 0, ema_gain: 0 } },
      color_stats: {}
    }),
    rankingState: {
      maskedPixelCount: 2,
      canvasSum: [redPixels * 255, 0, 0],
      residualSum: [-redPixels * 255, 0, 0],
      residualSquared: [redPixels * 255 * 255, 0, 0]
    },
    errorFieldState: {
      version: 1,
      cellSize: 16,
      gridWidth: 1,
      gridHeight: 1,
      totalSse: errorSse,
      focusSse: errorSse,
      cellWeights: [errorSse]
    },
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
    proposeCandidateDescriptorMock.mockReset();
    materializeCandidateMock.mockReset();
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

  it('preserves smaller proposal-index ties when applying strict upper bounds', () => {
    expect(candidateUpperBoundCannotBeat(10, 3, 10, 7)).toBe(false);
    expect(candidateUpperBoundCannotBeat(10, 7, 10, 7)).toBe(true);
    expect(candidateUpperBoundCannotBeat(9.999, 1, 10, 7)).toBe(true);
    expect(remainingUpperBoundsCannotBeat(
      [descriptor(9, 10), descriptor(3, 10)],
      0,
      10,
      7
    )).toBe(false);
    expect(remainingUpperBoundsCannotBeat(
      [descriptor(9, 10), descriptor(8, 9)],
      0,
      10,
      7
    )).toBe(true);
  });

  it('freezes a failed live ranker to legacy in subsequent snapshots', () => {
    const rankerInfo = readyRankerInfo('revision-before-failure');
    const ranker: DenseRankerPredictor = {
      revision: 'revision-before-failure',
      runtime: 'typed',
      predict: () => {
        throw new Error('broken inference');
      }
    };
    const collage = engine({
      settings: { candidateBatch: 1 },
      rankerInfo,
      ranker,
      learningIdentity: { runHash: 'stable-run', targetSignature: 'target' }
    });
    const ranked = (collage as unknown as {
      rankCandidateDescriptors: (
        values: CandidateDescriptor[],
        mode: 'add',
        target: { color: [number, number, number]; std: [number, number, number]; complexity: number },
        progress: number
      ) => CandidateDescriptor[];
    }).rankCandidateDescriptors(
      [descriptor(0), descriptor(1)],
      'add',
      { color: [255, 0, 0], std: [0, 0, 0], complexity: 0 },
      0
    );

    expect(ranked.map((value) => value.proposalIndex)).toEqual([0]);
    expect(rankerInfo).toMatchObject({
      effectiveStrategy: 'legacy',
      status: 'fallback',
      runtime: 'none',
      modelRevision: null,
      fallbackReason: 'inference-failed:broken inference'
    });
    expect(collage.createSnapshot(
      0,
      1,
      0,
      123,
      { width: 1, height: 1, sourceWidth: 1, sourceHeight: 1 },
      'target',
      []
    )).toMatchObject({
      learningRunHash: 'stable-run',
      rankerRevision: null
    });
  });

  it('collects shadow labels while rollout is pending but respects the disabled switch', () => {
    const shadowProbe = (status: 'disabled' | 'fallback') => {
      const collage = engine({
        rankerInfo: {
          requestedStrategy: 'strict-ml-typed',
          effectiveStrategy: 'legacy',
          status,
          runtime: 'none',
          learningScope: 'test',
          featureSchema: 'auto-create-numeric-v1',
          rankingPolicy: 'strict-cascade-v1',
          modelRevision: null,
          fallbackReason: status === 'fallback' ? 'rollout-not-approved' : undefined
        }
      });
      return (collage as unknown as {
        shouldCollectShadowExamples: (mode: 'add' | 'replace') => boolean;
      }).shouldCollectShadowExamples('add');
    };

    expect(shadowProbe('fallback')).toBe(true);
    expect(shadowProbe('disabled')).toBe(false);
  });

  it('falls back when a ranker returns a malformed output matrix', () => {
    const rankerInfo = readyRankerInfo('short-output');
    const collage = engine({
      settings: { candidateBatch: 1 },
      rankerInfo,
      ranker: {
        revision: 'short-output',
        runtime: 'typed',
        predict: () => new Float32Array(1)
      }
    });
    (collage as unknown as {
      rankCandidateDescriptors: (
        values: CandidateDescriptor[],
        mode: 'add',
        target: { color: [number, number, number]; std: [number, number, number]; complexity: number },
        progress: number
      ) => CandidateDescriptor[];
    }).rankCandidateDescriptors(
      [descriptor(0), descriptor(1)],
      'add',
      { color: [255, 0, 0], std: [0, 0, 0], complexity: 0 },
      0
    );
    expect(rankerInfo).toMatchObject({
      effectiveStrategy: 'legacy',
      modelRevision: null,
      fallbackReason: 'inference-failed:ranker returned 1 outputs; expected 4'
    });
  });

  it('fills descriptor features with local target and shared current-state statistics', () => {
    let captured: Float32Array | null = null;
    const ranker: DenseRankerPredictor = {
      revision: 'feature-model',
      runtime: 'typed',
      predict(features, rowCount = 0) {
        captured = Float32Array.from(features);
        return new Float32Array(rowCount * 2);
      }
    };
    const target = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 0, 255, 255
    ]);
    const collage = engine({
      width: 2,
      target,
      rankerInfo: readyRankerInfo('feature-model'),
      ranker
    });
    const internals = collage as unknown as EngineInternals & {
      copyPatchToCanvas: (patch: Float32Array, bbox: [number, number, number, number]) => void;
    };
    internals.copyPatchToCanvas(new Float32Array([
      10, 20, 30, 255,
      30, 40, 50, 255
    ]), [0, 0, 2, 1]);
    (collage as unknown as {
      rankCandidateDescriptors: (
        values: CandidateDescriptor[],
        mode: 'add',
        target: { color: [number, number, number]; std: [number, number, number]; complexity: number },
        progress: number
      ) => CandidateDescriptor[];
    }).rankCandidateDescriptors(
      [descriptor(0, 1, [0, 0, 2, 1])],
      'add',
      { color: [1, 2, 3], std: [0, 0, 0], complexity: 0 },
      0.5
    );

    const feature = (name: typeof FEATURE_NAMES[number]) => {
      const values = captured as unknown as Float32Array;
      return values[FEATURE_NAMES.indexOf(name)];
    };
    expect(captured).not.toBeNull();
    expect(feature('target_mean_r')).toBeCloseTo(0.5, 5);
    expect(feature('target_mean_b')).toBeCloseTo(0.5, 5);
    expect(feature('target_std_r')).toBeCloseTo(0.5, 5);
    expect(feature('canvas_mean_r')).toBeCloseTo(20 / 255, 5);
    expect(feature('canvas_mean_g')).toBeCloseTo(30 / 255, 5);
    expect(feature('residual_mean_r')).toBeCloseTo(107.5 / 255, 5);
    expect(feature('residual_mean_g')).toBeCloseTo(-30 / 255, 5);
    expect(feature('residual_std_b')).toBeCloseTo(117.5 / 255, 5);
  });

  it('reproduces deterministic layer ids after restoring accepted/replaced serials', () => {
    const identity = { runHash: 'deterministic-run', targetSignature: 'target' };
    const uninterrupted = engine({
      learningIdentity: identity,
      decorationRunHash: 'deterministic-run'
    });
    const acceptUninterrupted = (uninterrupted as unknown as {
      acceptCandidate: (candidate: Candidate) => void;
    }).acceptCandidate.bind(uninterrupted);
    acceptUninterrupted(redCandidate());
    acceptUninterrupted(redCandidate());

    const stopped = engine({
      learningIdentity: identity,
      decorationRunHash: 'deterministic-run'
    });
    (stopped as unknown as {
      acceptCandidate: (candidate: Candidate) => void;
    }).acceptCandidate(redCandidate());
    const checkpoint = stopped.createSnapshot(
      1,
      2,
      0,
      123,
      { width: 1, height: 1, sourceWidth: 1, sourceHeight: 1 },
      'target',
      []
    );

    const resumed = engine({
      learningIdentity: identity,
      decorationRunHash: 'deterministic-run'
    });
    (resumed as unknown as EngineInternals & { cache: { get: () => TransformedImage } }).cache.get =
      vi.fn(() => opaqueRed());
    expect(resumed.restoreFromSnapshot(checkpoint)).toBe(true);
    (resumed as unknown as {
      acceptCandidate: (candidate: Candidate) => void;
    }).acceptCandidate(redCandidate());

    expect(resumed.exportDecorations()).toEqual(uninterrupted.exportDecorations());
    expect(resumed.exportDecorations().map((item) => item.id)).toEqual([
      'deco_auto_deterministic-run_1',
      'deco_auto_deterministic-run_0'
    ]);
  });

  it('continues bitwise-equivalently after many incremental applies and replacements', () => {
    const width = 8;
    const target = new Uint8ClampedArray(width * 4);
    for (let x = 0; x < width; x += 1) {
      target.set([255, 0, 0, 255], x * 4);
    }
    const settings: Partial<AutoCreateTwroleSettings> = {
      candidateBatch: 1,
      replaceCandidateBatch: 1,
      tilePenaltyMse: 0,
      replaceMinGainMse: 0,
      errorCellSize: 4
    };
    const identity = { runHash: 'incremental-learning', targetSignature: 'target' };
    const uninterrupted = engine({
      width,
      target,
      settings,
      learningIdentity: identity,
      decorationRunHash: 'incremental-decoration'
    });
    (uninterrupted as unknown as {
      acceptCandidate: (candidate: Candidate) => void;
    }).acceptCandidate(opaqueRedLevelCandidate(0, 0, 128));

    for (let red = 1; red <= 120; red += 1) {
      proposeCandidateMock.mockImplementation(() => opaqueRedLevelCandidate(red, 0, 128));
      expect(uninterrupted.tryReplaceOnce(red, 200)).toBe(true);
    }
    const checkpoint = uninterrupted.createSnapshot(
      120,
      200,
      0,
      123,
      { width, height: 1, sourceWidth: width, sourceHeight: 1 },
      'target',
      []
    );

    const resumed = engine({
      width,
      target,
      settings,
      learningIdentity: identity,
      decorationRunHash: 'incremental-decoration'
    });
    (resumed as unknown as EngineInternals & { cache: { get: () => TransformedImage } }).cache.get =
      vi.fn(() => opaqueRedLevelCandidate(120, 0, 128).rgba);
    expect(resumed.restoreFromSnapshot(checkpoint)).toBe(true);
    (resumed as unknown as { rng: SeededRandom }).rng.restore(
      checkpoint.rngState,
      checkpoint.rngSpareNormal
    );
    expect((resumed as unknown as {
      errors: { snapshotState: () => AutoCreateTwroleSnapshot['errorFieldState'] };
    }).errors.snapshotState()).toEqual(checkpoint.errorFieldState);

    proposeCandidateMock.mockImplementation((
      _sources: unknown,
      _sourceId: number,
      centerX: number
    ) => opaqueRedLevelCandidate(255, Math.max(0, Math.min(width - 1, Math.floor(centerX)))));
    expect(uninterrupted.tryAdd(121, 200)).toBe(true);
    expect(resumed.tryAdd(121, 200)).toBe(true);

    expect(resumed.exportDecorations()).toEqual(uninterrupted.exportDecorations());
    expect(resumed.exportLegacyDeco()).toEqual(uninterrupted.exportLegacyDeco());
    expect(resumed.currentMse()).toBe(uninterrupted.currentMse());
    expect({
      accepted: resumed.accepted,
      rejected: resumed.rejected,
      pruned: resumed.pruned,
      replaced: resumed.replaced
    }).toEqual({
      accepted: uninterrupted.accepted,
      rejected: uninterrupted.rejected,
      pruned: uninterrupted.pruned,
      replaced: uninterrupted.replaced
    });
  });

  it('accepts bounded residual-square cancellation and restores its exact serialized value', () => {
    const source = engine({
      learningIdentity: { runHash: 'roundoff-learning', targetSignature: 'target' },
      decorationRunHash: 'roundoff-decoration'
    });
    (source as unknown as {
      acceptCandidate: (candidate: Candidate) => void;
    }).acceptCandidate(redCandidate());
    const checkpoint = source.createSnapshot(
      1,
      2,
      0,
      123,
      { width: 1, height: 1, sourceWidth: 1, sourceHeight: 1 },
      'target',
      []
    );
    checkpoint.rankingState.residualSquared[0] = -0.001;

    const resumed = engine({
      learningIdentity: { runHash: 'roundoff-learning', targetSignature: 'target' },
      decorationRunHash: 'roundoff-decoration'
    });
    (resumed as unknown as EngineInternals & { cache: { get: () => TransformedImage } }).cache.get =
      vi.fn(() => opaqueRed());
    expect(resumed.restoreFromSnapshot(checkpoint)).toBe(true);
    expect(resumed.createSnapshot(
      1,
      2,
      0,
      123,
      { width: 1, height: 1, sourceWidth: 1, sourceHeight: 1 },
      'target',
      []
    ).rankingState.residualSquared[0]).toBe(-0.001);
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
    expect(diagnostics.snapshot().counters.candidatesEvaluated).toBe(2);
    expect(diagnostics.snapshot().counters.replaceCandidatesEvaluated).toBe(2);
  });

  it('counts descriptor Replace candidates at the same exact-evaluator boundary', () => {
    proposeCandidateDescriptorMock.mockImplementation((
      ...args: Parameters<typeof import('./candidateSearch').proposeCandidateDescriptor>
    ) => {
      const options = args[9];
      return descriptor(options?.proposalIndex ?? 0, 100);
    });
    materializeCandidateMock.mockImplementation(() => redCandidate());
    const diagnostics = new AutoCreateDiagnosticsCollector();
    const collage = engine({
      diagnostics,
      settings: {
        searchStrategy: 'descriptor-control',
        replaceCandidateBatch: 2
      },
      rankerInfo: {
        requestedStrategy: 'descriptor-control',
        effectiveStrategy: 'descriptor-control',
        status: 'ready',
        runtime: 'none',
        learningScope: 'test',
        featureSchema: 'auto-create-numeric-v1',
        rankingPolicy: 'strict-cascade-v1',
        modelRevision: null
      }
    });
    const internals = collage as unknown as EngineInternals;
    const old = tile('blue-old');
    internals.tiles.push(old);
    internals.activeTileCount = 1;
    internals.canvas.set([0, 0, 255, 255]);
    internals.spatialIndex.update(0, old.bbox);

    expect(collage.tryReplaceOnce(1, 1)).toBe(true);
    expect(diagnostics.snapshot().counters.candidatesEvaluated).toBe(2);
    expect(diagnostics.snapshot().counters.replaceCandidatesEvaluated).toBe(2);
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
    const paddedSnapshot = snapshot([restoredTile]);
    paddedSnapshot.rankingState = {
      maskedPixelCount: 1,
      canvasSum: [255, 0, 0],
      residualSum: [0, 0, 0],
      residualSquared: [0, 0, 0]
    };
    paddedSnapshot.errorFieldState = {
      version: 1,
      cellSize: 16,
      gridWidth: 1,
      gridHeight: 1,
      totalSse: 0,
      focusSse: 0,
      cellWeights: [0]
    };

    expect(collage.restoreFromSnapshot(paddedSnapshot)).toBe(true);
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
