import {
  AUTO_CREATE_FEATURE_SCHEMA_VERSION,
  AUTO_CREATE_RANKING_POLICY_VERSION,
  type AutoCreateSearchStrategy
} from '../contracts';
import {
  createTfjsDenseRankerPredictor,
  createTypedDenseRankerPredictor,
  validateDenseRankerWeights,
  type DenseRankerPredictor,
  type DenseRankerWeights
} from './denseRanker';
import { createIndexedDbLearningStore } from './indexedDbStore';
import { TRAINING_DATA_FINGERPRINT_VERSION } from './types';

type PortableDenseWeights = {
  dense1Kernel?: ArrayLike<number>;
  dense1Bias?: ArrayLike<number>;
  dense2Kernel?: ArrayLike<number>;
  dense2Bias?: ArrayLike<number>;
  outputKernel?: ArrayLike<number>;
  outputBias?: ArrayLike<number>;
};

export interface LoadedRankerRuntime {
  predictor: DenseRankerPredictor | null;
  readyModes: readonly ('add' | 'replace')[];
  modelRevision: string | null;
  status: 'disabled' | 'collecting' | 'ready' | 'fallback';
  fallbackReason?: string;
}

export function hasValidRankerTrainedModes(
  value: unknown
): value is readonly ('add' | 'replace')[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((mode, index, modes) => (
      (mode === 'add' || mode === 'replace')
      && (index === 0 || modes[index - 1]! < mode)
    ));
}

function asPortableWeights(value: unknown): PortableDenseWeights | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as PortableDenseWeights;
}

export function hydrateDenseRankerWeights(
  revision: string,
  value: unknown
): DenseRankerWeights {
  const portable = asPortableWeights(value);
  if (!portable) throw new Error('Dense ranker weights are missing.');
  const required = [
    'dense1Kernel',
    'dense1Bias',
    'dense2Kernel',
    'dense2Bias',
    'outputKernel',
    'outputBias'
  ] as const;
  for (const key of required) {
    const values = portable[key];
    if (!values || typeof values.length !== 'number') {
      throw new Error(`Dense ranker ${key} is missing.`);
    }
  }
  const weights: DenseRankerWeights = {
    revision,
    featureSchema: AUTO_CREATE_FEATURE_SCHEMA_VERSION,
    inputSize: 64,
    dense1Kernel: Float32Array.from(portable.dense1Kernel!),
    dense1Bias: Float32Array.from(portable.dense1Bias!),
    dense2Kernel: Float32Array.from(portable.dense2Kernel!),
    dense2Bias: Float32Array.from(portable.dense2Bias!),
    outputKernel: Float32Array.from(portable.outputKernel!),
    outputBias: Float32Array.from(portable.outputBias!)
  };
  validateDenseRankerWeights(weights);
  return weights;
}

/**
 * Loads a frozen per-camp revision. Any IndexedDB/model error is converted to
 * an explicit fallback so generation remains available.
 */
export async function loadRankerRuntime(
  camp: string,
  strategy: AutoCreateSearchStrategy,
  requiredRevision?: string | null
): Promise<LoadedRankerRuntime> {
  if (strategy !== 'strict-ml-tfjs' && strategy !== 'strict-ml-typed') {
    return {
      predictor: null,
      readyModes: [],
      modelRevision: null,
      status: strategy === 'legacy' ? 'disabled' : 'ready'
    };
  }
  if (typeof indexedDB === 'undefined') {
    return {
      predictor: null,
      readyModes: [],
      modelRevision: null,
      status: 'fallback',
      fallbackReason: 'indexeddb-unavailable'
    };
  }

  const store = createIndexedDbLearningStore();
  try {
    const status = await store.getStatus(camp);
    if (!status.enabled) {
      return {
        predictor: null,
        readyModes: [],
        modelRevision: null,
        status: 'disabled',
        fallbackReason: 'learning-disabled'
      };
    }
    const revisionFrozen = requiredRevision !== undefined;
    const manifest = revisionFrozen
      ? requiredRevision === null
        ? null
        : (await store.listModelManifests(camp))
            .find((candidate) => candidate.revision === requiredRevision) ?? null
      : await store.getActiveModelManifest(camp);
    if (!manifest) {
      return {
        predictor: null,
        readyModes: [],
        modelRevision: null,
        status: status.phase === 'training' ? 'collecting' : status.phase === 'collecting' ? 'collecting' : 'fallback',
        fallbackReason: revisionFrozen
          ? requiredRevision === null
            ? 'snapshot-frozen-legacy'
            : `snapshot-model-missing:${requiredRevision}`
          : 'model-not-ready'
      };
    }
    if (
      manifest.featureSchema !== AUTO_CREATE_FEATURE_SCHEMA_VERSION
      || manifest.rankingPolicy !== AUTO_CREATE_RANKING_POLICY_VERSION
    ) {
      throw new Error('Active ranker schema or ranking policy does not match this build.');
    }
    if (
      typeof manifest.trainingDataFingerprint !== 'string'
      || !manifest.trainingDataFingerprint.startsWith(`${TRAINING_DATA_FINGERPRINT_VERSION}:`)
      || !/^[0-9a-f]{32}$/.test(
        manifest.trainingDataFingerprint.slice(TRAINING_DATA_FINGERPRINT_VERSION.length + 1)
      )
      || !Array.isArray(manifest.trainingTargetSignatures)
      || manifest.trainingTargetSignatures.length === 0
      || manifest.trainingTargetSignatures.some((signature, index, signatures) => (
        typeof signature !== 'string'
        || signature.length === 0
        || (index > 0 && signatures[index - 1]! >= signature)
      ))
      || !hasValidRankerTrainedModes(manifest.trainedModes)
    ) {
      throw new Error('Active ranker training metadata is missing or corrupt.');
    }
    const denseWeights = (manifest as typeof manifest & { denseWeights?: unknown }).denseWeights;
    const weights = hydrateDenseRankerWeights(manifest.revision, denseWeights);
    const predictor = strategy === 'strict-ml-tfjs'
      ? await createTfjsDenseRankerPredictor(weights)
      : createTypedDenseRankerPredictor(weights);
    return {
      predictor,
      readyModes: [...manifest.trainedModes],
      modelRevision: manifest.revision,
      status: 'ready'
    };
  } catch (error) {
    return {
      predictor: null,
      readyModes: [],
      modelRevision: null,
      status: 'fallback',
      fallbackReason: error instanceof Error ? error.message : String(error)
    };
  } finally {
    store.close();
  }
}

export async function loadLearningExperienceState(camp: string): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null;
  const store = createIndexedDbLearningStore();
  try {
    const record = await store.getExperience<string>(camp);
    return typeof record?.payload === 'string' ? record.payload : null;
  } catch {
    return null;
  } finally {
    store.close();
  }
}
