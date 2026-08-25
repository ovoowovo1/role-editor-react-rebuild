import { describe, expect, it } from 'vitest';
import { createZeroDenseRankerWeights } from './denseRanker';
import {
  hasValidRankerTrainedModes,
  hydrateDenseRankerWeights
} from './modelRuntime';

describe('auto-create ranker model runtime', () => {
  it('accepts only canonical non-empty Add/Replace mode sets', () => {
    expect(hasValidRankerTrainedModes(['add'])).toBe(true);
    expect(hasValidRankerTrainedModes(['replace'])).toBe(true);
    expect(hasValidRankerTrainedModes(['add', 'replace'])).toBe(true);
    expect(hasValidRankerTrainedModes([])).toBe(false);
    expect(hasValidRankerTrainedModes(['replace', 'add'])).toBe(false);
    expect(hasValidRankerTrainedModes(['add', 'add'])).toBe(false);
    expect(hasValidRankerTrainedModes(['bogus'])).toBe(false);
  });

  it('hydrates and validates portable IndexedDB weights', () => {
    const source = createZeroDenseRankerWeights('source');
    const hydrated = hydrateDenseRankerWeights('revision-2', source);
    expect(hydrated.revision).toBe('revision-2');
    expect(hydrated.inputSize).toBe(64);
    expect(hydrated.dense1Kernel).toBeInstanceOf(Float32Array);
  });

  it('rejects corrupt weights before inference', () => {
    expect(() => hydrateDenseRankerWeights('broken', {
      dense1Kernel: [],
      dense1Bias: [],
      dense2Kernel: [],
      dense2Bias: [],
      outputKernel: [],
      outputBias: []
    })).toThrow(/must contain/);
  });
});
