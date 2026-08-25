import { describe, expect, it } from 'vitest';
import { createZeroDenseRankerWeights, createTypedDenseRankerPredictor } from './denseRanker';
import { FEATURE_COUNT } from './featureSchema';
import {
  decodePortableDatasetRow,
  encodePortableDatasetRow,
  PORTABLE_DATASET_RECORD_BYTES,
  sha256Hex
} from './portableDataset';
import {
  finalizePortableModel,
  validatePortableRankerModel
} from './portableModel';
import type { PersistedCandidateLearningExample } from './types';

function example(outcome: 'exact' | 'invalid'): PersistedCandidateLearningExample {
  return {
    id: `row-${outcome}`,
    camp: 'civil',
    featureSchema: 'auto-create-numeric-v1',
    features: Array.from({ length: FEATURE_COUNT }, (_, index) => index / FEATURE_COUNT),
    mode: outcome === 'exact' ? 'add' : 'replace',
    runHash: 'run',
    targetSignature: 'target',
    modelRevision: null,
    prediction: {
      rankingScore: 0.25,
      predictedDecisionMargin: -0.5,
      validProbability: 0.75
    },
    provenance: { kind: 'exploration', inclusionProbability: 0.2 },
    outcome: outcome === 'exact'
      ? {
          kind: 'exact',
          valid: true,
          globalGainMse: 1,
          score: 1,
          decisionMargin: 0.125
        }
      : { kind: 'invalid', valid: false, reason: 'containment' },
    createdAt: 1,
    sequence: 1,
    estimatedBytes: 1,
    retention: { tier: 'recent' }
  };
}

describe('portable AutoCreate training artifacts', () => {
  it('round-trips exact and invalid fixed-width rows', () => {
    const bytes = new Uint8Array(PORTABLE_DATASET_RECORD_BYTES * 2);
    encodePortableDatasetRow(bytes, 0, example('exact'), 3);
    encodePortableDatasetRow(bytes, 1, example('invalid'), 4);
    expect(decodePortableDatasetRow(bytes, 0)).toMatchObject({
      validity: 1,
      margin: 0.125,
      marginMask: 1,
      mode: 'add',
      targetIndex: 3,
      provenanceCode: 1
    });
    expect(decodePortableDatasetRow(bytes, 1)).toMatchObject({
      validity: 0,
      margin: 0,
      marginMask: 0,
      mode: 'replace',
      targetIndex: 4
    });
  });

  it('produces stable SHA-256 checksums', async () => {
    expect(await sha256Hex(new Uint8Array([1, 2, 3])))
      .toBe('039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
  });

  it('validates checksum, weights and typed parity before import', async () => {
    const revision = 'portable-test';
    const weights = createZeroDenseRankerWeights(revision);
    const features = Array.from({ length: FEATURE_COUNT }, () => 0.25);
    const predictions = Array.from(createTypedDenseRankerPredictor(weights).predict(features));
    const model = await finalizePortableModel({
      format: 'auto-create-portable-ranker',
      version: 1,
      camp: 'civil',
      revision,
      featureSchema: 'auto-create-numeric-v1',
      rankingPolicy: 'strict-cascade-v1',
      createdAt: 1,
      trainingExampleCount: 10,
      targetSignatureCount: 3,
      trainingDataFingerprint: 'auto-create-training-data-v1:00000000000000000000000000000001',
      trainingTargetSignatures: ['a', 'b', 'c'],
      trainedModes: ['add', 'replace'],
      weights: {
        dense1Kernel: Array.from(weights.dense1Kernel),
        dense1Bias: Array.from(weights.dense1Bias),
        dense2Kernel: Array.from(weights.dense2Kernel),
        dense2Bias: Array.from(weights.dense2Bias),
        outputKernel: Array.from(weights.outputKernel),
        outputBias: Array.from(weights.outputBias)
      },
      parity: { features, predictions, tolerance: 1e-5 }
    });
    await expect(validatePortableRankerModel(model, 'civil')).resolves.toMatchObject({
      model: { revision }
    });
    await expect(validatePortableRankerModel({
      ...model,
      trainingExampleCount: 11
    }, 'civil')).rejects.toThrow('checksum');
  });
});
