import { describe, expect, it } from 'vitest';
import { AUTO_CREATE_FEATURE_SCHEMA_VERSION } from '../contracts';
import {
  encodeCandidateFeatureBatch,
  encodeCandidateFeatures,
  FEATURE_COUNT,
  FEATURE_NAMES,
  FEATURE_SCHEMA,
  FEATURE_SCHEMA_VERSION
} from './featureSchema';

describe('auto-create candidate feature schema', () => {
  it('has one fixed version and stable 64-column order', () => {
    expect(FEATURE_SCHEMA_VERSION).toBe(AUTO_CREATE_FEATURE_SCHEMA_VERSION);
    expect(FEATURE_SCHEMA.version).toBe(AUTO_CREATE_FEATURE_SCHEMA_VERSION);
    expect(FEATURE_COUNT).toBe(64);
    expect(FEATURE_SCHEMA.names).toBe(FEATURE_NAMES);
    expect(FEATURE_NAMES[0]).toBe('mode_replace');
    expect(FEATURE_NAMES[63]).toBe('replace_rotation_delta_sin');
  });

  it('normalizes structured descriptor values without raster input', () => {
    const features = encodeCandidateFeatures({
      mode: 'replace',
      source: {
        meanRgb: [255, 127.5, 0],
        stdRgb: [0, 255, 64],
        alphaRatio: 0.75,
        alphaSum: 4 * 2 * 255,
        width: 4,
        height: 2,
        centerX: 1,
        centerY: -0.5,
        assetId: 'asset/example'
      },
      placement: {
        centerX: 75,
        centerY: 25,
        targetWidth: 100,
        targetHeight: 50,
        scaleX: -2,
        scaleY: 1,
        rotationDeg: 90,
        bbox: [50, -10, 100, 30]
      },
      target: {
        focusRgb: [255, 0, 0],
        localMeanRgb: [128, 64, 32],
        maskCoverage: 0.5,
        placementCoverage: 0.25
      },
      state: {
        mse: 65025,
        progress: 0.4,
        decorationCount: 5,
        maxDecorations: 10
      },
      replace: {
        sameSource: true,
        bboxIou: 0.75,
        rotationDeltaDeg: 30
      }
    });
    const at = (name: typeof FEATURE_NAMES[number]): number => features[FEATURE_NAMES.indexOf(name)];

    expect(features).toHaveLength(FEATURE_COUNT);
    expect(at('mode_replace')).toBe(1);
    expect(at('source_mean_r')).toBe(1);
    expect(at('source_mean_g')).toBeCloseTo(0.5);
    expect(at('position_x')).toBeCloseTo(0.5);
    expect(at('position_y')).toBeCloseTo(0);
    expect(at('flip_x')).toBe(1);
    expect(at('flip_y')).toBe(0);
    expect(at('rotation_sin')).toBeCloseTo(1);
    expect(at('bbox_outside')).toBeCloseTo(0.25);
    expect(at('current_mse')).toBe(1);
    expect(at('decoration_count')).toBeCloseTo(0.5);
    expect(at('replace_same_source')).toBe(1);
    expect(at('replace_rotation_delta_sin')).toBeCloseTo(0.5);
  });

  it('maps missing and non-finite input to a finite bounded vector', () => {
    const features = encodeCandidateFeatures({
      source: {
        meanRgb: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
        alphaRatio: Number.NaN,
        width: Number.POSITIVE_INFINITY
      },
      placement: {
        centerX: Number.NaN,
        targetWidth: Number.POSITIVE_INFINITY,
        rotationDeg: Number.NaN,
        bbox: [Number.NaN, 0, Number.POSITIVE_INFINITY, 1]
      },
      state: {
        mse: Number.POSITIVE_INFINITY,
        experienceSource: Number.NaN
      }
    });

    expect([...features].every((value) => Number.isFinite(value))).toBe(true);
    expect([...features].every((value) => value >= -1 && value <= 1)).toBe(true);
  });

  it('encodes a contiguous batch and supports a reusable output buffer', () => {
    const output = new Float32Array(FEATURE_COUNT * 2);
    expect(encodeCandidateFeatureBatch([
      { mode: 'add' },
      { mode: 'replace' }
    ], output)).toBe(output);
    expect(output[0]).toBe(0);
    expect(output[FEATURE_COUNT]).toBe(1);
  });
});
