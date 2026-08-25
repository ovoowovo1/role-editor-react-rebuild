import { describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createZeroDenseRankerWeights } from './denseRanker';
import {
  createIndexedDbLearningStore,
  IndexedDbLearningPersistence
} from './indexedDbStore';
import { AutoCreateLearningStore } from './learningStore';
import type { LearningExclusiveCoordinator } from './exclusiveCoordinator';
import type {
  CandidateLearningExampleDraft,
  LearningCampMeta,
  LearningCampSnapshot,
  LearningExampleCommit,
  LearningExperienceRecord,
  LearningModelManifest,
  LearningPersistence,
  LearningRetentionLimits
} from './types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class MemoryLearningPersistence implements LearningPersistence {
  readonly camps = new Map<string, LearningCampSnapshot>();
  readonly manifests = new Map<string, LearningModelManifest[]>();
  readonly experiences = new Map<string, LearningExperienceRecord<unknown>>();
  conflictsRemaining = 0;
  clearConflictsRemaining = 0;

  async loadCamp(camp: string): Promise<LearningCampSnapshot> {
    return clone(this.camps.get(camp) ?? { meta: null, examples: [] });
  }

  async commitExamples(commit: LearningExampleCommit): Promise<boolean> {
    if (this.conflictsRemaining > 0) {
      this.conflictsRemaining -= 1;
      return false;
    }
    const current = this.camps.get(commit.camp) ?? { meta: null, examples: [] };
    if ((current.meta?.storeRevision ?? 0) !== commit.expectedStoreRevision) return false;
    const examples = new Map(current.examples.map((item) => [item.id, item]));
    for (const id of commit.deleteExampleIds) examples.delete(id);
    for (const item of commit.upsertExamples) examples.set(item.id, clone(item));
    this.camps.set(commit.camp, {
      meta: clone(commit.meta),
      examples: [...examples.values()]
    });
    return true;
  }

  async listModelManifests(camp: string): Promise<LearningModelManifest[]> {
    return clone(this.manifests.get(camp) ?? []);
  }

  async putModelManifest(manifest: LearningModelManifest): Promise<void> {
    const existing = this.manifests.get(manifest.camp) ?? [];
    this.manifests.set(manifest.camp, [
      ...existing.filter((item) => item.revision !== manifest.revision),
      clone(manifest)
    ]);
  }

  async deleteModelManifests(camp: string, revisions: readonly string[]): Promise<void> {
    const removed = new Set(revisions);
    this.manifests.set(
      camp,
      (this.manifests.get(camp) ?? []).filter((item) => !removed.has(item.revision))
    );
  }

  async getExperience<T = Record<string, unknown>>(
    camp: string
  ): Promise<LearningExperienceRecord<T> | null> {
    const record = this.experiences.get(camp);
    return record ? clone(record as LearningExperienceRecord<T>) : null;
  }

  async putExperience<T = Record<string, unknown>>(
    record: LearningExperienceRecord<T>
  ): Promise<void> {
    this.experiences.set(record.camp, clone(record) as LearningExperienceRecord<unknown>);
  }

  async clearCamp(
    camp: string,
    expectedStoreRevision: number,
    replacementMeta: LearningCampMeta
  ): Promise<boolean> {
    if (this.clearConflictsRemaining > 0) {
      this.clearConflictsRemaining -= 1;
      return false;
    }
    const currentRevision = this.camps.get(camp)?.meta?.storeRevision ?? 0;
    if (currentRevision !== expectedStoreRevision) return false;
    this.camps.set(camp, { meta: clone(replacementMeta), examples: [] });
    this.manifests.delete(camp);
    this.experiences.delete(camp);
    return true;
  }
}

class QueueLearningExclusiveCoordinator implements LearningExclusiveCoordinator {
  private readonly queues = new Map<string, Promise<void>>();

  runExclusive<T>(camp: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(camp) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    const tracked = current.then(
      () => undefined,
      () => undefined
    );
    this.queues.set(camp, tracked);
    void tracked.then(() => {
      if (this.queues.get(camp) === tracked) this.queues.delete(camp);
    });
    return current;
  }
}

function limits(): LearningRetentionLimits {
  return {
    maxExamples: 10,
    maxEstimatedBytes: 1_000_000,
    recentCapacity: 3,
    bucketCapacities: {
      exploration: 1,
      'high-positive': 1,
      'near-zero': 1,
      'general-negative': 1,
      invalid: 1,
      'hard-negative': 1,
      'hard-positive': 1
    },
    nearZeroMargin: 1e-7,
    hardPredictionMargin: 1e-7
  };
}

function draft(
  sampleId: string,
  outcome: CandidateLearningExampleDraft['outcome'] = {
    kind: 'exact',
    valid: true,
    globalGainMse: 0.5,
    score: 0.5,
    decisionMargin: 0.5
  }
): CandidateLearningExampleDraft {
  return {
    sampleId,
    featureSchema: 'auto-create-numeric-v1',
    features: new Float32Array([0.25, 0.5]),
    mode: 'add',
    runHash: 'run-hash',
    targetSignature: 'target-hash',
    modelRevision: null,
    provenance: { kind: 'top-k', inclusionProbability: 1, rank: 0 },
    outcome
  };
}

function manifest(camp: string, revision: string, createdAt: number): LearningModelManifest {
  return {
    camp,
    revision,
    featureSchema: 'auto-create-numeric-v1',
    rankingPolicy: 'strict-cascade-v1',
    runtime: 'typed',
    modelStorageUrl: `indexeddb://ranker-${camp}-${revision}`,
    inputSize: 32,
    outputSize: 2,
    createdAt,
    trainingExampleCount: 10_000,
    targetSignatureCount: 4,
    trainingDataFingerprint:
      `auto-create-training-data-v1:${createdAt.toString(16).padStart(32, '0')}`,
    trainingTargetSignatures: ['target-a', 'target-b', 'target-c', 'target-d'],
    trainedModes: ['add', 'replace']
  };
}

describe('AutoCreateLearningStore', () => {
  it('appends idempotent batches, keeps outcome provenance and isolates camps', async () => {
    const persistence = new MemoryLearningPersistence();
    persistence.conflictsRemaining = 1;
    const store = new AutoCreateLearningStore({
      persistence,
      limits: limits(),
      now: () => 1000,
      random: () => 0.99
    });

    const first = await store.appendExamples(' SkYdOw ', [
      draft('exact'),
      draft('invalid', { kind: 'invalid', valid: false, reason: 'containment' }),
      draft('censored', {
        kind: 'censored',
        reason: 'incumbent-early-exit',
        upperBoundMse: 0.1
      })
    ]);
    expect(first.appended).toBe(3);
    expect(first.status.camp).toBe('skydow');
    expect(first.status.outcomeCounts).toEqual({ exact: 1, invalid: 1, censored: 1 });

    const duplicate = await store.appendExamples('skydow', [draft('exact')]);
    expect(duplicate.appended).toBe(0);
    expect(duplicate.duplicateCount).toBe(1);
    expect((await store.getExamples('skydow')).find((item) => item.id === 'censored'))
      .toMatchObject({
        outcome: { kind: 'censored' },
        provenance: { kind: 'top-k', inclusionProbability: 1 }
      });

    await store.appendExamples('civil', [draft('civil-one')]);
    expect((await store.getStatus('civil')).exampleCount).toBe(1);
    expect((await store.getStatus('skydow')).exampleCount).toBe(3);
  });

  it('serializes independent stores that append and update metadata for one camp', async () => {
    const persistence = new MemoryLearningPersistence();
    const exclusiveCoordinator = new QueueLearningExclusiveCoordinator();
    const first = new AutoCreateLearningStore({
      persistence,
      limits: limits(),
      exclusiveCoordinator,
      commitRetryDelay: async () => undefined
    });
    const second = new AutoCreateLearningStore({
      persistence,
      limits: limits(),
      exclusiveCoordinator,
      commitRetryDelay: async () => undefined
    });

    await Promise.all([
      first.appendExamples('civil', [draft('first')]),
      second.appendExamples('civil', [draft('second')]),
      second.setRuntimeState('civil', { phase: 'collecting', lastError: null })
    ]);

    expect((await first.getExamples('civil')).map((example) => example.id).sort())
      .toEqual(['first', 'second']);
    expect(await first.getStatus('civil')).toMatchObject({
      phase: 'collecting',
      exampleCount: 2
    });
  });

  it('backs off after finite CAS conflicts and fails only after twelve attempts', async () => {
    const finitePersistence = new MemoryLearningPersistence();
    finitePersistence.conflictsRemaining = 3;
    const finiteDelays: number[] = [];
    const finite = new AutoCreateLearningStore({
      persistence: finitePersistence,
      limits: limits(),
      commitRetryDelay: async (conflictIndex) => {
        finiteDelays.push(conflictIndex);
      }
    });

    await expect(finite.appendExamples('civil', [draft('eventual')]))
      .resolves.toMatchObject({ appended: 1 });
    expect(finiteDelays).toEqual([0, 1, 2]);

    const permanentPersistence = new MemoryLearningPersistence();
    permanentPersistence.conflictsRemaining = Number.POSITIVE_INFINITY;
    const permanentDelays: number[] = [];
    const permanent = new AutoCreateLearningStore({
      persistence: permanentPersistence,
      limits: limits(),
      commitRetryDelay: async (conflictIndex) => {
        permanentDelays.push(conflictIndex);
      }
    });

    await expect(permanent.appendExamples('civil', [draft('never')]))
      .rejects.toThrow('due to concurrent updates');
    expect(permanentDelays).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(permanentPersistence.conflictsRemaining).toBe(Number.POSITIVE_INFINITY);
  });

  it('retains immutable model revisions and stores runtime state and experience per camp', async () => {
    const persistence = new MemoryLearningPersistence();
    const store = new AutoCreateLearningStore({
      persistence,
      limits: limits(),
      maxModelManifests: 2,
      now: () => 2000
    });

    await store.putModelManifest(manifest('skydow', 'r1', 1));
    await store.putModelManifest(manifest('skydow', 'r2', 2));
    await store.putModelManifest(manifest('skydow', 'r3', 3));
    expect((await store.listModelManifests('skydow')).map((item) => item.revision))
      .toEqual(['r3', 'r2', 'r1']);

    const ready = await store.setActiveModelRevision('skydow', 'r3');
    expect(ready).toMatchObject({
      phase: 'ready',
      activeModelRevision: 'r3',
      runtime: 'typed'
    });
    expect(await store.getActiveModelManifest('skydow'))
      .toMatchObject({ revision: 'r3' });

    await store.putExperience('skydow', {
      sourceStats: { hat: { trials: 3, accepted: 1 } }
    });
    expect(await store.getExperience('skydow')).toMatchObject({
      camp: 'skydow',
      version: 1,
      payload: { sourceStats: { hat: { trials: 3, accepted: 1 } } }
    });
    expect(await store.getExperience('civil')).toBeNull();
  });

  it('allows an idempotent manifest write but rejects revision replacement', async () => {
    const persistence = new MemoryLearningPersistence();
    const store = new AutoCreateLearningStore({ persistence, limits: limits() });
    const original = manifest('skydow', 'immutable-r1', 1);

    await store.putModelManifest(original);
    await expect(store.putModelManifest(original)).resolves.toBeUndefined();
    await expect(store.putModelManifest({
      ...original,
      trainingExampleCount: original.trainingExampleCount + 1
    })).rejects.toThrow(/immutable and already exists/i);

    const stored = await store.listModelManifests('skydow');
    expect(stored).toHaveLength(1);
    expect(stored[0].trainingExampleCount).toBe(original.trainingExampleCount);
  });

  it('validates the training fingerprint and canonicalizes manifest metadata', async () => {
    const persistence = new MemoryLearningPersistence();
    const store = new AutoCreateLearningStore({ persistence, limits: limits() });
    await expect(store.putModelManifest({
      ...manifest('skydow', 'invalid', 1),
      trainingDataFingerprint: 'not-a-training-fingerprint'
    })).rejects.toThrow('trainingDataFingerprint has an unsupported format');

    await store.putModelManifest({
      ...manifest('skydow', 'canonical', 2),
      trainingTargetSignatures: [
        'target-d',
        'target-b',
        'target-a',
        'target-b',
        'target-c'
      ],
      trainedModes: ['replace', 'add', 'replace']
    });
    expect((await store.listModelManifests('skydow'))[0]).toMatchObject({
      trainingTargetSignatures: ['target-a', 'target-b', 'target-c', 'target-d'],
      trainedModes: ['add', 'replace']
    });
  });

  it('clears one camp while preserving its enabled state', async () => {
    const persistence = new MemoryLearningPersistence();
    const store = new AutoCreateLearningStore({
      persistence,
      limits: limits(),
      maxModelManifests: 2,
      now: () => 3000
    });
    await store.appendExamples('skydow', [draft('one')]);
    await store.appendExamples('civil', [draft('civil-one')]);
    await store.putModelManifest(manifest('skydow', 'r1', 1));
    await store.putExperience('skydow', { remembered: true });
    await store.setEnabled('skydow', false);

    const cleared = await store.clearCamp('skydow');
    expect(cleared).toMatchObject({
      removedExamples: 1,
      removedModelRevisions: ['r1'],
      preservedEnabled: false
    });
    expect(await store.getStatus('skydow')).toMatchObject({
      enabled: false,
      phase: 'disabled',
      exampleCount: 0
    });
    expect(await store.getExperience('skydow')).toBeNull();
    expect((await store.getStatus('civil')).exampleCount).toBe(1);
  });

  it('retries revision-aware clear and linearizes clear against append', async () => {
    const persistence = new MemoryLearningPersistence();
    persistence.clearConflictsRemaining = 2;
    const delays: number[] = [];
    const exclusiveCoordinator = new QueueLearningExclusiveCoordinator();
    const first = new AutoCreateLearningStore({
      persistence,
      limits: limits(),
      exclusiveCoordinator,
      commitRetryDelay: async (conflictIndex) => {
        delays.push(conflictIndex);
      }
    });
    const second = new AutoCreateLearningStore({
      persistence,
      limits: limits(),
      exclusiveCoordinator,
      commitRetryDelay: async () => undefined
    });

    await first.appendExamples('civil', [draft('before-clear')]);
    await Promise.all([
      first.clearCamp('civil'),
      second.appendExamples('civil', [draft('after-clear')])
    ]);

    expect(delays).toEqual([0, 1]);
    expect((await first.getExamples('civil')).map((example) => example.id))
      .toEqual(['after-clear']);
    expect((await first.getStatus('civil')).exampleCount).toBe(1);
  });

  it('rejects malformed labels before writing any part of a batch', async () => {
    const persistence = new MemoryLearningPersistence();
    const store = new AutoCreateLearningStore({ persistence, limits: limits() });
    const malformed = draft('bad');
    malformed.features = [Number.NaN];

    await expect(store.appendExamples('skydow', [malformed]))
      .rejects.toThrow('features[0] must be finite');
    expect((await persistence.loadCamp('skydow')).examples).toEqual([]);
  });
});

describe('IndexedDbLearningPersistence dependency injection', () => {
  it('fails explicitly when IndexedDB is unavailable', () => {
    expect(() => new IndexedDbLearningPersistence({ factory: null }))
      .toThrow('IndexedDB is not available');
  });

  it('round-trips all camp-scoped stores through an injected IDBFactory', async () => {
    const factory = new IDBFactory();
    const databaseName = 'auto-create-learning-test-round-trip';
    const first = createIndexedDbLearningStore({
      factory,
      databaseName,
      limits: limits(),
      now: () => 4000
    });
    await first.appendExamples('skydow', [
      draft('exact'),
      draft('invalid', { kind: 'invalid', valid: false, reason: 'containment' })
    ]);
    const weights = createZeroDenseRankerWeights('r1');
    await first.putModelManifest({
      ...manifest('skydow', 'r1', 1),
      inputSize: weights.inputSize,
      denseWeights: weights
    });
    await first.setActiveModelRevision('skydow', 'r1');
    await first.putExperience('skydow', { persisted: true }, 2);

    const reopened = createIndexedDbLearningStore({
      factory,
      databaseName,
      limits: limits(),
      now: () => 5000
    });
    expect(await reopened.getStatus('skydow')).toMatchObject({
      exampleCount: 2,
      activeModelRevision: 'r1',
      phase: 'ready'
    });
    expect(await reopened.getExamples('skydow')).toHaveLength(2);
    const reopenedManifest = await reopened.getActiveModelManifest('skydow');
    expect(reopenedManifest).toMatchObject({ revision: 'r1' });
    expect(reopenedManifest?.denseWeights?.dense1Kernel).toBeInstanceOf(Float32Array);
    expect(reopenedManifest?.denseWeights?.dense1Kernel.length)
      .toBe(weights.dense1Kernel.length);
    expect(await reopened.getExperience('skydow'))
      .toMatchObject({ version: 2, payload: { persisted: true } });

    await reopened.clearCamp('skydow');
    expect(await first.getStatus('skydow')).toMatchObject({
      exampleCount: 0,
      activeModelRevision: null
    });
    expect(await first.listModelManifests('skydow')).toEqual([]);
    expect(await first.getExperience('skydow')).toBeNull();
    first.close();
    reopened.close();
  });

  it('preserves concurrent batches from independent IndexedDB store instances', async () => {
    const factory = new IDBFactory();
    const databaseName = 'auto-create-learning-test-concurrent';
    const exclusiveCoordinator = new QueueLearningExclusiveCoordinator();
    const first = createIndexedDbLearningStore({
      factory,
      databaseName,
      limits: {
        ...limits(),
        maxExamples: 100,
        recentCapacity: 100
      },
      exclusiveCoordinator,
      commitRetryDelay: async () => undefined
    });
    const second = createIndexedDbLearningStore({
      factory,
      databaseName,
      limits: {
        ...limits(),
        maxExamples: 100,
        recentCapacity: 100
      },
      exclusiveCoordinator,
      commitRetryDelay: async () => undefined
    });

    await Promise.all(
      Array.from({ length: 20 }, (_, index) => (
        (index % 2 === 0 ? first : second).appendExamples(
          'civil',
          [draft(`concurrent-${index}`)]
        )
      ))
    );

    const examples = await first.getExamples('civil');
    expect(examples).toHaveLength(20);
    expect(new Set(examples.map((example) => example.id)).size).toBe(20);
    expect((await second.getStatus('civil')).exampleCount).toBe(20);
    first.close();
    second.close();
  });

  it('keeps every record in unbounded mode despite tiny diagnostic limits', async () => {
    const factory = new IDBFactory();
    const databaseName = 'auto-create-learning-test-unbounded';
    const store = createIndexedDbLearningStore({
      factory,
      databaseName,
      retentionMode: 'unbounded',
      limits: {
        ...limits(),
        maxExamples: 1,
        maxEstimatedBytes: 1,
        recentCapacity: 1
      }
    });
    for (let target = 0; target < 3; target += 1) {
      const result = await store.appendExamples('civil', Array.from(
        { length: 4 },
        (_, index) => ({
          ...draft(`target-${target}-${index}`, {
            kind: 'exact',
            valid: true,
            globalGainMse: 1,
            score: 1,
            decisionMargin: 1
          }),
          targetSignature: `target-${target}`
        })
      ));
      expect(result.evictedCount).toBe(0);
      expect(result.status.exampleCount).toBe((target + 1) * 4);
      expect(result.status.exactModeCounts.add).toBe((target + 1) * 4);
      expect(result.status.targetSignatureCounts.add).toBe(target + 1);
    }
    expect(await store.getExamples('civil')).toHaveLength(12);
    store.close();
  });

  it('deduplicates repeated IDs in the atomic unbounded transaction', async () => {
    const factory = new IDBFactory();
    const store = createIndexedDbLearningStore({
      factory,
      databaseName: 'auto-create-learning-test-unbounded-dedup'
    });
    const first = await store.appendExamples('civil', [draft('same'), draft('same')]);
    const second = await store.appendExamples('civil', [draft('same')]);
    expect(first).toMatchObject({ appended: 1, duplicateCount: 1, evictedCount: 0 });
    expect(second).toMatchObject({ appended: 0, duplicateCount: 1, evictedCount: 0 });
    expect((await store.getStatus('civil')).exampleCount).toBe(1);
    store.close();
  });

  it('uses meta-only reads for incremental append after aggregate initialization', async () => {
    const factory = new IDBFactory();
    const persistence = new IndexedDbLearningPersistence({
      factory,
      databaseName: 'auto-create-learning-test-meta-only'
    });
    const store = new AutoCreateLearningStore({ persistence });
    await store.getStatus('civil');
    const fullLoad = vi.spyOn(persistence, 'loadCamp');
    await store.appendExamples('civil', [draft('incremental')]);
    await store.getStatus('civil');
    expect(fullLoad).not.toHaveBeenCalled();
    expect((await store.getExamples('civil')).map((item) => item.id)).toEqual(['incremental']);
    persistence.close();
  });

  it('pages examples with an opaque primary-key cursor without getAll', async () => {
    const factory = new IDBFactory();
    const persistence = new IndexedDbLearningPersistence({
      factory,
      keyRange: IDBKeyRange,
      databaseName: 'auto-create-learning-test-cursor-pages'
    });
    const store = new AutoCreateLearningStore({ persistence });
    await store.appendExamples(
      'civil',
      Array.from({ length: 12 }, (_, index) => draft(`page-${index}`))
    );
    const ids: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await persistence.loadExamplePage('civil', cursor, 5);
      ids.push(...page.examples.map((example) => example.id));
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    persistence.close();
  });

  it('lazily rebuilds a missing aggregate without changing model state', async () => {
    const factory = new IDBFactory();
    const databaseName = 'auto-create-learning-test-lazy-aggregate';
    const persistence = new IndexedDbLearningPersistence({ factory, databaseName });
    const bounded = new AutoCreateLearningStore({
      persistence,
      limits: { ...limits(), recentCapacity: 10, maxExamples: 10 }
    });
    await bounded.appendExamples('civil', [
      { ...draft('legacy-exact'), targetSignature: 'legacy-target' },
      draft('legacy-invalid', { kind: 'invalid', valid: false, reason: 'containment' })
    ]);
    const before = await persistence.loadCamp('civil');
    const legacyMeta = { ...before.meta! };
    delete legacyMeta.aggregate;
    expect(await persistence.commitExamples({
      camp: 'civil',
      expectedStoreRevision: before.meta!.storeRevision,
      meta: {
        ...legacyMeta,
        activeModelRevision: 'preserved-revision',
        storeRevision: before.meta!.storeRevision + 1
      },
      upsertExamples: [],
      deleteExampleIds: []
    })).toBe(true);

    const unbounded = new AutoCreateLearningStore({ persistence });
    expect(await unbounded.getStatus('civil')).toMatchObject({
      exampleCount: 2,
      activeModelRevision: 'preserved-revision',
      exactModeCounts: { add: 1, replace: 0 },
      targetSignatureCounts: { add: 1, replace: 0 }
    });
    expect((await unbounded.getMeta('civil')).aggregate?.version).toBe(1);
    persistence.close();
  });
});
