import {
  AUTO_CREATE_LEARNING_STORE_SCHEMA_VERSION,
  DEFAULT_LEARNING_FEATURE_SCHEMA,
  DEFAULT_LEARNING_RANKING_POLICY,
  LEARNING_AGGREGATE_VERSION,
  LEARNING_RESERVOIR_BUCKETS,
  TRAINING_DATA_FINGERPRINT_VERSION
} from './types';
import {
  cloneDefaultLearningRetentionLimits,
  emptyReservoirSeen,
  updateLearningReservoir,
  validateLearningRetentionLimits
} from './reservoir';
import type { ReservoirRandom } from './reservoir';
import {
  NOOP_LEARNING_EXCLUSIVE_COORDINATOR,
  type LearningExclusiveCoordinator
} from './exclusiveCoordinator';
import { validateDenseRankerWeights } from './denseRanker';
import type {
  AppendLearningExamplesResult,
  CandidateLearningExampleDraft,
  CandidateLearningOutcome,
  CandidateLearningPrediction,
  CandidateLearningProvenance,
  ClearLearningCampResult,
  LearningCampMeta,
  LearningCampAggregate,
  LearningExperienceRecord,
  LearningModelManifest,
  LearningPersistence,
  LearningRankerRuntime,
  LearningRetentionLimits,
  LearningRuntimePhase,
  LearningStoreStatus,
  LearningTrainerLease,
  PersistedCandidateLearningExample
} from './types';

const DEFAULT_MAX_APPEND_BATCH = 12_000;
const MAX_FEATURE_COUNT = 4096;
const MAX_COMMIT_RETRIES = 12;
const INITIAL_COMMIT_RETRY_DELAY_MS = 5;
const MAX_COMMIT_RETRY_DELAY_MS = 250;
const COMMIT_RETRY_JITTER_MS = 5;

interface PreparedLearningExample {
  id: string;
  featureSchema: string;
  features: number[];
  mode: CandidateLearningExampleDraft['mode'];
  runHash: string;
  targetSignature: string;
  modelRevision: string | null;
  prediction?: CandidateLearningPrediction;
  provenance: CandidateLearningProvenance;
  outcome: CandidateLearningOutcome;
  createdAt: number;
}

function immutableManifestValueEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
    if (!ArrayBuffer.isView(left) || !ArrayBuffer.isView(right)) return false;
    if (left.constructor !== right.constructor || left.byteLength !== right.byteLength) return false;
    const leftBytes = new Uint8Array(left.buffer, left.byteOffset, left.byteLength);
    const rightBytes = new Uint8Array(right.buffer, right.byteOffset, right.byteLength);
    for (let index = 0; index < leftBytes.length; index += 1) {
      if (leftBytes[index] !== rightBytes[index]) return false;
    }
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => immutableManifestValueEqual(value, right[index]));
  }
  if (
    left === null
    || right === null
    || typeof left !== 'object'
    || typeof right !== 'object'
  ) {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => (
      key === rightKeys[index]
      && immutableManifestValueEqual(leftRecord[key], rightRecord[key])
    ));
}

export function learningModelManifestsEqual(
  left: LearningModelManifest,
  right: LearningModelManifest
): boolean {
  return immutableManifestValueEqual(left, right);
}

export interface AutoCreateLearningStoreOptions {
  persistence: LearningPersistence;
  retentionMode?: 'unbounded' | 'bounded';
  limits?: LearningRetentionLimits;
  featureSchema?: string;
  rankingPolicy?: string;
  maxAppendBatch?: number;
  /**
   * @deprecated Immutable model revisions are retained until clearCamp().
   * Kept temporarily so older callers do not need an immediate config change.
   */
  maxModelManifests?: number;
  now?: () => number;
  random?: ReservoirRandom;
  createId?: () => string;
  exclusiveCoordinator?: LearningExclusiveCoordinator;
  commitRetryDelay?: (conflictIndex: number) => Promise<void>;
}

export interface LearningExampleQuery {
  mode?: CandidateLearningExampleDraft['mode'];
  outcomes?: readonly CandidateLearningOutcome['kind'][];
  featureSchema?: string;
  limit?: number;
}

export interface LearningRuntimeStatePatch {
  phase?: LearningRuntimePhase;
  runtime?: LearningRankerRuntime;
  lastError?: string | null;
  lastTrainedAt?: number | null;
  stagingModelRevision?: string | null;
  trainerLease?: LearningTrainerLease | null;
}

function requireNonEmptyString(value: string, name: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} must not be empty.`);
  return trimmed;
}

function requireFinite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`);
  return value;
}

function requireOptionalFinite(value: number | undefined, name: string): number | undefined {
  return value === undefined ? undefined : requireFinite(value, name);
}

export function normalizeLearningCampScope(camp: string): string {
  return requireNonEmptyString(camp, 'camp').toLocaleLowerCase('en-US');
}

function defaultCommitRetryDelay(conflictIndex: number): Promise<void> {
  const exponent = Math.max(0, Math.floor(conflictIndex));
  const baseDelay = Math.min(
    MAX_COMMIT_RETRY_DELAY_MS,
    INITIAL_COMMIT_RETRY_DELAY_MS * (2 ** exponent)
  );
  const jitter = Math.floor(Math.random() * COMMIT_RETRY_JITTER_MS);
  return new Promise((resolve) => {
    setTimeout(resolve, baseDelay + jitter);
  });
}

function normalizePrediction(
  prediction: CandidateLearningPrediction | undefined
): CandidateLearningPrediction | undefined {
  if (!prediction) return undefined;
  const validProbability = requireOptionalFinite(
    prediction.validProbability,
    'prediction.validProbability'
  );
  if (
    validProbability !== undefined &&
    (validProbability < 0 || validProbability > 1)
  ) {
    throw new Error('prediction.validProbability must be within [0, 1].');
  }
  return {
    rankingScore: requireFinite(prediction.rankingScore, 'prediction.rankingScore'),
    predictedDecisionMargin: requireOptionalFinite(
      prediction.predictedDecisionMargin,
      'prediction.predictedDecisionMargin'
    ),
    validProbability
  };
}

function normalizeProvenance(
  provenance: CandidateLearningProvenance
): CandidateLearningProvenance {
  const inclusionProbability = requireFinite(
    provenance.inclusionProbability,
    'provenance.inclusionProbability'
  );
  if (inclusionProbability <= 0 || inclusionProbability > 1) {
    throw new Error('provenance.inclusionProbability must be within (0, 1].');
  }
  if (
    provenance.rank !== undefined &&
    (!Number.isInteger(provenance.rank) || provenance.rank < 0)
  ) {
    throw new Error('provenance.rank must be a non-negative integer.');
  }
  if (
    provenance.batch !== undefined &&
    (!Number.isInteger(provenance.batch) || provenance.batch < 0)
  ) {
    throw new Error('provenance.batch must be a non-negative integer.');
  }
  return { ...provenance, inclusionProbability };
}

function normalizeOutcome(outcome: CandidateLearningOutcome): CandidateLearningOutcome {
  if (outcome.kind === 'invalid') {
    return {
      kind: 'invalid',
      valid: false,
      reason: requireNonEmptyString(outcome.reason, 'outcome.reason')
    };
  }
  if (outcome.kind === 'censored') {
    if (
      outcome.evaluatedPixels !== undefined &&
      (!Number.isInteger(outcome.evaluatedPixels) || outcome.evaluatedPixels < 0)
    ) {
      throw new Error('outcome.evaluatedPixels must be a non-negative integer.');
    }
    return {
      kind: 'censored',
      valid: outcome.valid,
      reason: requireNonEmptyString(outcome.reason, 'outcome.reason'),
      upperBoundMse: requireOptionalFinite(outcome.upperBoundMse, 'outcome.upperBoundMse'),
      evaluatedPixels: outcome.evaluatedPixels
    };
  }
  return {
    kind: 'exact',
    valid: true,
    globalGainMse: requireFinite(outcome.globalGainMse, 'outcome.globalGainMse'),
    score: requireFinite(outcome.score, 'outcome.score'),
    decisionMargin: requireFinite(outcome.decisionMargin, 'outcome.decisionMargin')
  };
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function estimateLearningExampleBytes(
  example: Omit<PersistedCandidateLearningExample, 'estimatedBytes'>
): number {
  // IndexedDB implementation overhead differs by browser. The fixed allowance
  // makes this estimate conservative while keeping it deterministic in tests.
  return utf8Length(JSON.stringify(example)) + 128;
}

function defaultId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUuid) return randomUuid();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function buildLearningCampAggregate(
  examples: readonly PersistedCandidateLearningExample[]
): LearningCampAggregate {
  const bucketCounts = emptyReservoirSeen();
  const outcomeCounts = { exact: 0, invalid: 0, censored: 0 };
  const modeCounts = { add: 0, replace: 0 };
  const exactModeCounts = { add: 0, replace: 0 };
  const targetSets = { add: new Set<string>(), replace: new Set<string>() };
  let recentCount = 0;
  let estimatedBytes = 0;
  for (const example of examples) {
    estimatedBytes += Math.max(0, example.estimatedBytes);
    outcomeCounts[example.outcome.kind] += 1;
    modeCounts[example.mode] += 1;
    if (example.outcome.kind === 'exact') {
      exactModeCounts[example.mode] += 1;
      targetSets[example.mode].add(example.targetSignature);
    }
    if (example.retention.tier === 'recent') recentCount += 1;
    else bucketCounts[example.retention.bucket] += 1;
  }
  return {
    version: LEARNING_AGGREGATE_VERSION,
    exampleCount: examples.length,
    estimatedBytes,
    outcomeCounts,
    modeCounts,
    exactModeCounts,
    recentCount,
    reservoirCount: examples.length - recentCount,
    bucketCounts,
    targetSignatures: {
      add: [...targetSets.add].sort(),
      replace: [...targetSets.replace].sort()
    }
  };
}

export function createDefaultLearningCampMeta(
  camp: string,
  options: {
    now?: number;
    featureSchema?: string;
    rankingPolicy?: string;
    enabled?: boolean;
    storeRevision?: number;
  } = {}
): LearningCampMeta {
  const normalizedCamp = normalizeLearningCampScope(camp);
  const now = options.now ?? Date.now();
  const enabled = options.enabled ?? true;
  return {
    camp: normalizedCamp,
    storeSchemaVersion: AUTO_CREATE_LEARNING_STORE_SCHEMA_VERSION,
    featureSchema: options.featureSchema ?? DEFAULT_LEARNING_FEATURE_SCHEMA,
    rankingPolicy: options.rankingPolicy ?? DEFAULT_LEARNING_RANKING_POLICY,
    enabled,
    phase: enabled ? 'collecting' : 'disabled',
    activeModelRevision: null,
    stagingModelRevision: null,
    runtime: 'none',
    lastError: null,
    lastTrainedAt: null,
    trainerLease: null,
    reservoirSeen: emptyReservoirSeen(),
    nextSequence: 0,
    storeRevision: options.storeRevision ?? 0,
    createdAt: now,
    updatedAt: now,
    aggregate: buildLearningCampAggregate([])
  };
}

function retentionKey(example: PersistedCandidateLearningExample): string {
  return example.retention.tier === 'recent'
    ? 'recent'
    : `reservoir:${example.retention.bucket}`;
}

function buildStatus(
  camp: string,
  meta: LearningCampMeta,
  examples: readonly PersistedCandidateLearningExample[]
): LearningStoreStatus {
  const aggregate = meta.aggregate ?? buildLearningCampAggregate(examples);
  return buildStatusFromAggregate(camp, meta, aggregate);
}

function buildStatusFromAggregate(
  camp: string,
  meta: LearningCampMeta,
  aggregate: LearningCampAggregate
): LearningStoreStatus {
  return {
    camp,
    enabled: meta.enabled,
    phase: meta.enabled ? meta.phase : 'disabled',
    activeModelRevision: meta.activeModelRevision,
    stagingModelRevision: meta.stagingModelRevision,
    runtime: meta.runtime,
    lastError: meta.lastError,
    lastTrainedAt: meta.lastTrainedAt,
    exampleCount: aggregate.exampleCount,
    recentCount: aggregate.recentCount,
    reservoirCount: aggregate.reservoirCount,
    estimatedBytes: aggregate.estimatedBytes,
    outcomeCounts: { ...aggregate.outcomeCounts },
    modeCounts: { ...aggregate.modeCounts },
    bucketCounts: { ...aggregate.bucketCounts },
    exactModeCounts: { ...aggregate.exactModeCounts },
    targetSignatureCounts: {
      add: aggregate.targetSignatures.add.length,
      replace: aggregate.targetSignatures.replace.length
    }
  };
}

export class AutoCreateLearningStore {
  private readonly persistence: LearningPersistence;
  private readonly limits: LearningRetentionLimits;
  private readonly retentionMode: 'unbounded' | 'bounded';
  private readonly featureSchema: string;
  private readonly rankingPolicy: string;
  private readonly maxAppendBatch: number;
  private readonly now: () => number;
  private readonly random: ReservoirRandom;
  private readonly createId: () => string;
  private readonly exclusiveCoordinator: LearningExclusiveCoordinator;
  private readonly commitRetryDelay: (conflictIndex: number) => Promise<void>;
  private readonly campQueues = new Map<string, Promise<void>>();

  constructor(options: AutoCreateLearningStoreOptions) {
    this.persistence = options.persistence;
    this.retentionMode = options.retentionMode ?? (options.limits ? 'bounded' : 'unbounded');
    this.limits = validateLearningRetentionLimits(
      options.limits ?? cloneDefaultLearningRetentionLimits()
    );
    this.featureSchema = requireNonEmptyString(
      options.featureSchema ?? DEFAULT_LEARNING_FEATURE_SCHEMA,
      'featureSchema'
    );
    this.rankingPolicy = requireNonEmptyString(
      options.rankingPolicy ?? DEFAULT_LEARNING_RANKING_POLICY,
      'rankingPolicy'
    );
    this.maxAppendBatch = options.maxAppendBatch ?? DEFAULT_MAX_APPEND_BATCH;
    if (!Number.isInteger(this.maxAppendBatch) || this.maxAppendBatch <= 0) {
      throw new Error('maxAppendBatch must be a positive integer.');
    }
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
    this.createId = options.createId ?? defaultId;
    this.exclusiveCoordinator =
      options.exclusiveCoordinator ?? NOOP_LEARNING_EXCLUSIVE_COORDINATOR;
    this.commitRetryDelay = options.commitRetryDelay ?? defaultCommitRetryDelay;
  }

  private enqueue<T>(camp: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.campQueues.get(camp) ?? Promise.resolve();
    const coordinated = () => this.exclusiveCoordinator.runExclusive(camp, operation);
    const current = previous.then(coordinated, coordinated);
    const tracked = current.then(
      () => undefined,
      () => undefined
    );
    this.campQueues.set(camp, tracked);
    void tracked.then(() => {
      if (this.campQueues.get(camp) === tracked) this.campQueues.delete(camp);
    });
    return current;
  }

  private defaultMeta(camp: string, storeRevision = 0): LearningCampMeta {
    return createDefaultLearningCampMeta(camp, {
      now: this.now(),
      featureSchema: this.featureSchema,
      rankingPolicy: this.rankingPolicy,
      storeRevision
    });
  }

  private prepareDraft(draft: CandidateLearningExampleDraft): PreparedLearningExample {
    const features = Array.from(draft.features);
    if (features.length === 0 || features.length > MAX_FEATURE_COUNT) {
      throw new Error(`features must contain between 1 and ${MAX_FEATURE_COUNT} values.`);
    }
    features.forEach((value, index) => requireFinite(value, `features[${index}]`));
    const createdAt = draft.createdAt ?? this.now();
    requireFinite(createdAt, 'createdAt');
    return {
      id: requireNonEmptyString(draft.sampleId ?? this.createId(), 'sampleId'),
      featureSchema: requireNonEmptyString(draft.featureSchema, 'featureSchema'),
      features,
      mode: draft.mode,
      runHash: requireNonEmptyString(draft.runHash, 'runHash'),
      targetSignature: requireNonEmptyString(draft.targetSignature, 'targetSignature'),
      modelRevision: draft.modelRevision === null
        ? null
        : requireNonEmptyString(draft.modelRevision, 'modelRevision'),
      prediction: normalizePrediction(draft.prediction),
      provenance: normalizeProvenance(draft.provenance),
      outcome: normalizeOutcome(draft.outcome),
      createdAt
    };
  }

  private async loadMetaWithAggregate(camp: string): Promise<LearningCampMeta> {
    const meta = await (this.persistence.loadMeta?.(camp)
      ?? this.persistence.loadCamp(camp).then((snapshot) => snapshot.meta));
    if (meta?.aggregate?.version === LEARNING_AGGREGATE_VERSION) return meta;

    // Version-1 databases have no aggregate. Scan once, then persist the
    // reconstructed counters with the same optimistic concurrency semantics.
    const snapshot = await this.persistence.loadCamp(camp);
    const previous = snapshot.meta ?? this.defaultMeta(camp);
    if (
      snapshot.meta
      && previous.aggregate?.version === LEARNING_AGGREGATE_VERSION
    ) return previous;
    const migrated: LearningCampMeta = {
      ...previous,
      aggregate: buildLearningCampAggregate(snapshot.examples),
      storeRevision: previous.storeRevision + 1,
      updatedAt: this.now()
    };
    const committed = await this.persistence.commitExamples({
      camp,
      expectedStoreRevision: previous.storeRevision,
      meta: migrated,
      upsertExamples: [],
      deleteExampleIds: []
    });
    if (committed) return migrated;
    return this.loadMetaWithAggregate(camp);
  }

  private async appendExamplesUnbounded(
    camp: string,
    prepared: readonly PreparedLearningExample[],
    received: number
  ): Promise<AppendLearningExamplesResult> {
    if (!this.persistence.appendUnbounded) {
      // Compatibility path for deterministic/in-memory test persistence.
      // Browser production persistence always implements the incremental
      // transaction below and therefore never loads the full camp here.
      for (let attempt = 0; attempt < MAX_COMMIT_RETRIES; attempt += 1) {
        const snapshot = await this.persistence.loadCamp(camp);
        const oldMeta = snapshot.meta ?? this.defaultMeta(camp);
        const existingIds = new Set(snapshot.examples.map((example) => example.id));
        const batchIds = new Set<string>();
        let duplicateCount = 0;
        let nextSequence = oldMeta.nextSequence;
        const incoming: PersistedCandidateLearningExample[] = [];
        for (const example of prepared) {
          if (existingIds.has(example.id) || batchIds.has(example.id)) {
            duplicateCount += 1;
            continue;
          }
          batchIds.add(example.id);
          const withoutEstimate: Omit<PersistedCandidateLearningExample, 'estimatedBytes'> = {
            ...example,
            camp,
            sequence: nextSequence++,
            retention: { tier: 'recent' }
          };
          incoming.push({
            ...withoutEstimate,
            estimatedBytes: estimateLearningExampleBytes(withoutEstimate)
          });
        }
        const allExamples = [...snapshot.examples, ...incoming];
        const nextMeta: LearningCampMeta = {
          ...oldMeta,
          featureSchema: this.featureSchema,
          rankingPolicy: this.rankingPolicy,
          nextSequence,
          storeRevision: oldMeta.storeRevision + 1,
          updatedAt: this.now(),
          aggregate: buildLearningCampAggregate(allExamples)
        };
        const committed = await this.persistence.commitExamples({
          camp,
          expectedStoreRevision: oldMeta.storeRevision,
          meta: nextMeta,
          upsertExamples: incoming,
          deleteExampleIds: []
        });
        if (!committed) {
          if (attempt + 1 < MAX_COMMIT_RETRIES) await this.commitRetryDelay(attempt);
          continue;
        }
        return {
          received,
          appended: incoming.length,
          retainedFromBatch: incoming.length,
          duplicateCount,
          evictedCount: 0,
          status: buildStatusFromAggregate(camp, nextMeta, nextMeta.aggregate!)
        };
      }
      throw new Error(`Could not append learning examples for "${camp}" due to concurrent updates.`);
    }
    for (let attempt = 0; attempt < MAX_COMMIT_RETRIES; attempt += 1) {
      const oldMeta = await this.loadMetaWithAggregate(camp);
      let nextSequence = oldMeta.nextSequence;
      const batchIds = new Set<string>();
      let duplicateWithinBatch = 0;
      const incoming: PersistedCandidateLearningExample[] = [];
      for (const example of prepared) {
        if (batchIds.has(example.id)) {
          duplicateWithinBatch += 1;
          continue;
        }
        batchIds.add(example.id);
        const withoutEstimate: Omit<PersistedCandidateLearningExample, 'estimatedBytes'> = {
          ...example,
          camp,
          sequence: nextSequence++,
          retention: { tier: 'recent' }
        };
        incoming.push({
          ...withoutEstimate,
          estimatedBytes: estimateLearningExampleBytes(withoutEstimate)
        });
      }
      const result = await this.persistence.appendUnbounded({
        camp,
        expectedStoreRevision: oldMeta.storeRevision,
        baseMeta: {
          ...oldMeta,
          featureSchema: this.featureSchema,
          rankingPolicy: this.rankingPolicy,
          nextSequence,
          storeRevision: oldMeta.storeRevision + 1,
          updatedAt: this.now()
        },
        examples: incoming
      });
      if (!result.committed || !result.meta) {
        if (attempt + 1 < MAX_COMMIT_RETRIES) await this.commitRetryDelay(attempt);
        continue;
      }
      const appended = result.appendedIds.length;
      return {
        received,
        appended,
        retainedFromBatch: appended,
        duplicateCount: duplicateWithinBatch + incoming.length - appended,
        evictedCount: 0,
        status: buildStatusFromAggregate(camp, result.meta, result.meta.aggregate!)
      };
    }
    throw new Error(`Could not append learning examples for "${camp}" due to concurrent updates.`);
  }

  async appendExamples(
    campScope: string,
    drafts: readonly CandidateLearningExampleDraft[]
  ): Promise<AppendLearningExamplesResult> {
    const camp = normalizeLearningCampScope(campScope);
    if (drafts.length > this.maxAppendBatch) {
      throw new Error(`appendExamples accepts at most ${this.maxAppendBatch} records per batch.`);
    }
    const prepared = drafts.map((draft) => this.prepareDraft(draft));

    return this.enqueue(camp, async () => {
      if (this.retentionMode === 'unbounded') {
        return this.appendExamplesUnbounded(camp, prepared, drafts.length);
      }
      for (let attempt = 0; attempt < MAX_COMMIT_RETRIES; attempt += 1) {
        const snapshot = await this.persistence.loadCamp(camp);
        const oldMeta = snapshot.meta ?? this.defaultMeta(camp);
        const existingById = new Map(
          snapshot.examples.map((example) => [example.id, example])
        );
        const batchIds = new Set<string>();
        const uniquePrepared: PreparedLearningExample[] = [];
        let duplicateCount = 0;
        for (const example of prepared) {
          if (existingById.has(example.id) || batchIds.has(example.id)) {
            duplicateCount += 1;
            continue;
          }
          batchIds.add(example.id);
          uniquePrepared.push(example);
        }

        let nextSequence = oldMeta.nextSequence;
        const incoming = uniquePrepared.map((example) => {
          const withoutEstimate: Omit<PersistedCandidateLearningExample, 'estimatedBytes'> = {
            ...example,
            camp,
            sequence: nextSequence,
            retention: { tier: 'recent' }
          };
          nextSequence += 1;
          return {
            ...withoutEstimate,
            estimatedBytes: estimateLearningExampleBytes(withoutEstimate)
          };
        });
        const reservoirUpdate = updateLearningReservoir(
          {
            examples: snapshot.examples,
            reservoirSeen: oldMeta.reservoirSeen
          },
          incoming,
          { limits: this.limits, random: this.random }
        );
        const nextById = new Map(
          reservoirUpdate.examples.map((example) => [example.id, example])
        );
        const upsertExamples = reservoirUpdate.examples.filter((example) => {
          const previous = existingById.get(example.id);
          return !previous || retentionKey(previous) !== retentionKey(example);
        });
        const deleteExampleIds = snapshot.examples
          .filter((example) => !nextById.has(example.id))
          .map((example) => example.id);
        const now = this.now();
        const nextMeta: LearningCampMeta = {
          ...oldMeta,
          camp,
          featureSchema: this.featureSchema,
          rankingPolicy: this.rankingPolicy,
          reservoirSeen: reservoirUpdate.reservoirSeen,
          nextSequence,
          storeRevision: oldMeta.storeRevision + 1,
          updatedAt: now
        };
        nextMeta.aggregate = buildLearningCampAggregate(reservoirUpdate.examples);
        const committed = await this.persistence.commitExamples({
          camp,
          expectedStoreRevision: oldMeta.storeRevision,
          meta: nextMeta,
          upsertExamples,
          deleteExampleIds
        });
        if (!committed) {
          if (attempt + 1 < MAX_COMMIT_RETRIES) {
            await this.commitRetryDelay(attempt);
          }
          continue;
        }

        const retainedFromBatch = uniquePrepared.reduce(
          (count, example) => count + Number(nextById.has(example.id)),
          0
        );
        return {
          received: drafts.length,
          appended: uniquePrepared.length,
          retainedFromBatch,
          duplicateCount,
          evictedCount: reservoirUpdate.evictedIds.length,
          status: buildStatus(camp, nextMeta, reservoirUpdate.examples)
        };
      }
      throw new Error(`Could not append learning examples for "${camp}" due to concurrent updates.`);
    });
  }

  async getExamples(
    campScope: string,
    query: LearningExampleQuery = {}
  ): Promise<PersistedCandidateLearningExample[]> {
    const camp = normalizeLearningCampScope(campScope);
    const snapshot = await this.persistence.loadCamp(camp);
    const outcomes = query.outcomes ? new Set(query.outcomes) : null;
    const limit = query.limit === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Math.floor(query.limit));
    return snapshot.examples
      .filter((example) => (
        (query.mode === undefined || example.mode === query.mode) &&
        (query.featureSchema === undefined || example.featureSchema === query.featureSchema) &&
        (!outcomes || outcomes.has(example.outcome.kind))
      ))
      .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id))
      .slice(0, limit);
  }

  async getMeta(campScope: string): Promise<LearningCampMeta> {
    const camp = normalizeLearningCampScope(campScope);
    return this.loadMetaWithAggregate(camp);
  }

  async getStatus(campScope: string): Promise<LearningStoreStatus> {
    const camp = normalizeLearningCampScope(campScope);
    const meta = await this.loadMetaWithAggregate(camp);
    return buildStatusFromAggregate(camp, meta, meta.aggregate!);
  }

  private async mutateMeta(
    camp: string,
    mutator: (meta: LearningCampMeta) => LearningCampMeta
  ): Promise<LearningCampMeta> {
    for (let attempt = 0; attempt < MAX_COMMIT_RETRIES; attempt += 1) {
      const previous = await this.loadMetaWithAggregate(camp);
      const now = this.now();
      const next = mutator({
        ...previous,
        reservoirSeen: { ...previous.reservoirSeen }
      });
      const committedMeta = {
        ...next,
        camp,
        storeRevision: previous.storeRevision + 1,
        updatedAt: now
      };
      const committed = await this.persistence.commitExamples({
        camp,
        expectedStoreRevision: previous.storeRevision,
        meta: committedMeta,
        upsertExamples: [],
        deleteExampleIds: []
      });
      if (committed) return committedMeta;
      if (attempt + 1 < MAX_COMMIT_RETRIES) {
        await this.commitRetryDelay(attempt);
      }
    }
    throw new Error(`Could not update learning metadata for "${camp}" due to concurrent updates.`);
  }

  async setEnabled(campScope: string, enabled: boolean): Promise<LearningStoreStatus> {
    const camp = normalizeLearningCampScope(campScope);
    return this.enqueue(camp, async () => {
      await this.mutateMeta(camp, (meta) => ({
        ...meta,
        enabled,
        phase: enabled
          ? (meta.activeModelRevision ? 'ready' : 'collecting')
          : 'disabled',
        runtime: enabled ? meta.runtime : 'none',
        lastError: enabled ? meta.lastError : null
      }));
      return this.getStatus(camp);
    });
  }

  async setRuntimeState(
    campScope: string,
    patch: LearningRuntimeStatePatch
  ): Promise<LearningStoreStatus> {
    const camp = normalizeLearningCampScope(campScope);
    return this.enqueue(camp, async () => {
      await this.mutateMeta(camp, (meta) => ({
        ...meta,
        ...patch,
        enabled: patch.phase === 'disabled' ? false : meta.enabled
      }));
      return this.getStatus(camp);
    });
  }

  async putModelManifest(manifest: LearningModelManifest): Promise<void> {
    const camp = normalizeLearningCampScope(manifest.camp);
    if (!Array.isArray(manifest.trainingTargetSignatures)) {
      throw new Error('manifest.trainingTargetSignatures must be an array.');
    }
    if (!Array.isArray(manifest.trainedModes)) {
      throw new Error('manifest.trainedModes must be an array.');
    }
    const trainingTargetSignatures = [
      ...new Set(manifest.trainingTargetSignatures.map(
        (signature) => requireNonEmptyString(signature, 'manifest.trainingTargetSignatures[]')
      ))
    ].sort();
    const trainedModes = [...new Set(manifest.trainedModes)].sort();
    if (trainingTargetSignatures.length === 0) {
      throw new Error('manifest.trainingTargetSignatures must not be empty.');
    }
    const trainingDataFingerprint = requireNonEmptyString(
      manifest.trainingDataFingerprint,
      'manifest.trainingDataFingerprint'
    );
    if (
      !trainingDataFingerprint.startsWith(`${TRAINING_DATA_FINGERPRINT_VERSION}:`)
      || !/^[0-9a-f]{32}$/.test(
        trainingDataFingerprint.slice(TRAINING_DATA_FINGERPRINT_VERSION.length + 1)
      )
    ) {
      throw new Error('manifest.trainingDataFingerprint has an unsupported format.');
    }
    const normalized: LearningModelManifest = {
      ...manifest,
      camp,
      revision: requireNonEmptyString(manifest.revision, 'manifest.revision'),
      featureSchema: requireNonEmptyString(manifest.featureSchema, 'manifest.featureSchema'),
      rankingPolicy: requireNonEmptyString(manifest.rankingPolicy, 'manifest.rankingPolicy'),
      modelStorageUrl: requireNonEmptyString(
        manifest.modelStorageUrl,
        'manifest.modelStorageUrl'
      ),
      createdAt: requireFinite(manifest.createdAt, 'manifest.createdAt'),
      trainingDataFingerprint,
      trainingTargetSignatures,
      trainedModes
    };
    if (!Number.isInteger(normalized.inputSize) || normalized.inputSize <= 0) {
      throw new Error('manifest.inputSize must be a positive integer.');
    }
    if (
      !Number.isInteger(normalized.trainingExampleCount) ||
      normalized.trainingExampleCount < 0 ||
      !Number.isInteger(normalized.targetSignatureCount) ||
      normalized.targetSignatureCount < 0
    ) {
      throw new Error('Manifest training counts must be non-negative integers.');
    }
    if (
      normalized.trainedModes.length === 0
      || normalized.trainedModes.some((mode) => mode !== 'add' && mode !== 'replace')
    ) {
      throw new Error('manifest.trainedModes must contain add and/or replace.');
    }
    if (normalized.denseWeights) {
      validateDenseRankerWeights(normalized.denseWeights);
      if (normalized.denseWeights.revision !== normalized.revision) {
        throw new Error('Manifest and dense weight revisions must match.');
      }
      if (
        normalized.denseWeights.featureSchema !== normalized.featureSchema ||
        normalized.denseWeights.inputSize !== normalized.inputSize
      ) {
        throw new Error('Manifest and dense weight schemas must match.');
      }
    }

    await this.enqueue(camp, async () => {
      const existing = (await this.persistence.listModelManifests(camp))
        .find((candidate) => candidate.revision === normalized.revision);
      if (existing) {
        if (learningModelManifestsEqual(existing, normalized)) return;
        throw new Error(
          `Model revision "${normalized.revision}" for "${camp}" is immutable and already exists.`
        );
      }
      await this.persistence.putModelManifest(normalized);
      // Revisions are immutable and may be referenced by stop/resume
      // snapshots. Automatic retention must never delete them; clearCamp()
      // is the only operation that removes manifests and their native models.
    });
  }

  async listModelManifests(campScope: string): Promise<LearningModelManifest[]> {
    const camp = normalizeLearningCampScope(campScope);
    const manifests = await this.persistence.listModelManifests(camp);
    return manifests.sort(
      (left, right) => right.createdAt - left.createdAt ||
        right.revision.localeCompare(left.revision)
    );
  }

  async setActiveModelRevision(
    campScope: string,
    revision: string | null
  ): Promise<LearningStoreStatus> {
    const camp = normalizeLearningCampScope(campScope);
    return this.enqueue(camp, async () => {
      let manifest: LearningModelManifest | undefined;
      if (revision !== null) {
        const normalizedRevision = requireNonEmptyString(revision, 'revision');
        manifest = (await this.persistence.listModelManifests(camp))
          .find((candidate) => candidate.revision === normalizedRevision);
        if (!manifest) {
          throw new Error(`Model revision "${normalizedRevision}" does not exist for "${camp}".`);
        }
      }
      await this.mutateMeta(camp, (meta) => {
        if (
          manifest &&
          (
            manifest.featureSchema !== meta.featureSchema ||
            manifest.rankingPolicy !== meta.rankingPolicy
          )
        ) {
          throw new Error('Model manifest is incompatible with the active learning schema.');
        }
        return {
          ...meta,
          activeModelRevision: manifest?.revision ?? null,
          stagingModelRevision: manifest?.revision === meta.stagingModelRevision
            ? null
            : meta.stagingModelRevision,
          runtime: manifest?.runtime ?? 'none',
          phase: manifest ? 'ready' : (meta.enabled ? 'collecting' : 'disabled'),
          lastError: null
        };
      });
      return this.getStatus(camp);
    });
  }

  async getActiveModelManifest(campScope: string): Promise<LearningModelManifest | null> {
    const camp = normalizeLearningCampScope(campScope);
    const [meta, manifests] = await Promise.all([
      this.getMeta(camp),
      this.persistence.listModelManifests(camp)
    ]);
    if (!meta.activeModelRevision) return null;
    return manifests.find(
      (manifest) => manifest.revision === meta.activeModelRevision
    ) ?? null;
  }

  async putExperience<T = Record<string, unknown>>(
    campScope: string,
    payload: T,
    version = 1
  ): Promise<LearningExperienceRecord<T>> {
    const camp = normalizeLearningCampScope(campScope);
    if (!Number.isInteger(version) || version <= 0) {
      throw new Error('Experience version must be a positive integer.');
    }
    const record: LearningExperienceRecord<T> = {
      camp,
      version,
      updatedAt: this.now(),
      payload
    };
    await this.enqueue(camp, () => this.persistence.putExperience(record));
    return record;
  }

  async getExperience<T = Record<string, unknown>>(
    campScope: string
  ): Promise<LearningExperienceRecord<T> | null> {
    return this.persistence.getExperience<T>(normalizeLearningCampScope(campScope));
  }

  async clearCamp(
    campScope: string,
    options: { preserveEnabled?: boolean } = {}
  ): Promise<ClearLearningCampResult> {
    const camp = normalizeLearningCampScope(campScope);
    return this.enqueue(camp, async () => {
      for (let attempt = 0; attempt < MAX_COMMIT_RETRIES; attempt += 1) {
        const [snapshot, manifests] = await Promise.all([
          this.persistence.loadCamp(camp),
          this.persistence.listModelManifests(camp)
        ]);
        const previousRevision = snapshot.meta?.storeRevision ?? 0;
        const preserveEnabled = options.preserveEnabled ?? true;
        const enabled = preserveEnabled ? (snapshot.meta?.enabled ?? true) : true;
        const replacementMeta = createDefaultLearningCampMeta(camp, {
          now: this.now(),
          featureSchema: this.featureSchema,
          rankingPolicy: this.rankingPolicy,
          enabled,
          storeRevision: previousRevision + 1
        });
        const committed = await this.persistence.clearCamp(
          camp,
          previousRevision,
          replacementMeta
        );
        if (committed) {
          return {
            camp,
            removedExamples: snapshot.examples.length,
            removedModelRevisions: manifests.map((manifest) => manifest.revision),
            modelStorageUrls: manifests.map((manifest) => manifest.modelStorageUrl),
            preservedEnabled: enabled
          };
        }
        if (attempt + 1 < MAX_COMMIT_RETRIES) {
          await this.commitRetryDelay(attempt);
        }
      }
      throw new Error(`Could not clear learning data for "${camp}" due to concurrent updates.`);
    });
  }

  close(): void {
    this.persistence.close?.();
  }
}

export function emptyLearningStoreStatus(campScope: string): LearningStoreStatus {
  const camp = normalizeLearningCampScope(campScope);
  return buildStatus(camp, createDefaultLearningCampMeta(camp), []);
}

export function learningReservoirCapacity(limits: LearningRetentionLimits): number {
  return LEARNING_RESERVOIR_BUCKETS.reduce(
    (total, bucket) => total + limits.bucketCapacities[bucket],
    0
  );
}
