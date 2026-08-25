import { describe, expect, it } from 'vitest';
import { createZeroDenseRankerWeights } from './denseRanker';
import { FEATURE_COUNT } from './featureSchema';
import {
  buildAutoCreateTrainerDataset,
  evaluateAutoCreateTrainingReadiness,
  isTrainerManifestCompatible,
  isTrainerManifestUpToDate,
  normalizeAutoCreateTrainerOptions,
  shouldRetrainAutoCreateModel
} from './trainerProtocol';
import type {
  CandidateLearningOutcome,
  CandidateLearningMode,
  LearningModelManifest,
  PersistedCandidateLearningExample
} from './types';

function example(
  id: string,
  mode: CandidateLearningMode,
  targetSignature: string,
  outcome: CandidateLearningOutcome
): PersistedCandidateLearningExample {
  return {
    id,
    camp: 'skydow',
    featureSchema: 'auto-create-numeric-v1',
    features: Array.from({ length: FEATURE_COUNT }, (_, index) => index / FEATURE_COUNT),
    mode,
    runHash: 'run',
    targetSignature,
    modelRevision: null,
    provenance: { kind: 'exploration', inclusionProbability: 0.2 },
    outcome,
    createdAt: 1,
    sequence: 1,
    estimatedBytes: 1,
    retention: { tier: 'recent' }
  };
}

const exact = (margin: number): CandidateLearningOutcome => ({
  kind: 'exact',
  valid: true,
  globalGainMse: margin,
  score: margin,
  decisionMargin: margin
});

describe('auto-create trainer thresholds', () => {
  it('counts only exact labels and exact target signatures', () => {
    const examples = [
      example('a1', 'add', 'one', exact(1)),
      example('a2', 'add', 'two', exact(0)),
      example('a3', 'add', 'three', exact(-1)),
      example('invalid', 'add', 'invalid-only', {
        kind: 'invalid',
        valid: false,
        reason: 'containment'
      }),
      example('censored', 'replace', 'censored-only', {
        kind: 'censored',
        valid: true,
        reason: 'incumbent-early-exit'
      })
    ];
    const readiness = evaluateAutoCreateTrainingReadiness(examples, {
      addExact: 3,
      replaceExact: 1,
      targetSignatures: 3
    });
    expect(readiness.add).toMatchObject({
      exact: 3,
      targetSignatures: 3,
      ready: true
    });
    expect(readiness.replace).toMatchObject({
      exact: 0,
      targetSignatures: 0,
      ready: false
    });
    expect(readiness.eligibleModes).toEqual(['add']);
  });

  it('uses the production Add and Replace thresholds by default', () => {
    const readiness = evaluateAutoCreateTrainingReadiness([]);
    expect(readiness.add.requiredExact).toBe(8_000);
    expect(readiness.replace.requiredExact).toBe(512);
    expect(readiness.add.requiredTargetSignatures).toBe(3);
  });
});

describe('auto-create trainer dataset', () => {
  it('trains invalid candidates only on validity and excludes censored rows', () => {
    const examples = [
      example('exact', 'add', 'one', exact(0.125)),
      example('invalid', 'add', 'two', {
        kind: 'invalid',
        valid: false,
        reason: 'empty-alpha'
      }),
      example('censored', 'add', 'three', {
        kind: 'censored',
        reason: 'incumbent-early-exit',
        upperBoundMse: 0.5
      }),
      example('replace', 'replace', 'one', exact(10))
    ];
    const readiness = evaluateAutoCreateTrainingReadiness(examples, {
      addExact: 1,
      replaceExact: 2,
      targetSignatures: 1
    });
    const dataset = buildAutoCreateTrainerDataset(examples, readiness);
    expect(dataset.exampleCount).toBe(2);
    expect(dataset.exactCount).toBe(1);
    expect(dataset.invalidCount).toBe(1);
    expect([...dataset.validityLabels]).toEqual([1, 0]);
    expect([...dataset.marginLabels]).toEqual([0.125, 0]);
    expect([...dataset.marginMask]).toEqual([1, 0]);
    expect(dataset.featureMatrix).toHaveLength(FEATURE_COUNT * 2);
    expect(dataset.trainingTargetSignatures).toEqual(['one', 'two']);
    expect(dataset.targetSignatureCount).toBe(1);
    expect(dataset.trainingDataFingerprint)
      .toMatch(/^auto-create-training-data-v1:[0-9a-f]{32}$/);
  });

  it('fingerprints the complete dataset independent of input ordering', () => {
    const examples = [
      example('b', 'add', 'target-b', exact(0.25)),
      example('a', 'add', 'target-a', {
        kind: 'invalid',
        valid: false,
        reason: 'containment'
      })
    ];
    const readiness = evaluateAutoCreateTrainingReadiness(examples, {
      addExact: 1,
      replaceExact: 1,
      targetSignatures: 1
    });
    const first = buildAutoCreateTrainerDataset(examples, readiness);
    const reordered = buildAutoCreateTrainerDataset([...examples].reverse(), readiness);
    expect(reordered.trainingDataFingerprint).toBe(first.trainingDataFingerprint);
    expect(reordered.trainingTargetSignatures).toEqual(['target-a', 'target-b']);

    const changed = examples.map((item) => ({ ...item, features: [...item.features] }));
    changed[0]!.features[0] = 0.75;
    const changedDataset = buildAutoCreateTrainerDataset(changed, readiness);
    expect(changedDataset.exampleCount).toBe(first.exampleCount);
    expect(changedDataset.targetSignatureCount).toBe(first.targetSignatureCount);
    expect(changedDataset.trainingDataFingerprint).not.toBe(first.trainingDataFingerprint);
  });

  it('requires an exact data fingerprint and coverage of every eligible mode', () => {
    const examples = [example('a', 'add', 'target-a', exact(0.25))];
    const readiness = evaluateAutoCreateTrainingReadiness(examples, {
      addExact: 1,
      replaceExact: 1,
      targetSignatures: 1
    });
    const dataset = buildAutoCreateTrainerDataset(examples, readiness);
    const revision = 'revision-1';
    const manifest: LearningModelManifest = {
      camp: 'skydow',
      revision,
      featureSchema: 'auto-create-numeric-v1',
      rankingPolicy: 'strict-cascade-v1',
      runtime: 'typed',
      modelStorageUrl: `indexeddb://ranker/${revision}`,
      inputSize: FEATURE_COUNT,
      outputSize: 2,
      createdAt: 1,
      trainingExampleCount: dataset.exampleCount,
      targetSignatureCount: dataset.targetSignatureCount,
      trainingDataFingerprint: dataset.trainingDataFingerprint,
      trainingTargetSignatures: dataset.trainingTargetSignatures,
      trainedModes: ['add'],
      denseWeights: createZeroDenseRankerWeights(revision)
    };
    expect(isTrainerManifestCompatible(manifest)).toBe(true);
    expect(isTrainerManifestUpToDate(manifest, dataset)).toBe(true);
    expect(isTrainerManifestUpToDate({
      ...manifest,
      trainingDataFingerprint: manifest.trainingDataFingerprint.replace(/.$/, '0')
    }, dataset)).toBe(false);
    expect(isTrainerManifestUpToDate(manifest, {
      ...dataset,
      eligibleModes: ['add', 'replace']
    })).toBe(false);
    expect(isTrainerManifestCompatible({
      ...manifest,
      trainingTargetSignatures: ['target-b', 'target-a'],
      targetSignatureCount: 2
    })).toBe(false);
  });

  it('bounds untrusted training options', () => {
    expect(normalizeAutoCreateTrainerOptions({
      epochs: 1_000,
      batchSize: 100_000,
      learningRate: 20,
      force: true
    })).toEqual({
      epochs: 100,
      batchSize: 2_048,
      learningRate: 1,
      force: true
    });
  });

  it('re-trains only for 2,000 new rows, a new signature, or a new mode', () => {
    const baseDataset = {
      featureMatrix: new Float32Array(),
      validityLabels: new Float32Array(),
      marginLabels: new Float32Array(),
      marginMask: new Float32Array(),
      exampleCount: 10_000,
      exactCount: 8_000,
      invalidCount: 2_000,
      targetSignatureCount: 3,
      eligibleModes: ['add'] as CandidateLearningMode[],
      trainingDataFingerprint: 'auto-create-training-data-v1:00000000000000000000000000000000',
      trainingTargetSignatures: ['one', 'three', 'two']
    };
    const revision = 'threshold-model';
    const manifest: LearningModelManifest = {
      camp: 'civil',
      revision,
      featureSchema: 'auto-create-numeric-v1',
      rankingPolicy: 'strict-cascade-v1',
      runtime: 'typed',
      modelStorageUrl: `indexeddb://ranker/${revision}`,
      inputSize: FEATURE_COUNT,
      outputSize: 2,
      createdAt: 1,
      trainingExampleCount: 10_000,
      targetSignatureCount: 3,
      trainingDataFingerprint: baseDataset.trainingDataFingerprint,
      trainingTargetSignatures: baseDataset.trainingTargetSignatures,
      trainedModes: ['add'],
      denseWeights: createZeroDenseRankerWeights(revision)
    };
    expect(shouldRetrainAutoCreateModel(manifest, {
      ...baseDataset,
      exampleCount: 11_999
    })).toBe(false);
    expect(shouldRetrainAutoCreateModel(manifest, {
      ...baseDataset,
      exampleCount: 12_000
    })).toBe(true);
    expect(shouldRetrainAutoCreateModel(manifest, {
      ...baseDataset,
      trainingTargetSignatures: [...baseDataset.trainingTargetSignatures, 'new']
    })).toBe(true);
    expect(shouldRetrainAutoCreateModel(manifest, {
      ...baseDataset,
      eligibleModes: ['add', 'replace']
    })).toBe(true);
    expect(shouldRetrainAutoCreateModel(null, baseDataset)).toBe(true);
  });
});
