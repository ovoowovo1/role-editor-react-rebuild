import { describe, expect, it } from 'vitest';
import {
  assertResumeRankerAvailable,
  autoCreateDecorationRunHash,
  autoCreateLearningRunHash
} from './runner';

const BASE_IDENTITY = {
  learningScope: 'skydow',
  targetSignature: 'target',
  sourceSignature: 'sources',
  settingsSignature: 'settings',
  seed: 123,
  effectiveStrategy: 'strict-ml-typed' as const,
  modelRevision: 'model-a',
  initialExperienceState: '{"version":1,"source_stats":{},"color_stats":{}}'
};

describe('AutoCreate learning run identity', () => {
  it('includes the frozen model, effective strategy and initial experience state', () => {
    const baseline = autoCreateLearningRunHash(BASE_IDENTITY);
    expect(autoCreateLearningRunHash({
      ...BASE_IDENTITY,
      modelRevision: 'model-b'
    })).not.toBe(baseline);
    expect(autoCreateLearningRunHash({
      ...BASE_IDENTITY,
      effectiveStrategy: 'legacy'
    })).not.toBe(baseline);
    expect(autoCreateLearningRunHash({
      ...BASE_IDENTITY,
      initialExperienceState: '{"version":1,"source_stats":{"a":{"trials":1}},"color_stats":{}}'
    })).not.toBe(baseline);
    expect(autoCreateLearningRunHash({ ...BASE_IDENTITY })).toBe(baseline);
  });

  it('keeps decoration identity independent of ranker strategy, scope and experience', () => {
    const baseline = autoCreateDecorationRunHash({
      targetSignature: BASE_IDENTITY.targetSignature,
      sourceSignature: BASE_IDENTITY.sourceSignature,
      seed: BASE_IDENTITY.seed
    });
    expect(baseline).toBe(autoCreateDecorationRunHash({
      targetSignature: BASE_IDENTITY.targetSignature,
      sourceSignature: BASE_IDENTITY.sourceSignature,
      seed: BASE_IDENTITY.seed
    }));
    expect(autoCreateDecorationRunHash({
      targetSignature: `${BASE_IDENTITY.targetSignature}-other`,
      sourceSignature: BASE_IDENTITY.sourceSignature,
      seed: BASE_IDENTITY.seed
    })).not.toBe(baseline);
  });

  it('requires a non-null frozen snapshot model but permits fresh/cold legacy fallback', () => {
    expect(() => assertResumeRankerAvailable(undefined, {
      modelRevision: null,
      predictor: null,
      status: 'fallback'
    })).not.toThrow();
    expect(() => assertResumeRankerAvailable(null, {
      modelRevision: null,
      predictor: null,
      status: 'fallback'
    })).not.toThrow();
    expect(() => assertResumeRankerAvailable('model-a', {
      modelRevision: 'model-a',
      predictor: {},
      status: 'ready'
    })).not.toThrow();
    expect(() => assertResumeRankerAvailable('model-a', {
      modelRevision: null,
      predictor: null,
      status: 'fallback'
    })).toThrow(/frozen ranker revision "model-a" is unavailable or invalid/i);
  });
});
