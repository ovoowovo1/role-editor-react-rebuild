import {
  createTypedDenseRankerPredictor,
  validateDenseRankerWeights,
  type DenseRankerWeights
} from './denseRanker';
import { FEATURE_COUNT } from './featureSchema';
import { createIndexedDbLearningStore } from './indexedDbStore';
import { sha256Hex } from './portableDataset';
import {
  DEFAULT_LEARNING_FEATURE_SCHEMA,
  DEFAULT_LEARNING_RANKING_POLICY,
  TRAINING_DATA_FINGERPRINT_VERSION,
  type CandidateLearningMode,
  type LearningModelManifest
} from './types';

export const PORTABLE_MODEL_VERSION = 1;

interface PortableDenseWeights {
  dense1Kernel: number[];
  dense1Bias: number[];
  dense2Kernel: number[];
  dense2Bias: number[];
  outputKernel: number[];
  outputBias: number[];
}

export interface PortableRankerModel {
  format: 'auto-create-portable-ranker';
  version: typeof PORTABLE_MODEL_VERSION;
  checksum: string;
  camp: string;
  revision: string;
  featureSchema: string;
  rankingPolicy: string;
  createdAt: number;
  trainingExampleCount: number;
  targetSignatureCount: number;
  trainingDataFingerprint: string;
  trainingTargetSignatures: string[];
  trainedModes: CandidateLearningMode[];
  weights: PortableDenseWeights;
  parity: {
    features: number[];
    predictions: number[];
    tolerance: number;
  };
  metrics?: LearningModelManifest['metrics'];
}

function checksumPayload(model: Omit<PortableRankerModel, 'checksum'>): string {
  return JSON.stringify(model);
}

export async function portableModelChecksum(
  model: Omit<PortableRankerModel, 'checksum'>
): Promise<string> {
  return sha256Hex(new TextEncoder().encode(checksumPayload(model)));
}

export async function finalizePortableModel(
  model: Omit<PortableRankerModel, 'checksum'>
): Promise<PortableRankerModel> {
  return { ...model, checksum: await portableModelChecksum(model) };
}

function hydratePortableWeights(model: PortableRankerModel): DenseRankerWeights {
  return {
    revision: model.revision,
    featureSchema: model.featureSchema,
    inputSize: FEATURE_COUNT,
    dense1Kernel: Float32Array.from(model.weights.dense1Kernel),
    dense1Bias: Float32Array.from(model.weights.dense1Bias),
    dense2Kernel: Float32Array.from(model.weights.dense2Kernel),
    dense2Bias: Float32Array.from(model.weights.dense2Bias),
    outputKernel: Float32Array.from(model.weights.outputKernel),
    outputBias: Float32Array.from(model.weights.outputBias)
  };
}

export async function validatePortableRankerModel(
  input: unknown,
  expectedCamp?: string
): Promise<{ model: PortableRankerModel; weights: DenseRankerWeights }> {
  if (!input || typeof input !== 'object') throw new Error('Portable model must be an object.');
  const model = input as PortableRankerModel;
  if (model.format !== 'auto-create-portable-ranker' || model.version !== PORTABLE_MODEL_VERSION) {
    throw new Error('Unsupported portable model format or version.');
  }
  if (expectedCamp && model.camp !== expectedCamp.trim().toLocaleLowerCase('en-US')) {
    throw new Error(`Portable model camp "${model.camp}" does not match "${expectedCamp}".`);
  }
  if (
    model.featureSchema !== DEFAULT_LEARNING_FEATURE_SCHEMA
    || model.rankingPolicy !== DEFAULT_LEARNING_RANKING_POLICY
  ) {
    throw new Error('Portable model schema or ranking policy is incompatible.');
  }
  if (
    !Array.isArray(model.trainedModes)
    || model.trainedModes.length === 0
    || model.trainedModes.some((mode) => mode !== 'add' && mode !== 'replace')
  ) {
    throw new Error('Portable model trainedModes are invalid.');
  }
  if (
    !new RegExp(`^${TRAINING_DATA_FINGERPRINT_VERSION}:[0-9a-f]{32}$`)
      .test(model.trainingDataFingerprint ?? '')
    || !Array.isArray(model.trainingTargetSignatures)
  ) {
    throw new Error('Portable model training metadata is invalid.');
  }
  const { checksum: _checksum, ...unsigned } = model;
  if (await portableModelChecksum(unsigned) !== model.checksum) {
    throw new Error('Portable model checksum does not match its contents.');
  }
  const weights = hydratePortableWeights(model);
  validateDenseRankerWeights(weights);
  if (
    !Array.isArray(model.parity?.features)
    || model.parity.features.length === 0
    || model.parity.features.length % FEATURE_COUNT !== 0
    || model.parity.predictions.length !== (model.parity.features.length / FEATURE_COUNT) * 2
  ) {
    throw new Error('Portable model parity vectors are invalid.');
  }
  if (!Number.isFinite(model.parity.tolerance) || model.parity.tolerance < 0) {
    throw new Error('Portable model parity tolerance is invalid.');
  }
  const actual = createTypedDenseRankerPredictor(weights).predict(model.parity.features);
  const tolerance = Math.min(1e-5, Math.max(0, model.parity.tolerance));
  for (let index = 0; index < actual.length; index += 1) {
    if (
      !Number.isFinite(model.parity.predictions[index])
      || Math.abs(actual[index] - model.parity.predictions[index]) > tolerance
    ) {
      throw new Error(`Portable model parity check failed at output ${index}.`);
    }
  }
  return { model, weights };
}

export async function importPortableRankerModel(
  input: unknown,
  camp: string
): Promise<LearningModelManifest> {
  const { model, weights } = await validatePortableRankerModel(input, camp);
  const store = createIndexedDbLearningStore();
  const manifest: LearningModelManifest = {
    camp: model.camp,
    revision: model.revision,
    featureSchema: model.featureSchema,
    rankingPolicy: model.rankingPolicy,
    runtime: 'typed',
    modelStorageUrl: `portable://auto-create-twrole/${model.camp}/${model.revision}`,
    inputSize: FEATURE_COUNT,
    outputSize: 2,
    createdAt: model.createdAt,
    trainingExampleCount: model.trainingExampleCount,
    targetSignatureCount: model.targetSignatureCount,
    trainingDataFingerprint: model.trainingDataFingerprint,
    trainingTargetSignatures: [...model.trainingTargetSignatures].sort(),
    trainedModes: [...new Set(model.trainedModes)].sort() as CandidateLearningMode[],
    metrics: model.metrics,
    denseWeights: weights
  };
  try {
    await store.putModelManifest(manifest);
    await store.setActiveModelRevision(model.camp, model.revision);
    return manifest;
  } finally {
    store.close();
  }
}
