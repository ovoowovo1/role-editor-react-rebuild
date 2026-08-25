import { describe, expect, it } from 'vitest';
import {
  classifyLearningExample,
  emptyReservoirSeen,
  updateLearningReservoir
} from './reservoir';
import type {
  CandidateLearningOutcome,
  LearningRetentionLimits,
  PersistedCandidateLearningExample
} from './types';

function limits(overrides: Partial<LearningRetentionLimits> = {}): LearningRetentionLimits {
  return {
    maxExamples: 9,
    maxEstimatedBytes: 1_000_000,
    recentCapacity: 2,
    bucketCapacities: {
      exploration: 1,
      'high-positive': 1,
      'near-zero': 1,
      'general-negative': 1,
      invalid: 1,
      'hard-negative': 1,
      'hard-positive': 1
    },
    nearZeroMargin: 0.01,
    hardPredictionMargin: 0.1,
    ...overrides
  };
}

function exact(margin: number): CandidateLearningOutcome {
  return {
    kind: 'exact',
    valid: true,
    globalGainMse: margin,
    score: margin,
    decisionMargin: margin
  };
}

function example(
  id: string,
  sequence: number,
  outcome: CandidateLearningOutcome = exact(1),
  options: {
    provenance?: PersistedCandidateLearningExample['provenance'];
    predictedMargin?: number;
    estimatedBytes?: number;
  } = {}
): PersistedCandidateLearningExample {
  return {
    id,
    camp: 'skydow',
    featureSchema: 'auto-create-numeric-v1',
    features: [sequence, 1],
    mode: 'add',
    runHash: 'run',
    targetSignature: 'target',
    modelRevision: null,
    prediction: options.predictedMargin === undefined
      ? undefined
      : {
          rankingScore: options.predictedMargin,
          predictedDecisionMargin: options.predictedMargin
        },
    provenance: options.provenance ?? {
      kind: 'top-k',
      inclusionProbability: 1
    },
    outcome,
    createdAt: sequence,
    sequence,
    estimatedBytes: options.estimatedBytes ?? 100,
    retention: { tier: 'recent' }
  };
}

describe('learning reservoir classification', () => {
  it('separates exact, invalid, censored, exploration and model errors', () => {
    const testLimits = limits();
    expect(classifyLearningExample(example('positive', 0, exact(0.2)), testLimits))
      .toBe('high-positive');
    expect(classifyLearningExample(example('zero', 1, exact(0.005)), testLimits))
      .toBe('near-zero');
    expect(classifyLearningExample(example('negative', 2, exact(-0.2)), testLimits))
      .toBe('general-negative');
    expect(classifyLearningExample(example(
      'explore',
      3,
      exact(0.2),
      { provenance: { kind: 'exploration', inclusionProbability: 0.1 } }
    ), testLimits)).toBe('exploration');
    expect(classifyLearningExample(example(
      'hard-negative',
      4,
      exact(-0.2),
      { predictedMargin: 0.5 }
    ), testLimits)).toBe('hard-negative');
    expect(classifyLearningExample(example(
      'hard-positive',
      5,
      exact(0.2),
      { predictedMargin: -0.5 }
    ), testLimits)).toBe('hard-positive');
    expect(classifyLearningExample(example('invalid', 6, {
      kind: 'invalid',
      valid: false,
      reason: 'containment'
    }), testLimits)).toBe('invalid');
    expect(classifyLearningExample(example('censored', 7, {
      kind: 'censored',
      reason: 'incumbent-early-exit',
      upperBoundMse: 0
    }), testLimits)).toBeNull();
  });
});

describe('learning recent + bucket retention', () => {
  it('keeps a recent FIFO and sends displaced trainable records to buckets', () => {
    const testLimits = limits();
    const first = updateLearningReservoir(
      { examples: [], reservoirSeen: emptyReservoirSeen() },
      [
        example('positive', 0),
        example('invalid', 1, {
          kind: 'invalid',
          valid: false,
          reason: 'empty-alpha'
        }),
        example('censored', 2, {
          kind: 'censored',
          reason: 'incumbent-early-exit'
        }),
        example('exploration', 3, exact(0.5), {
          provenance: { kind: 'exploration', inclusionProbability: 0.1 }
        })
      ],
      { limits: testLimits, random: () => 0.99 }
    );

    expect(first.examples.filter((item) => item.retention.tier === 'recent')
      .map((item) => item.id)).toEqual(['censored', 'exploration']);
    expect(first.examples.find((item) => item.id === 'positive')?.retention)
      .toEqual({ tier: 'reservoir', bucket: 'high-positive' });
    expect(first.examples.find((item) => item.id === 'invalid')?.retention)
      .toEqual({ tier: 'reservoir', bucket: 'invalid' });

    const second = updateLearningReservoir(
      first,
      [example('near-zero', 4, exact(0)), example('negative', 5, exact(-1))],
      { limits: testLimits, random: () => 0.99 }
    );
    expect(second.examples.map((item) => item.id)).not.toContain('censored');
    expect(second.examples.find((item) => item.id === 'exploration')?.retention)
      .toEqual({ tier: 'reservoir', bucket: 'exploration' });
    expect(second.examples.filter((item) => item.retention.tier === 'recent')
      .map((item) => item.id)).toEqual(['near-zero', 'negative']);
    expect(second.evictedIds).toContain('censored');
  });

  it('uses Algorithm R for a full bucket', () => {
    const testLimits = limits({ recentCapacity: 0 });
    const first = updateLearningReservoir(
      { examples: [], reservoirSeen: emptyReservoirSeen() },
      [example('first', 0), example('second', 1)],
      { limits: testLimits, random: () => 0.99 }
    );
    expect(first.examples.map((item) => item.id)).toEqual(['first']);
    expect(first.reservoirSeen['high-positive']).toBe(2);

    const replaced = updateLearningReservoir(
      first,
      [example('third', 2)],
      { limits: testLimits, random: () => 0 }
    );
    expect(replaced.examples.map((item) => item.id)).toEqual(['third']);
    expect(replaced.reservoirSeen['high-positive']).toBe(3);
  });

  it('enforces the byte cap even when one record cannot fit', () => {
    const result = updateLearningReservoir(
      { examples: [], reservoirSeen: emptyReservoirSeen() },
      [
        example('small', 0, exact(1), { estimatedBytes: 100 }),
        example('large', 1, exact(1), { estimatedBytes: 200 })
      ],
      {
        limits: limits({
          recentCapacity: 10,
          maxEstimatedBytes: 150
        })
      }
    );
    expect(result.examples).toEqual([]);
    expect(result.evictedIds).toEqual(['large', 'small']);
  });
});

