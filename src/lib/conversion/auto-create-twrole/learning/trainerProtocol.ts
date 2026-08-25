import {
  AUTO_CREATE_FEATURE_SCHEMA_VERSION,
  AUTO_CREATE_RANKING_POLICY_VERSION
} from '../contracts';
import { FEATURE_COUNT } from './featureSchema';
import { TRAINING_DATA_FINGERPRINT_VERSION } from './types';
import type {
  CandidateLearningMode,
  ClearLearningCampResult,
  LearningModelManifest,
  LearningStoreStatus,
  PersistedCandidateLearningExample
} from './types';

export const ADD_TRAINING_MIN_EXACT = 8_000;
export const REPLACE_TRAINING_MIN_EXACT = 512;
export const TRAINING_MIN_TARGET_SIGNATURES = 3;
export const TRAINING_RETRAIN_MIN_NEW_EXAMPLES = 2_000;

export interface AutoCreateTrainingThresholds {
  addExact: number;
  replaceExact: number;
  targetSignatures: number;
}

export const DEFAULT_AUTO_CREATE_TRAINING_THRESHOLDS:
Readonly<AutoCreateTrainingThresholds> = Object.freeze({
  addExact: ADD_TRAINING_MIN_EXACT,
  replaceExact: REPLACE_TRAINING_MIN_EXACT,
  targetSignatures: TRAINING_MIN_TARGET_SIGNATURES
});

export interface AutoCreateModeTrainingReadiness {
  exact: number;
  requiredExact: number;
  targetSignatures: number;
  requiredTargetSignatures: number;
  ready: boolean;
}

export interface AutoCreateTrainingReadiness {
  add: AutoCreateModeTrainingReadiness;
  replace: AutoCreateModeTrainingReadiness;
  eligibleModes: CandidateLearningMode[];
  canTrain: boolean;
}

export interface AutoCreateTrainerOptions {
  force?: boolean;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
}

export interface AutoCreateTrainerSerializedError {
  name: string;
  message: string;
  stack?: string;
}

export interface AutoCreateTrainerStatusRequest {
  type: 'get-status';
  id: string;
  camp: string;
}

export interface AutoCreateTrainerTrainRequest {
  type: 'train';
  id: string;
  camp: string;
  options?: AutoCreateTrainerOptions;
}

export interface AutoCreateTrainerClearRequest {
  type: 'clear';
  id: string;
  camp: string;
  preserveEnabled?: boolean;
}

export interface AutoCreateTrainerSetEnabledRequest {
  type: 'set-enabled';
  id: string;
  camp: string;
  enabled: boolean;
}

export type AutoCreateTrainerRequest =
  | AutoCreateTrainerStatusRequest
  | AutoCreateTrainerTrainRequest
  | AutoCreateTrainerClearRequest
  | AutoCreateTrainerSetEnabledRequest;

export interface AutoCreateTrainerStatusResponse {
  type: 'status';
  id: string;
  status: LearningStoreStatus;
  readiness: AutoCreateTrainingReadiness;
  activeTrainedModes: CandidateLearningMode[];
}

export interface AutoCreateTrainerTrainingResult {
  outcome: 'disabled' | 'collecting' | 'deferred' | 'up-to-date' | 'trained';
  status: LearningStoreStatus;
  readiness: AutoCreateTrainingReadiness;
  manifest: LearningModelManifest | null;
}

export interface AutoCreateTrainerTrainingResponse {
  type: 'training-result';
  id: string;
  result: AutoCreateTrainerTrainingResult;
}

export interface AutoCreateTrainerClearResult {
  cleared: ClearLearningCampResult;
  status: LearningStoreStatus;
  modelCleanupErrors: string[];
}

export interface AutoCreateTrainerClearResponse {
  type: 'clear-result';
  id: string;
  result: AutoCreateTrainerClearResult;
}

export interface AutoCreateTrainerEnabledResponse {
  type: 'enabled-result';
  id: string;
  status: LearningStoreStatus;
}

export interface AutoCreateTrainerErrorResponse {
  type: 'error';
  id: string;
  error: AutoCreateTrainerSerializedError;
  status?: LearningStoreStatus;
}

export type AutoCreateTrainerResponse =
  | AutoCreateTrainerStatusResponse
  | AutoCreateTrainerTrainingResponse
  | AutoCreateTrainerClearResponse
  | AutoCreateTrainerEnabledResponse
  | AutoCreateTrainerErrorResponse;

export interface AutoCreateTrainerDataset {
  featureMatrix: Float32Array;
  validityLabels: Float32Array;
  marginLabels: Float32Array;
  marginMask: Float32Array;
  exampleCount: number;
  exactCount: number;
  invalidCount: number;
  targetSignatureCount: number;
  eligibleModes: CandidateLearningMode[];
  trainingDataFingerprint: string;
  trainingTargetSignatures: string[];
}

function positiveInteger(value: number, fallback: number): number {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function normalizeAutoCreateTrainerOptions(
  options: AutoCreateTrainerOptions = {}
): Required<AutoCreateTrainerOptions> {
  const epochs = Math.min(100, positiveInteger(options.epochs ?? 6, 6));
  const batchSize = Math.min(2_048, positiveInteger(options.batchSize ?? 256, 256));
  const learningRate = Number.isFinite(options.learningRate)
    && (options.learningRate ?? 0) > 0
    ? Math.min(1, options.learningRate as number)
    : 1e-3;
  return {
    force: options.force === true,
    epochs,
    batchSize,
    learningRate
  };
}

function modeReadiness(
  exact: number,
  requiredExact: number,
  targetSignatures: number,
  requiredTargetSignatures: number
): AutoCreateModeTrainingReadiness {
  return {
    exact,
    requiredExact,
    targetSignatures,
    requiredTargetSignatures,
    ready: exact >= requiredExact && targetSignatures >= requiredTargetSignatures
  };
}

/**
 * Computes activation gates only from fully evaluated examples. Invalid and
 * censored candidates never advance either exact-label threshold.
 */
export function evaluateAutoCreateTrainingReadiness(
  examples: readonly PersistedCandidateLearningExample[],
  thresholds: AutoCreateTrainingThresholds = DEFAULT_AUTO_CREATE_TRAINING_THRESHOLDS
): AutoCreateTrainingReadiness {
  const exactCounts = { add: 0, replace: 0 };
  const signatures = {
    add: new Set<string>(),
    replace: new Set<string>()
  };

  for (const example of examples) {
    if (
      example.featureSchema !== AUTO_CREATE_FEATURE_SCHEMA_VERSION
      || example.outcome.kind !== 'exact'
    ) {
      continue;
    }
    exactCounts[example.mode] += 1;
    signatures[example.mode].add(example.targetSignature);
  }

  const add = modeReadiness(
    exactCounts.add,
    thresholds.addExact,
    signatures.add.size,
    thresholds.targetSignatures
  );
  const replace = modeReadiness(
    exactCounts.replace,
    thresholds.replaceExact,
    signatures.replace.size,
    thresholds.targetSignatures
  );
  const eligibleModes: CandidateLearningMode[] = [];
  if (add.ready) eligibleModes.push('add');
  if (replace.ready) eligibleModes.push('replace');
  return {
    add,
    replace,
    eligibleModes,
    canTrain: eligibleModes.length > 0
  };
}

export function evaluateAutoCreateTrainingReadinessFromStatus(
  status: LearningStoreStatus,
  thresholds: AutoCreateTrainingThresholds = DEFAULT_AUTO_CREATE_TRAINING_THRESHOLDS
): AutoCreateTrainingReadiness {
  const add = modeReadiness(
    status.exactModeCounts.add,
    thresholds.addExact,
    status.targetSignatureCounts.add,
    thresholds.targetSignatures
  );
  const replace = modeReadiness(
    status.exactModeCounts.replace,
    thresholds.replaceExact,
    status.targetSignatureCounts.replace,
    thresholds.targetSignatures
  );
  const eligibleModes: CandidateLearningMode[] = [];
  if (add.ready) eligibleModes.push('add');
  if (replace.ready) eligibleModes.push('replace');
  return { add, replace, eligibleModes, canTrain: eligibleModes.length > 0 };
}

function hasExpectedFeatures(
  example: PersistedCandidateLearningExample
): boolean {
  if (
    example.featureSchema !== AUTO_CREATE_FEATURE_SCHEMA_VERSION
    || example.features.length !== FEATURE_COUNT
  ) {
    return false;
  }
  for (let index = 0; index < example.features.length; index += 1) {
    if (!Number.isFinite(example.features[index])) return false;
  }
  return true;
}

function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

class DatasetFingerprintBuilder {
  private first = 0x811c9dc5;
  private second = 0x9e3779b9;
  private third = 0x85ebca6b;
  private fourth = 0xc2b2ae35;
  private readonly floatBuffer = new ArrayBuffer(4);
  private readonly floatView = new DataView(this.floatBuffer);

  private addWord(value: number): void {
    const word = value >>> 0;
    this.first = Math.imul(this.first ^ word, 0x01000193) >>> 0;
    this.second = Math.imul(this.second ^ word, 0x27d4eb2d) >>> 0;
    this.second ^= this.second >>> 15;
    this.third = Math.imul(this.third ^ word, 0x85ebca6b) >>> 0;
    this.third ^= this.third >>> 13;
    this.fourth = Math.imul(this.fourth ^ word, 0xc2b2ae35) >>> 0;
    this.fourth ^= this.fourth >>> 16;
  }

  addString(value: string): void {
    this.addWord(value.length);
    for (let index = 0; index < value.length; index += 1) {
      this.addWord(value.charCodeAt(index));
    }
  }

  addFloat32Array(values: Float32Array): void {
    this.addWord(values.length);
    for (let index = 0; index < values.length; index += 1) {
      this.floatView.setFloat32(0, values[index], true);
      this.addWord(this.floatView.getUint32(0, true));
    }
  }

  finish(): string {
    const hex = (value: number): string => (value >>> 0).toString(16).padStart(8, '0');
    return `${TRAINING_DATA_FINGERPRINT_VERSION}:${
      hex(this.first)
    }${hex(this.second)}${hex(this.third)}${hex(this.fourth)}`;
  }
}

function fingerprintDataset(
  featureMatrix: Float32Array,
  validityLabels: Float32Array,
  marginLabels: Float32Array,
  marginMask: Float32Array,
  eligibleModes: readonly CandidateLearningMode[],
  trainingTargetSignatures: readonly string[]
): string {
  const fingerprint = new DatasetFingerprintBuilder();
  fingerprint.addString(AUTO_CREATE_FEATURE_SCHEMA_VERSION);
  fingerprint.addString(AUTO_CREATE_RANKING_POLICY_VERSION);
  for (const mode of eligibleModes) fingerprint.addString(mode);
  for (const signature of trainingTargetSignatures) fingerprint.addString(signature);
  fingerprint.addFloat32Array(featureMatrix);
  fingerprint.addFloat32Array(validityLabels);
  fingerprint.addFloat32Array(marginLabels);
  fingerprint.addFloat32Array(marginMask);
  return fingerprint.finish();
}

/**
 * Builds the two-head training labels. Exact candidates train validity and
 * margin; invalid candidates train validity only; censored candidates are
 * deliberately omitted.
 */
export function buildAutoCreateTrainerDataset(
  examples: readonly PersistedCandidateLearningExample[],
  readiness: AutoCreateTrainingReadiness
): AutoCreateTrainerDataset {
  const eligibleModes = new Set(readiness.eligibleModes);
  const selected = examples
    .filter((example) => (
      eligibleModes.has(example.mode)
      && example.outcome.kind !== 'censored'
      && hasExpectedFeatures(example)
    ))
    .sort((left, right) => (
      lexicalCompare(left.id, right.id)
      || lexicalCompare(left.mode, right.mode)
      || lexicalCompare(left.targetSignature, right.targetSignature)
      || left.sequence - right.sequence
    ));
  const featureMatrix = new Float32Array(selected.length * FEATURE_COUNT);
  const validityLabels = new Float32Array(selected.length);
  const marginLabels = new Float32Array(selected.length);
  const marginMask = new Float32Array(selected.length);
  const exactTargetSignatures = new Set<string>();
  const trainingTargetSignatureSet = new Set<string>();
  let exactCount = 0;
  let invalidCount = 0;

  selected.forEach((example, row) => {
    trainingTargetSignatureSet.add(example.targetSignature);
    featureMatrix.set(example.features, row * FEATURE_COUNT);
    if (example.outcome.kind === 'exact') {
      validityLabels[row] = 1;
      marginLabels[row] = example.outcome.decisionMargin;
      marginMask[row] = 1;
      exactCount += 1;
      exactTargetSignatures.add(`${example.mode}:${example.targetSignature}`);
    } else {
      validityLabels[row] = 0;
      invalidCount += 1;
    }
  });
  const trainingTargetSignatures = [...trainingTargetSignatureSet].sort(lexicalCompare);
  const eligibleModeList = [...readiness.eligibleModes];

  return {
    featureMatrix,
    validityLabels,
    marginLabels,
    marginMask,
    exampleCount: selected.length,
    exactCount,
    invalidCount,
    targetSignatureCount: exactTargetSignatures.size,
    eligibleModes: eligibleModeList,
    trainingDataFingerprint: fingerprintDataset(
      featureMatrix,
      validityLabels,
      marginLabels,
      marginMask,
      eligibleModeList,
      trainingTargetSignatures
    ),
    trainingTargetSignatures
  };
}

export function isTrainerManifestCompatible(
  manifest: LearningModelManifest | null
): manifest is LearningModelManifest {
  return Boolean(
    manifest
    && manifest.featureSchema === AUTO_CREATE_FEATURE_SCHEMA_VERSION
    && manifest.rankingPolicy === AUTO_CREATE_RANKING_POLICY_VERSION
    && manifest.inputSize === FEATURE_COUNT
    && manifest.outputSize === 2
    && typeof manifest.trainingDataFingerprint === 'string'
    && manifest.trainingDataFingerprint.startsWith(`${TRAINING_DATA_FINGERPRINT_VERSION}:`)
    && Array.isArray(manifest.trainingTargetSignatures)
    && manifest.trainingTargetSignatures.length > 0
    && manifest.trainingTargetSignatures.every((signature, index, signatures) => (
      typeof signature === 'string'
      && signature.length > 0
      && (index === 0 || signatures[index - 1]! < signature)
    ))
    && Array.isArray(manifest.trainedModes)
    && manifest.trainedModes.length > 0
    && manifest.trainedModes.every((mode, index, modes) => (
      (mode === 'add' || mode === 'replace')
      && (index === 0 || modes[index - 1]! < mode)
    ))
    && manifest.denseWeights
  );
}

export function isTrainerManifestUpToDate(
  manifest: LearningModelManifest | null,
  dataset: AutoCreateTrainerDataset
): manifest is LearningModelManifest {
  if (
    !isTrainerManifestCompatible(manifest)
    || manifest.trainingDataFingerprint !== dataset.trainingDataFingerprint
  ) {
    return false;
  }
  const trainedModes = new Set<CandidateLearningMode>(manifest.trainedModes);
  return dataset.eligibleModes.every((mode) => trainedModes.has(mode));
}

export function shouldRetrainAutoCreateModel(
  manifest: LearningModelManifest | null,
  dataset: AutoCreateTrainerDataset,
  minimumNewExamples = TRAINING_RETRAIN_MIN_NEW_EXAMPLES
): boolean {
  if (!isTrainerManifestCompatible(manifest)) return true;
  const trainedModes = new Set(manifest.trainedModes);
  if (dataset.eligibleModes.some((mode) => !trainedModes.has(mode))) return true;
  const trainedSignatures = new Set(manifest.trainingTargetSignatures);
  if (dataset.trainingTargetSignatures.some((signature) => !trainedSignatures.has(signature))) {
    return true;
  }
  return dataset.exampleCount - manifest.trainingExampleCount >= minimumNewExamples;
}
