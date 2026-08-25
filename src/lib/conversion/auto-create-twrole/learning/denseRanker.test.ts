import { describe, expect, it } from 'vitest';
import { FEATURE_COUNT } from './featureSchema';
import {
  createZeroDenseRankerWeights,
  DENSE_RANKER_HIDDEN_1,
  DENSE_RANKER_HIDDEN_2,
  predictDenseRankerTfjs,
  runDenseRankerBatch,
  stableRankPredictions,
  stableRankScores,
  validateDenseRankerWeights
} from './denseRanker';

describe('auto-create dense candidate ranker', () => {
  it('runs the 64→32→2 network in a pure TypedArray batch', () => {
    const weights = createZeroDenseRankerWeights('manual-test');
    weights.dense1Kernel[0 * DENSE_RANKER_HIDDEN_1 + 0] = 2;
    weights.dense1Bias[0] = -1;
    weights.dense2Kernel[0 * DENSE_RANKER_HIDDEN_2 + 0] = 3;
    weights.dense2Bias[0] = 1;
    weights.outputKernel[0] = 0.5;
    weights.outputKernel[1] = -2;
    weights.outputBias[0] = 0.25;
    weights.outputBias[1] = 3;

    const features = new Float32Array(FEATURE_COUNT * 2);
    features[0] = 2;
    features[FEATURE_COUNT] = -2;

    // Row 0: relu(2*2-1)=3; relu(3*3+1)=10.
    // Row 1: relu(-2*2-1)=0; relu(0*3+1)=1.
    expect([...runDenseRankerBatch(weights, features)]).toEqual([
      5.25,
      -17,
      0.75,
      1
    ]);
  });

  it('uses proposalIndex as the deterministic tie-breaker', () => {
    const predictions = new Float32Array([
      2, 3,
      2, 3,
      3, 2
    ]);

    expect(stableRankPredictions(predictions, new Uint32Array([30, 10, 20]))).toEqual([
      1,
      0,
      2
    ]);
    expect(stableRankScores([4, 4, 4], [9, 2, 5])).toEqual([1, 2, 0]);
  });

  it('sanitizes non-finite features and rejects non-finite weights', () => {
    const weights = createZeroDenseRankerWeights('nan-test');
    weights.dense1Kernel[0] = 2;
    weights.dense2Kernel[0] = 3;
    weights.outputKernel[0] = 4;
    weights.outputBias[1] = 1;
    const features = new Float32Array(FEATURE_COUNT);
    features[0] = Number.NaN;
    features[1] = Number.POSITIVE_INFINITY;

    const prediction = runDenseRankerBatch(weights, features);
    expect([...prediction].every((value) => Number.isFinite(value))).toBe(true);
    expect([...prediction]).toEqual([0, 1]);
    expect(stableRankScores([Number.NaN, 1, Number.POSITIVE_INFINITY], [1, 3, 2]))
      .toEqual([1, 0, 2]);

    weights.outputBias[0] = Number.NaN;
    expect(() => validateDenseRankerWeights(weights)).toThrow(/must be finite/);
  });

  it('keeps TFJS and TypedArray outputs within the benchmark tolerance', async () => {
    const weights = createZeroDenseRankerWeights('parity-test');
    for (let index = 0; index < weights.dense1Kernel.length; index += 1) {
      weights.dense1Kernel[index] = Math.sin(index * 0.17) * 0.015;
    }
    for (let index = 0; index < weights.dense2Kernel.length; index += 1) {
      weights.dense2Kernel[index] = Math.cos(index * 0.11) * 0.02;
    }
    for (let index = 0; index < weights.outputKernel.length; index += 1) {
      weights.outputKernel[index] = Math.sin(index * 0.07) * 0.03;
    }
    const features = new Float32Array(FEATURE_COUNT * 3);
    for (let index = 0; index < features.length; index += 1) {
      features[index] = Math.sin(index * 0.13);
    }

    const typed = runDenseRankerBatch(weights, features);
    const tfjs = await predictDenseRankerTfjs(weights, features);
    const maxError = typed.reduce(
      (maximum, value, index) => Math.max(maximum, Math.abs(value - tfjs[index])),
      0
    );

    expect(maxError).toBeLessThanOrEqual(1.0e-5);
    expect(stableRankPredictions(tfjs)).toEqual(stableRankPredictions(typed));
  });
});
