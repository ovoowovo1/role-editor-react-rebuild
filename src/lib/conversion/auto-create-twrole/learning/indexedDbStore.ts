import { AutoCreateLearningStore } from './learningStore';
import {
  AUTO_CREATE_LEARNING_DB_NAME,
  AUTO_CREATE_LEARNING_DB_VERSION,
  AUTO_CREATE_LEARNING_STORE_SCHEMA_VERSION,
  LEARNING_AGGREGATE_VERSION
} from './types';
import { createWebLocksLearningExclusiveCoordinator } from './exclusiveCoordinator';
import type { AutoCreateLearningStoreOptions } from './learningStore';
import type {
  LearningCampMeta,
  AtomicAppendLearningExamples,
  AtomicAppendLearningExamplesResult,
  LearningCampSnapshot,
  LearningExampleCommit,
  LearningExperienceRecord,
  LearningExamplePage,
  LearningModelManifest,
  LearningPersistence,
  PersistedCandidateLearningExample
} from './types';

const EXAMPLES_STORE = 'examples';
const META_STORE = 'meta';
const MANIFESTS_STORE = 'modelManifests';
const EXPERIENCE_STORE = 'experience';
const CAMP_INDEX = 'camp';
const KEY_SEPARATOR = '\u001f';

interface StoredLearningExample extends PersistedCandidateLearningExample {
  storageKey: string;
}

interface StoredModelManifest extends LearningModelManifest {
  storageKey: string;
}

export interface IndexedDbLearningPersistenceOptions {
  factory?: IDBFactory | null;
  databaseName?: string;
  keyRange?: Pick<typeof IDBKeyRange, 'lowerBound'> | null;
}

export interface CreateIndexedDbLearningStoreOptions
  extends Omit<AutoCreateLearningStoreOptions, 'persistence'>,
    IndexedDbLearningPersistenceOptions {}

function exampleStorageKey(camp: string, id: string): string {
  return `${camp}${KEY_SEPARATOR}${id}`;
}

function manifestStorageKey(camp: string, revision: string): string {
  return `${camp}${KEY_SEPARATOR}${revision}`;
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error ?? new Error('IndexedDB transaction was aborted.')
    );
    transaction.onerror = () => reject(
      transaction.error ?? new Error('IndexedDB transaction failed.')
    );
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error ?? new Error('IndexedDB request failed.')
    );
  });
}

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string | string[]
): void {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, { unique: false });
}

function toStoredExample(
  example: PersistedCandidateLearningExample
): StoredLearningExample {
  return {
    ...example,
    storageKey: exampleStorageKey(example.camp, example.id)
  };
}

function fromStoredExample(
  stored: StoredLearningExample
): PersistedCandidateLearningExample {
  const {
    storageKey: _storageKey,
    ...example
  } = stored;
  return example;
}

function toStoredManifest(manifest: LearningModelManifest): StoredModelManifest {
  return {
    ...manifest,
    storageKey: manifestStorageKey(manifest.camp, manifest.revision)
  };
}

function fromStoredManifest(stored: StoredModelManifest): LearningModelManifest {
  const {
    storageKey: _storageKey,
    ...manifest
  } = stored;
  return manifest;
}

export class IndexedDbLearningPersistence implements LearningPersistence {
  private readonly factory: IDBFactory;
  private readonly databaseName: string;
  private readonly keyRange: Pick<typeof IDBKeyRange, 'lowerBound'> | null;
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbLearningPersistenceOptions = {}) {
    const factory = options.factory === undefined
      ? (typeof indexedDB === 'undefined' ? null : indexedDB)
      : options.factory;
    if (!factory) {
      throw new Error('IndexedDB is not available in this browser context.');
    }
    this.factory = factory;
    this.databaseName = options.databaseName ?? AUTO_CREATE_LEARNING_DB_NAME;
    const keyRange = options.keyRange === undefined
      ? (typeof IDBKeyRange === 'undefined' ? null : IDBKeyRange)
      : options.keyRange;
    this.keyRange = keyRange;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.factory.open(
        this.databaseName,
        AUTO_CREATE_LEARNING_DB_VERSION
      );
      request.onupgradeneeded = () => {
        const database = request.result;
        const transaction = request.transaction;
        if (!transaction) throw new Error('IndexedDB upgrade transaction is unavailable.');

        const examples = database.objectStoreNames.contains(EXAMPLES_STORE)
          ? transaction.objectStore(EXAMPLES_STORE)
          : database.createObjectStore(EXAMPLES_STORE, { keyPath: 'storageKey' });
        ensureIndex(examples, CAMP_INDEX, 'camp');

        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'camp' });
        }

        const manifests = database.objectStoreNames.contains(MANIFESTS_STORE)
          ? transaction.objectStore(MANIFESTS_STORE)
          : database.createObjectStore(MANIFESTS_STORE, { keyPath: 'storageKey' });
        ensureIndex(manifests, CAMP_INDEX, 'camp');

        if (!database.objectStoreNames.contains(EXPERIENCE_STORE)) {
          database.createObjectStore(EXPERIENCE_STORE, { keyPath: 'camp' });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          if (this.databasePromise) this.databasePromise = null;
        };
        resolve(database);
      };
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error('Could not open the learning database.'));
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error('Learning database upgrade is blocked by another page.'));
      };
    });
    return this.databasePromise;
  }

  async loadCamp(camp: string): Promise<LearningCampSnapshot> {
    const database = await this.openDatabase();
    const transaction = database.transaction(
      [EXAMPLES_STORE, META_STORE],
      'readonly'
    );
    const metaRequest = transaction
      .objectStore(META_STORE)
      .get(camp) as IDBRequest<LearningCampMeta | undefined>;
    const examplesRequest = transaction
      .objectStore(EXAMPLES_STORE)
      .index(CAMP_INDEX)
      .getAll(camp) as IDBRequest<StoredLearningExample[]>;
    const [meta, storedExamples] = await Promise.all([
      requestResult(metaRequest),
      requestResult(examplesRequest),
      transactionDone(transaction)
    ]);
    return {
      meta: meta ?? null,
      examples: storedExamples.map(fromStoredExample)
    };
  }

  async loadMeta(camp: string): Promise<LearningCampMeta | null> {
    const database = await this.openDatabase();
    const transaction = database.transaction(META_STORE, 'readonly');
    const request = transaction.objectStore(META_STORE).get(camp) as
      IDBRequest<LearningCampMeta | undefined>;
    const [meta] = await Promise.all([requestResult(request), transactionDone(transaction)]);
    return meta ?? null;
  }

  async loadExamplePage(
    camp: string,
    afterStorageKey: string | null,
    limit: number
  ): Promise<LearningExamplePage> {
    const pageSize = Math.max(1, Math.floor(limit));
    const keyRange = this.keyRange;
    if (!keyRange) throw new Error('IndexedDB key ranges are not available.');
    const database = await this.openDatabase();
    const transaction = database.transaction(EXAMPLES_STORE, 'readonly');
    const store = transaction.objectStore(EXAMPLES_STORE);
    return new Promise((resolve, reject) => {
      const examples: PersistedCandidateLearningExample[] = [];
      let nextCursor: string | null = null;
      const startKey = afterStorageKey ?? `${camp}${KEY_SEPARATOR}`;
      const request = store.openCursor(keyRange.lowerBound(
        startKey,
        afterStorageKey !== null
      ));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const stored = cursor.value as StoredLearningExample;
        if (stored.camp !== camp) return;
        examples.push(fromStoredExample(stored));
        nextCursor = String(cursor.primaryKey);
        if (examples.length >= pageSize) return;
        cursor.continue();
      };
      request.onerror = () => reject(
        request.error ?? new Error('Could not page learning examples.')
      );
      transaction.oncomplete = () => resolve({
        examples,
        nextCursor: examples.length === pageSize ? nextCursor : null
      });
      transaction.onabort = () => reject(
        transaction.error ?? new Error('Learning example page transaction was aborted.')
      );
      transaction.onerror = () => {
        // onabort reports the transaction error.
      };
    });
  }

  async appendUnbounded(
    append: AtomicAppendLearningExamples
  ): Promise<AtomicAppendLearningExamplesResult> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [EXAMPLES_STORE, META_STORE],
        'readwrite'
      );
      const metaStore = transaction.objectStore(META_STORE);
      const examplesStore = transaction.objectStore(EXAMPLES_STORE);
      const currentRequest = metaStore.get(append.camp) as
        IDBRequest<LearningCampMeta | undefined>;
      let result: AtomicAppendLearningExamplesResult = {
        committed: false,
        appendedIds: [],
        meta: null
      };

      currentRequest.onsuccess = () => {
        const currentRevision = currentRequest.result?.storeRevision ?? 0;
        if (currentRevision !== append.expectedStoreRevision) return;
        const aggregate = append.baseMeta.aggregate;
        if (!aggregate || aggregate.version !== LEARNING_AGGREGATE_VERSION) {
          transaction.abort();
          return;
        }
        const nextAggregate = {
          ...aggregate,
          outcomeCounts: { ...aggregate.outcomeCounts },
          modeCounts: { ...aggregate.modeCounts },
          exactModeCounts: { ...aggregate.exactModeCounts },
          bucketCounts: { ...aggregate.bucketCounts },
          targetSignatures: {
            add: [...aggregate.targetSignatures.add],
            replace: [...aggregate.targetSignatures.replace]
          }
        };
        const appendedIds: string[] = [];
        let pending = append.examples.length;
        const finish = (): void => {
          if (pending !== 0) return;
          const meta = { ...append.baseMeta, aggregate: nextAggregate };
          metaStore.put(meta);
          result = { committed: true, appendedIds, meta };
        };
        if (pending === 0) {
          finish();
          return;
        }
        for (const example of append.examples) {
          const key = exampleStorageKey(append.camp, example.id);
          const existsRequest = examplesStore.getKey(key);
          existsRequest.onsuccess = () => {
            if (existsRequest.result === undefined) {
              examplesStore.add(toStoredExample(example));
              appendedIds.push(example.id);
              nextAggregate.exampleCount += 1;
              nextAggregate.estimatedBytes += Math.max(0, example.estimatedBytes);
              nextAggregate.outcomeCounts[example.outcome.kind] += 1;
              nextAggregate.modeCounts[example.mode] += 1;
              if (example.outcome.kind === 'exact') {
                nextAggregate.exactModeCounts[example.mode] += 1;
                const signatures = nextAggregate.targetSignatures[example.mode];
                if (!signatures.includes(example.targetSignature)) {
                  signatures.push(example.targetSignature);
                  signatures.sort();
                }
              }
              if (example.retention.tier === 'recent') nextAggregate.recentCount += 1;
              else {
                nextAggregate.reservoirCount += 1;
                nextAggregate.bucketCounts[example.retention.bucket] += 1;
              }
            }
            pending -= 1;
            finish();
          };
          existsRequest.onerror = () => transaction.abort();
        }
      };
      currentRequest.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => {
        const error = transaction.error ?? currentRequest.error;
        if (error?.name === 'QuotaExceededError') {
          reject(new DOMException(
            'AutoCreate learning storage quota exceeded; no examples from this batch were saved.',
            'QuotaExceededError'
          ));
          return;
        }
        reject(error ?? new Error('Could not atomically append learning examples.'));
      };
      transaction.onerror = () => {
        // onabort reports the durable transaction error.
      };
    });
  }

  async commitExamples(commit: LearningExampleCommit): Promise<boolean> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [EXAMPLES_STORE, META_STORE],
        'readwrite'
      );
      const metaStore = transaction.objectStore(META_STORE);
      const examplesStore = transaction.objectStore(EXAMPLES_STORE);
      let committed = false;
      const currentRequest = metaStore.get(commit.camp) as IDBRequest<
        LearningCampMeta | undefined
      >;

      currentRequest.onsuccess = () => {
        const currentRevision = currentRequest.result?.storeRevision ?? 0;
        if (currentRevision !== commit.expectedStoreRevision) return;
        for (const id of commit.deleteExampleIds) {
          examplesStore.delete(exampleStorageKey(commit.camp, id));
        }
        for (const example of commit.upsertExamples) {
          examplesStore.put(toStoredExample(example));
        }
        metaStore.put(commit.meta);
        committed = true;
      };
      currentRequest.onerror = () => {
        transaction.abort();
      };
      transaction.oncomplete = () => resolve(committed);
      transaction.onabort = () => reject(
        transaction.error ?? currentRequest.error ??
          new Error('Could not commit learning examples.')
      );
      transaction.onerror = () => {
        // onabort reports the durable transaction error.
      };
    });
  }

  async listModelManifests(camp: string): Promise<LearningModelManifest[]> {
    const database = await this.openDatabase();
    const transaction = database.transaction(MANIFESTS_STORE, 'readonly');
    const request = transaction
      .objectStore(MANIFESTS_STORE)
      .index(CAMP_INDEX)
      .getAll(camp) as IDBRequest<StoredModelManifest[]>;
    const [stored] = await Promise.all([
      requestResult(request),
      transactionDone(transaction)
    ]);
    return stored.map(fromStoredManifest);
  }

  async putModelManifest(manifest: LearningModelManifest): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(MANIFESTS_STORE, 'readwrite');
    // `add`, unlike `put`, makes the storage layer itself incapable of
    // overwriting a revision during a race between tabs/workers.
    transaction.objectStore(MANIFESTS_STORE).add(toStoredManifest(manifest));
    await transactionDone(transaction);
  }

  async deleteModelManifests(
    camp: string,
    revisions: readonly string[]
  ): Promise<void> {
    if (revisions.length === 0) return;
    const database = await this.openDatabase();
    const transaction = database.transaction(MANIFESTS_STORE, 'readwrite');
    const store = transaction.objectStore(MANIFESTS_STORE);
    for (const revision of revisions) {
      store.delete(manifestStorageKey(camp, revision));
    }
    await transactionDone(transaction);
  }

  async getExperience<T = Record<string, unknown>>(
    camp: string
  ): Promise<LearningExperienceRecord<T> | null> {
    const database = await this.openDatabase();
    const transaction = database.transaction(EXPERIENCE_STORE, 'readonly');
    const request = transaction
      .objectStore(EXPERIENCE_STORE)
      .get(camp) as IDBRequest<LearningExperienceRecord<T> | undefined>;
    const [record] = await Promise.all([
      requestResult(request),
      transactionDone(transaction)
    ]);
    return record ?? null;
  }

  async putExperience<T = Record<string, unknown>>(
    record: LearningExperienceRecord<T>
  ): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(EXPERIENCE_STORE, 'readwrite');
    transaction.objectStore(EXPERIENCE_STORE).put(record);
    await transactionDone(transaction);
  }

  async clearCamp(
    camp: string,
    expectedStoreRevision: number,
    replacementMeta: LearningCampMeta
  ): Promise<boolean> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [EXAMPLES_STORE, META_STORE, MANIFESTS_STORE, EXPERIENCE_STORE],
        'readwrite'
      );
      const metaStore = transaction.objectStore(META_STORE);
      let committed = false;
      const currentRequest = metaStore.get(camp) as IDBRequest<
      LearningCampMeta | undefined>;
      const deleteIndexedCamp = (storeName: string): void => {
        const request = transaction
          .objectStore(storeName)
          .index(CAMP_INDEX)
          .openCursor(camp);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          cursor.delete();
          cursor.continue();
        };
      };
      currentRequest.onsuccess = () => {
        const currentRevision = currentRequest.result?.storeRevision ?? 0;
        if (currentRevision !== expectedStoreRevision) return;
        deleteIndexedCamp(EXAMPLES_STORE);
        deleteIndexedCamp(MANIFESTS_STORE);
        transaction.objectStore(EXPERIENCE_STORE).delete(camp);
        metaStore.put(replacementMeta);
        committed = true;
      };
      currentRequest.onerror = () => {
        transaction.abort();
      };
      transaction.oncomplete = () => resolve(committed);
      transaction.onabort = () => reject(
        transaction.error ?? currentRequest.error ??
          new Error('Could not clear learning data.')
      );
      transaction.onerror = () => {
        // onabort reports the durable transaction error.
      };
    });
  }

  close(): void {
    if (!this.databasePromise) return;
    void this.databasePromise.then(
      (database) => database.close(),
      () => undefined
    );
    this.databasePromise = null;
  }
}

export function createIndexedDbLearningStore(
  options: CreateIndexedDbLearningStoreOptions = {}
): AutoCreateLearningStore {
  const {
    factory,
    databaseName,
    keyRange,
    exclusiveCoordinator,
    ...storeOptions
  } = options;
  const effectiveDatabaseName = databaseName ?? AUTO_CREATE_LEARNING_DB_NAME;
  return new AutoCreateLearningStore({
    ...storeOptions,
    persistence: new IndexedDbLearningPersistence({
      factory,
      databaseName: effectiveDatabaseName,
      keyRange
    }),
    exclusiveCoordinator: exclusiveCoordinator ??
      createWebLocksLearningExclusiveCoordinator({
        namespace: [
          'auto-create-learning',
          effectiveDatabaseName,
          AUTO_CREATE_LEARNING_DB_VERSION,
          AUTO_CREATE_LEARNING_STORE_SCHEMA_VERSION
        ].join(':')
      })
  });
}
