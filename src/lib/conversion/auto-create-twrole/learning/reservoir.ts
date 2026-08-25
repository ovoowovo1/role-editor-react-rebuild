import {
  DEFAULT_LEARNING_RETENTION_LIMITS,
  LEARNING_RESERVOIR_BUCKETS
} from './types';
import type {
  LearningReservoirBucket,
  LearningRetentionLimits,
  PersistedCandidateLearningExample
} from './types';

export interface LearningReservoirState {
  examples: readonly PersistedCandidateLearningExample[];
  reservoirSeen: Readonly<Record<LearningReservoirBucket, number>>;
}

export interface LearningReservoirUpdate {
  examples: PersistedCandidateLearningExample[];
  reservoirSeen: Record<LearningReservoirBucket, number>;
  evictedIds: string[];
}

export type ReservoirRandom = () => number;

function finiteNonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return value;
}

export function validateLearningRetentionLimits(
  limits: LearningRetentionLimits
): LearningRetentionLimits {
  finiteNonNegativeInteger(limits.maxExamples, 'maxExamples');
  finiteNonNegativeInteger(limits.maxEstimatedBytes, 'maxEstimatedBytes');
  finiteNonNegativeInteger(limits.recentCapacity, 'recentCapacity');
  if (!Number.isFinite(limits.nearZeroMargin) || limits.nearZeroMargin < 0) {
    throw new Error('nearZeroMargin must be a finite non-negative number.');
  }
  if (!Number.isFinite(limits.hardPredictionMargin) || limits.hardPredictionMargin < 0) {
    throw new Error('hardPredictionMargin must be a finite non-negative number.');
  }
  for (const bucket of LEARNING_RESERVOIR_BUCKETS) {
    finiteNonNegativeInteger(
      limits.bucketCapacities[bucket],
      `bucketCapacities.${bucket}`
    );
  }
  return limits;
}

export function cloneDefaultLearningRetentionLimits(): LearningRetentionLimits {
  return {
    ...DEFAULT_LEARNING_RETENTION_LIMITS,
    bucketCapacities: { ...DEFAULT_LEARNING_RETENTION_LIMITS.bucketCapacities }
  };
}

export function emptyReservoirSeen(): Record<LearningReservoirBucket, number> {
  return {
    exploration: 0,
    'high-positive': 0,
    'near-zero': 0,
    'general-negative': 0,
    invalid: 0,
    'hard-negative': 0,
    'hard-positive': 0
  };
}

export function classifyLearningExample(
  example: PersistedCandidateLearningExample,
  limits: LearningRetentionLimits = DEFAULT_LEARNING_RETENTION_LIMITS
): LearningReservoirBucket | null {
  const { outcome } = example;
  if (outcome.kind === 'censored') return null;
  if (outcome.kind === 'invalid') return 'invalid';

  const actual = outcome.decisionMargin;
  const predicted = example.prediction?.predictedDecisionMargin;
  if (predicted !== undefined) {
    if (
      predicted >= limits.hardPredictionMargin &&
      actual <= -limits.nearZeroMargin
    ) {
      return 'hard-negative';
    }
    if (
      predicted <= -limits.hardPredictionMargin &&
      actual >= limits.nearZeroMargin
    ) {
      return 'hard-positive';
    }
  }

  if (example.provenance.kind === 'exploration') return 'exploration';
  if (Math.abs(actual) <= limits.nearZeroMargin) return 'near-zero';
  return actual > 0 ? 'high-positive' : 'general-negative';
}

function compareExamples(
  left: PersistedCandidateLearningExample,
  right: PersistedCandidateLearningExample
): number {
  return left.sequence - right.sequence || left.id.localeCompare(right.id);
}

function safeRandomIndex(random: ReservoirRandom, seen: number): number {
  const value = random();
  const normalized = Number.isFinite(value)
    ? Math.max(0, Math.min(1 - Number.EPSILON, value))
    : 0;
  return Math.floor(normalized * seen);
}

function totalEstimatedBytes(examples: readonly PersistedCandidateLearningExample[]): number {
  let total = 0;
  for (const example of examples) total += Math.max(0, example.estimatedBytes);
  return total;
}

/**
 * Maintains a recent FIFO and per-label Algorithm-R reservoirs. Incoming
 * records always enter the recent tier first. Only records displaced from the
 * recent tier are offered to long-term buckets, which avoids duplicate copies.
 */
export function updateLearningReservoir(
  state: LearningReservoirState,
  incoming: readonly PersistedCandidateLearningExample[],
  options: {
    limits?: LearningRetentionLimits;
    random?: ReservoirRandom;
  } = {}
): LearningReservoirUpdate {
  const limits = validateLearningRetentionLimits(
    options.limits ?? cloneDefaultLearningRetentionLimits()
  );
  const random = options.random ?? Math.random;
  const seen = { ...emptyReservoirSeen(), ...state.reservoirSeen };
  const originalIds = new Set(state.examples.map((example) => example.id));
  const allInputIds = new Set([
    ...state.examples.map((example) => example.id),
    ...incoming.map((example) => example.id)
  ]);

  const recent = state.examples
    .filter((example) => example.retention.tier === 'recent')
    .map((example) => ({ ...example, retention: { tier: 'recent' } as const }));
  for (const example of incoming) {
    recent.push({ ...example, retention: { tier: 'recent' } });
  }
  recent.sort(compareExamples);

  const buckets: Record<
    LearningReservoirBucket,
    PersistedCandidateLearningExample[]
  > = {
    exploration: [],
    'high-positive': [],
    'near-zero': [],
    'general-negative': [],
    invalid: [],
    'hard-negative': [],
    'hard-positive': []
  };
  for (const example of state.examples) {
    if (example.retention.tier !== 'reservoir') continue;
    buckets[example.retention.bucket].push({
      ...example,
      retention: { tier: 'reservoir', bucket: example.retention.bucket }
    });
  }
  for (const bucket of LEARNING_RESERVOIR_BUCKETS) {
    buckets[bucket].sort(compareExamples);
    const capacity = limits.bucketCapacities[bucket];
    if (buckets[bucket].length > capacity) {
      buckets[bucket].splice(capacity);
    }
  }

  const overflowCount = Math.max(0, recent.length - limits.recentCapacity);
  const overflow = recent.splice(0, overflowCount);
  for (const example of overflow) {
    const bucket = classifyLearningExample(example, limits);
    if (!bucket) continue;
    seen[bucket] = Math.max(0, seen[bucket]) + 1;
    const bucketExamples = buckets[bucket];
    const capacity = limits.bucketCapacities[bucket];
    const retained = {
      ...example,
      retention: { tier: 'reservoir', bucket } as const
    };
    if (bucketExamples.length < capacity) {
      bucketExamples.push(retained);
      continue;
    }
    if (capacity === 0) continue;
    const replacementIndex = safeRandomIndex(random, seen[bucket]);
    if (replacementIndex < capacity) bucketExamples[replacementIndex] = retained;
  }

  const retained = [
    ...recent,
    ...LEARNING_RESERVOIR_BUCKETS.flatMap((bucket) => buckets[bucket])
  ];

  // The bucket capacities normally enforce the 50k count cap. These final
  // guards make custom limits and unusually large feature vectors safe.
  let retainedBytes = totalEstimatedBytes(retained);
  const removableReservoir = retained
    .filter((example) => example.retention.tier === 'reservoir')
    .sort(compareExamples);
  const removableRecent = retained
    .filter((example) => example.retention.tier === 'recent')
    .sort(compareExamples);
  const retainedIds = new Set(retained.map((example) => example.id));
  const removeUntilWithinLimits = (
    candidates: readonly PersistedCandidateLearningExample[]
  ): void => {
    for (const example of candidates) {
      if (
        retainedIds.size <= limits.maxExamples &&
        retainedBytes <= limits.maxEstimatedBytes
      ) break;
      if (!retainedIds.delete(example.id)) continue;
      retainedBytes -= Math.max(0, example.estimatedBytes);
    }
  };
  removeUntilWithinLimits(removableReservoir);
  removeUntilWithinLimits(removableRecent);

  const nextExamples = retained
    .filter((example) => retainedIds.has(example.id))
    .sort(compareExamples);
  const evictedIds = [...allInputIds]
    .filter((id) => !retainedIds.has(id))
    .sort();

  // If an existing duplicated id appeared in incoming, never report it as
  // evicted solely because one duplicate copy was discarded.
  for (let index = evictedIds.length - 1; index >= 0; index -= 1) {
    const id = evictedIds[index];
    if (originalIds.has(id) && nextExamples.some((example) => example.id === id)) {
      evictedIds.splice(index, 1);
    }
  }

  return { examples: nextExamples, reservoirSeen: seen, evictedIds };
}
