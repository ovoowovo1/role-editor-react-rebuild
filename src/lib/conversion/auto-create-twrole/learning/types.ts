import type { DenseRankerWeights } from './denseRanker';

export const AUTO_CREATE_LEARNING_DB_NAME = 'auto-create-twrole-learning';
export const AUTO_CREATE_LEARNING_DB_VERSION = 1;
export const AUTO_CREATE_LEARNING_STORE_SCHEMA_VERSION = 1;
export const LEARNING_AGGREGATE_VERSION = 1;
export const DEFAULT_LEARNING_FEATURE_SCHEMA = 'auto-create-numeric-v1';
export const DEFAULT_LEARNING_RANKING_POLICY = 'strict-cascade-v1';
export const TRAINING_DATA_FINGERPRINT_VERSION = 'auto-create-training-data-v1';

export type CandidateLearningMode = 'add' | 'replace';

export type CandidateLearningProvenanceKind =
  | 'top-k'
  | 'exploration'
  | 'widening'
  | 'legacy'
  | 'audit';

export interface CandidateLearningProvenance {
  kind: CandidateLearningProvenanceKind;
  /**
   * Probability that this candidate was included in exact evaluation.
   * This is retained so future training can apply inverse-propensity weights.
   */
  inclusionProbability: number;
  rank?: number;
  batch?: number;
}

export interface CandidateLearningPrediction {
  rankingScore: number;
  predictedDecisionMargin?: number;
  validProbability?: number;
}

export interface ExactCandidateLearningOutcome {
  kind: 'exact';
  valid: true;
  globalGainMse: number;
  score: number;
  decisionMargin: number;
}

export interface InvalidCandidateLearningOutcome {
  kind: 'invalid';
  valid: false;
  reason: string;
}

export interface CensoredCandidateLearningOutcome {
  kind: 'censored';
  /**
   * A censored evaluator may know validity before terminating, but it must not
   * be treated as an exact regression label.
   */
  valid?: boolean;
  reason: string;
  upperBoundMse?: number;
  evaluatedPixels?: number;
}

export type CandidateLearningOutcome =
  | ExactCandidateLearningOutcome
  | InvalidCandidateLearningOutcome
  | CensoredCandidateLearningOutcome;

export interface CandidateLearningExampleDraft {
  /**
   * Optional stable identifier, normally derived from run + step + proposal.
   * Reusing it makes appendExamples idempotent.
   */
  sampleId?: string;
  featureSchema: string;
  features: readonly number[] | Float32Array;
  mode: CandidateLearningMode;
  runHash: string;
  targetSignature: string;
  modelRevision: string | null;
  prediction?: CandidateLearningPrediction;
  provenance: CandidateLearningProvenance;
  outcome: CandidateLearningOutcome;
  createdAt?: number;
}

export type LearningReservoirBucket =
  | 'exploration'
  | 'high-positive'
  | 'near-zero'
  | 'general-negative'
  | 'invalid'
  | 'hard-negative'
  | 'hard-positive';

export const LEARNING_RESERVOIR_BUCKETS = [
  'exploration',
  'high-positive',
  'near-zero',
  'general-negative',
  'invalid',
  'hard-negative',
  'hard-positive'
] as const satisfies readonly LearningReservoirBucket[];

export type LearningRetention =
  | { tier: 'recent' }
  | { tier: 'reservoir'; bucket: LearningReservoirBucket };

export interface PersistedCandidateLearningExample {
  id: string;
  camp: string;
  featureSchema: string;
  features: readonly number[];
  mode: CandidateLearningMode;
  runHash: string;
  targetSignature: string;
  modelRevision: string | null;
  prediction?: CandidateLearningPrediction;
  provenance: CandidateLearningProvenance;
  outcome: CandidateLearningOutcome;
  createdAt: number;
  sequence: number;
  estimatedBytes: number;
  retention: LearningRetention;
}

export interface LearningBucketCapacities {
  exploration: number;
  'high-positive': number;
  'near-zero': number;
  'general-negative': number;
  invalid: number;
  'hard-negative': number;
  'hard-positive': number;
}

export interface LearningRetentionLimits {
  maxExamples: number;
  maxEstimatedBytes: number;
  recentCapacity: number;
  bucketCapacities: LearningBucketCapacities;
  nearZeroMargin: number;
  hardPredictionMargin: number;
}

export const DEFAULT_LEARNING_RETENTION_LIMITS: Readonly<LearningRetentionLimits> = {
  maxExamples: 50_000,
  maxEstimatedBytes: 32 * 1024 * 1024,
  recentCapacity: 10_000,
  bucketCapacities: {
    exploration: 10_000,
    'high-positive': 8_000,
    'near-zero': 6_000,
    'general-negative': 4_000,
    invalid: 4_000,
    'hard-negative': 4_000,
    'hard-positive': 4_000
  },
  nearZeroMargin: 1e-7,
  hardPredictionMargin: 1e-7
};

export type LearningRuntimePhase =
  | 'disabled'
  | 'collecting'
  | 'training'
  | 'ready'
  | 'fallback'
  | 'error';

export type LearningRankerRuntime = 'none' | 'tfjs' | 'typed';

export interface LearningTrainerLease {
  ownerId: string;
  expiresAt: number;
}

export interface LearningCampAggregate {
  version: typeof LEARNING_AGGREGATE_VERSION;
  exampleCount: number;
  estimatedBytes: number;
  outcomeCounts: LearningOutcomeCounts;
  modeCounts: LearningModeCounts;
  exactModeCounts: LearningModeCounts;
  recentCount: number;
  reservoirCount: number;
  bucketCounts: Record<LearningReservoirBucket, number>;
  targetSignatures: Record<CandidateLearningMode, string[]>;
}

export interface LearningCampMeta {
  camp: string;
  storeSchemaVersion: number;
  featureSchema: string;
  rankingPolicy: string;
  enabled: boolean;
  phase: LearningRuntimePhase;
  activeModelRevision: string | null;
  stagingModelRevision: string | null;
  runtime: LearningRankerRuntime;
  lastError: string | null;
  lastTrainedAt: number | null;
  trainerLease: LearningTrainerLease | null;
  reservoirSeen: Record<LearningReservoirBucket, number>;
  nextSequence: number;
  storeRevision: number;
  createdAt: number;
  updatedAt: number;
  /**
   * Added lazily so existing version-1 databases can be upgraded without an
   * IndexedDB schema migration or object-store rebuild.
   */
  aggregate?: LearningCampAggregate;
}

export interface LearningModelMetrics {
  validationLoss?: number;
  recallAtK?: number;
  bestCandidateRecall?: number;
  meanRegret?: number;
  p95Regret?: number;
}

export interface LearningModelManifest {
  camp: string;
  revision: string;
  featureSchema: string;
  rankingPolicy: string;
  runtime: Exclude<LearningRankerRuntime, 'none'>;
  modelStorageUrl: string;
  inputSize: number;
  outputSize: 2;
  createdAt: number;
  trainingExampleCount: number;
  targetSignatureCount: number;
  /**
   * Stable fingerprint of the exact tensors and target identities used to
   * train this immutable revision.
   */
  trainingDataFingerprint: string;
  /**
   * Complete, lexically sorted and de-duplicated target signatures that
   * contributed either validity or margin labels to this revision.
   */
  trainingTargetSignatures: readonly string[];
  /** Modes that met their independent readiness gates for this revision. */
  trainedModes: readonly CandidateLearningMode[];
  byteSize?: number;
  metrics?: LearningModelMetrics;
  /**
   * Portable weights used by the TypedArray runtime. TFJS may additionally
   * keep its native model under modelStorageUrl.
   */
  denseWeights?: DenseRankerWeights;
}

export interface LearningExperienceRecord<T = Record<string, unknown>> {
  camp: string;
  version: number;
  updatedAt: number;
  payload: T;
}

export interface LearningOutcomeCounts {
  exact: number;
  invalid: number;
  censored: number;
}

export interface LearningModeCounts {
  add: number;
  replace: number;
}

export interface LearningStoreStatus {
  camp: string;
  enabled: boolean;
  phase: LearningRuntimePhase;
  activeModelRevision: string | null;
  stagingModelRevision: string | null;
  runtime: LearningRankerRuntime;
  lastError: string | null;
  lastTrainedAt: number | null;
  exampleCount: number;
  recentCount: number;
  reservoirCount: number;
  estimatedBytes: number;
  outcomeCounts: LearningOutcomeCounts;
  modeCounts: LearningModeCounts;
  bucketCounts: Record<LearningReservoirBucket, number>;
  exactModeCounts: LearningModeCounts;
  targetSignatureCounts: LearningModeCounts;
}

export interface AppendLearningExamplesResult {
  received: number;
  appended: number;
  retainedFromBatch: number;
  duplicateCount: number;
  evictedCount: number;
  status: LearningStoreStatus;
}

export interface ClearLearningCampResult {
  camp: string;
  removedExamples: number;
  removedModelRevisions: readonly string[];
  modelStorageUrls: readonly string[];
  preservedEnabled: boolean;
}

export interface LearningCampSnapshot {
  meta: LearningCampMeta | null;
  examples: PersistedCandidateLearningExample[];
}

export interface LearningExamplePage {
  examples: PersistedCandidateLearningExample[];
  nextCursor: string | null;
}

export interface LearningExampleCommit {
  camp: string;
  expectedStoreRevision: number;
  meta: LearningCampMeta;
  upsertExamples: readonly PersistedCandidateLearningExample[];
  deleteExampleIds: readonly string[];
}

export interface AtomicAppendLearningExamples {
  camp: string;
  expectedStoreRevision: number;
  baseMeta: LearningCampMeta;
  examples: readonly PersistedCandidateLearningExample[];
}

export interface AtomicAppendLearningExamplesResult {
  committed: boolean;
  appendedIds: readonly string[];
  meta: LearningCampMeta | null;
}

export interface LearningPersistence {
  loadCamp(camp: string): Promise<LearningCampSnapshot>;
  loadExamplePage?(
    camp: string,
    afterStorageKey: string | null,
    limit: number
  ): Promise<LearningExamplePage>;
  loadMeta?(camp: string): Promise<LearningCampMeta | null>;
  appendUnbounded?(
    append: AtomicAppendLearningExamples
  ): Promise<AtomicAppendLearningExamplesResult>;
  commitExamples(commit: LearningExampleCommit): Promise<boolean>;
  listModelManifests(camp: string): Promise<LearningModelManifest[]>;
  putModelManifest(manifest: LearningModelManifest): Promise<void>;
  deleteModelManifests(camp: string, revisions: readonly string[]): Promise<void>;
  getExperience<T = Record<string, unknown>>(camp: string): Promise<LearningExperienceRecord<T> | null>;
  putExperience<T = Record<string, unknown>>(record: LearningExperienceRecord<T>): Promise<void>;
  clearCamp(
    camp: string,
    expectedStoreRevision: number,
    replacementMeta: LearningCampMeta
  ): Promise<boolean>;
  close?(): void;
}
