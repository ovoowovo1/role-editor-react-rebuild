import {
  AUTO_CREATE_FEATURE_SCHEMA_VERSION,
  AUTO_CREATE_RANKING_POLICY_VERSION
} from '../lib/conversion/auto-create-twrole/contracts';
import {
  DENSE_RANKER_HIDDEN_1,
  DENSE_RANKER_HIDDEN_2,
  DENSE_RANKER_OUTPUTS,
  denseRankerWeightsFromTfjsModel
} from '../lib/conversion/auto-create-twrole/learning/denseRanker';
import { FEATURE_COUNT } from '../lib/conversion/auto-create-twrole/learning/featureSchema';
import { createIndexedDbLearningStore } from '../lib/conversion/auto-create-twrole/learning/indexedDbStore';
import {
  buildAutoCreateTrainerDataset,
  evaluateAutoCreateTrainingReadinessFromStatus,
  isTrainerManifestUpToDate,
  normalizeAutoCreateTrainerOptions,
  shouldRetrainAutoCreateModel
} from '../lib/conversion/auto-create-twrole/learning/trainerProtocol';
import type {
  AutoCreateTrainerClearResult,
  AutoCreateTrainerRequest,
  AutoCreateTrainerResponse,
  AutoCreateTrainerSerializedError,
  AutoCreateTrainerTrainingResult
} from '../lib/conversion/auto-create-twrole/learning/trainerProtocol';
import type {
  LearningModelManifest,
  LearningStoreStatus
} from '../lib/conversion/auto-create-twrole/learning/types';

const store = createIndexedDbLearningStore({
  featureSchema: AUTO_CREATE_FEATURE_SCHEMA_VERSION,
  rankingPolicy: AUTO_CREATE_RANKING_POLICY_VERSION
});

const scope = globalThis as unknown as {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<AutoCreateTrainerRequest>) => void
  ): void;
  postMessage(message: AutoCreateTrainerResponse): void;
};

const campMutations = new Map<string, Promise<void>>();

function serializeError(error: unknown): AutoCreateTrainerSerializedError {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'Error', message: String(error) };
}

function normalizeCamp(camp: string): string {
  const normalized = camp.trim().toLocaleLowerCase('en-US');
  if (!normalized) throw new Error('camp must not be empty.');
  return normalized;
}

function enqueueCampMutation<T>(camp: string, operation: () => Promise<T>): Promise<T> {
  const previous = campMutations.get(camp) ?? Promise.resolve();
  const current = previous.then(operation, operation);
  const tracked = current.then(
    () => undefined,
    () => undefined
  );
  campMutations.set(camp, tracked);
  void tracked.then(() => {
    if (campMutations.get(camp) === tracked) campMutations.delete(camp);
  });
  return current;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function makeRevision(camp: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 12)
    ?? Math.random().toString(36).slice(2, 14);
  return `mlp-${Date.now().toString(36)}-${hashString(camp).toString(36)}-${randomPart}`;
}

function shuffledRows(length: number, seed: number): Uint32Array {
  const rows = Uint32Array.from({ length }, (_, index) => index);
  let state = seed || 0x9e3779b9;
  const random = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
  for (let index = length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const value = rows[index];
    rows[index] = rows[other];
    rows[other] = value;
  }
  return rows;
}

function batchValues(
  source: Float32Array,
  rows: Uint32Array,
  start: number,
  end: number,
  stride: number
): Float32Array {
  const output = new Float32Array((end - start) * stride);
  for (let index = start; index < end; index += 1) {
    const sourceOffset = rows[index] * stride;
    output.set(source.subarray(sourceOffset, sourceOffset + stride), (index - start) * stride);
  }
  return output;
}

async function trainAndSaveModel(
  camp: string,
  revision: string,
  dataset: ReturnType<typeof buildAutoCreateTrainerDataset>,
  rawOptions: Parameters<typeof normalizeAutoCreateTrainerOptions>[0]
): Promise<{
  manifest: LearningModelManifest;
  modelStorageUrl: string;
}> {
  const options = normalizeAutoCreateTrainerOptions(rawOptions);
  const tf = await import('@tensorflow/tfjs');
  await tf.ready();

  const seed = hashString(`${camp}:${dataset.exampleCount}:${dataset.exactCount}`);
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: DENSE_RANKER_HIDDEN_1,
    inputShape: [FEATURE_COUNT],
    activation: 'relu',
    kernelInitializer: tf.initializers.glorotUniform({ seed }),
    biasInitializer: 'zeros'
  }));
  model.add(tf.layers.dense({
    units: DENSE_RANKER_HIDDEN_2,
    activation: 'relu',
    kernelInitializer: tf.initializers.glorotUniform({ seed: seed + 1 }),
    biasInitializer: 'zeros'
  }));
  model.add(tf.layers.dense({
    units: DENSE_RANKER_OUTPUTS,
    activation: 'linear',
    kernelInitializer: tf.initializers.glorotUniform({ seed: seed + 2 }),
    biasInitializer: 'zeros'
  }));

  const optimizer = tf.train.adam(options.learningRate);
  try {
    for (let epoch = 0; epoch < options.epochs; epoch += 1) {
      const rows = shuffledRows(dataset.exampleCount, seed + epoch + 1);
      for (let start = 0; start < rows.length; start += options.batchSize) {
        const end = Math.min(rows.length, start + options.batchSize);
        const batchRows = end - start;
        const features = tf.tensor2d(
          batchValues(dataset.featureMatrix, rows, start, end, FEATURE_COUNT),
          [batchRows, FEATURE_COUNT]
        );
        const validity = tf.tensor2d(
          batchValues(dataset.validityLabels, rows, start, end, 1),
          [batchRows, 1]
        );
        const margins = tf.tensor2d(
          batchValues(dataset.marginLabels, rows, start, end, 1),
          [batchRows, 1]
        );
        const marginMask = tf.tensor2d(
          batchValues(dataset.marginMask, rows, start, end, 1),
          [batchRows, 1]
        );
        const loss = optimizer.minimize(() => tf.tidy(() => {
          const prediction = model.apply(features, { training: true }) as
          import('@tensorflow/tfjs').Tensor2D;
          const validityLogit = prediction.slice([0, 0], [batchRows, 1]);
          const predictedMargin = prediction.slice([0, 1], [batchRows, 1]);
          const validityLoss = tf.softplus(validityLogit)
            .sub(validity.mul(validityLogit))
            .mean();
          const maskedMarginSse = predictedMargin
            .sub(margins)
            .square()
            .mul(marginMask)
            .sum();
          const marginDenominator = marginMask.sum().maximum(tf.scalar(1));
          return validityLoss.add(maskedMarginSse.div(marginDenominator));
        }), true);
        features.dispose();
        validity.dispose();
        margins.dispose();
        marginMask.dispose();
        loss?.dispose();
      }
      await tf.nextFrame();
    }

    const modelStorageUrl = `indexeddb://auto-create-twrole/${camp}/${revision}`;
    const saveResult = await model.save(modelStorageUrl);
    const denseWeights = denseRankerWeightsFromTfjsModel(model, revision);
    const artifacts = saveResult.modelArtifactsInfo;
    const byteSize = (artifacts.modelTopologyBytes ?? 0)
      + (artifacts.weightSpecsBytes ?? 0)
      + (artifacts.weightDataBytes ?? 0);
    return {
      modelStorageUrl,
      manifest: {
        camp,
        revision,
        featureSchema: AUTO_CREATE_FEATURE_SCHEMA_VERSION,
        rankingPolicy: AUTO_CREATE_RANKING_POLICY_VERSION,
        runtime: 'typed',
        modelStorageUrl,
        inputSize: FEATURE_COUNT,
        outputSize: 2,
        createdAt: Date.now(),
        trainingExampleCount: dataset.exampleCount,
        targetSignatureCount: dataset.targetSignatureCount,
        trainingDataFingerprint: dataset.trainingDataFingerprint,
        trainingTargetSignatures: [...dataset.trainingTargetSignatures],
        trainedModes: [...dataset.eligibleModes],
        byteSize,
        denseWeights
      }
    };
  } finally {
    optimizer.dispose();
    model.dispose();
  }
}

async function safeRuntimeState(
  camp: string,
  status: Parameters<typeof store.setRuntimeState>[1]
): Promise<LearningStoreStatus | undefined> {
  try {
    return await store.setRuntimeState(camp, status);
  } catch {
    return undefined;
  }
}

async function trainCamp(
  camp: string,
  options: Parameters<typeof normalizeAutoCreateTrainerOptions>[0]
): Promise<AutoCreateTrainerTrainingResult> {
  const status = await store.getStatus(camp);
  const readiness = evaluateAutoCreateTrainingReadinessFromStatus(status);
  if (!status.enabled) {
    return { outcome: 'disabled', status, readiness, manifest: null };
  }
  if (!readiness.canTrain) {
    const collecting = await store.setRuntimeState(camp, {
      phase: 'collecting',
      runtime: 'none',
      stagingModelRevision: null,
      lastError: null
    });
    return { outcome: 'collecting', status: collecting, readiness, manifest: null };
  }

  const examples = await store.getExamples(camp, {
    featureSchema: AUTO_CREATE_FEATURE_SCHEMA_VERSION
  });
  const dataset = buildAutoCreateTrainerDataset(examples, readiness);
  const active = await store.getActiveModelManifest(camp);
  const normalizedOptions = normalizeAutoCreateTrainerOptions(options);
  if (
    !normalizedOptions.force
    && isTrainerManifestUpToDate(active, dataset)
  ) {
    return {
      outcome: 'up-to-date',
      status: await store.getStatus(camp),
      readiness,
      manifest: active
    };
  }
  if (
    !normalizedOptions.force
    && active
    && !shouldRetrainAutoCreateModel(active, dataset)
  ) {
    return {
      outcome: 'deferred',
      status: await store.getStatus(camp),
      readiness,
      manifest: active
    };
  }

  const revision = makeRevision(camp);
  await store.setRuntimeState(camp, {
    phase: 'training',
    runtime: 'none',
    stagingModelRevision: revision,
    lastError: null
  });
  let savedModelUrl: string | null = null;
  try {
    const trained = await trainAndSaveModel(camp, revision, dataset, normalizedOptions);
    savedModelUrl = trained.modelStorageUrl;
    await store.putModelManifest(trained.manifest);
    await store.setActiveModelRevision(camp, revision);

    // Model revisions are immutable snapshot dependencies. Keep every native
    // TFJS model and manifest until the user explicitly clears this camp.
    return {
      outcome: 'trained',
      status: await store.setRuntimeState(camp, {
        phase: 'ready',
        runtime: trained.manifest.runtime,
        stagingModelRevision: null,
        lastError: null,
        lastTrainedAt: Date.now()
      }),
      readiness,
      manifest: trained.manifest
    };
  } catch (error) {
    if (savedModelUrl) {
      try {
        const tf = await import('@tensorflow/tfjs');
        await tf.io.removeModel(savedModelUrl);
      } catch {
        // Best-effort orphan cleanup only.
      }
    }
    await safeRuntimeState(camp, {
      phase: 'fallback',
      runtime: 'none',
      stagingModelRevision: null,
      lastError: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function clearCamp(
  camp: string,
  preserveEnabled: boolean
): Promise<AutoCreateTrainerClearResult> {
  const cleared = await store.clearCamp(camp, { preserveEnabled });
  const modelCleanupErrors: string[] = [];
  if (cleared.modelStorageUrls.length > 0) {
    try {
      const tf = await import('@tensorflow/tfjs');
      for (const url of cleared.modelStorageUrls) {
        try {
          await tf.io.removeModel(url);
        } catch (error) {
          modelCleanupErrors.push(
            `${url}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      modelCleanupErrors.push(
        `TensorFlow.js: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return {
    cleared,
    status: await store.getStatus(camp),
    modelCleanupErrors
  };
}

async function handleRequest(message: AutoCreateTrainerRequest): Promise<void> {
  let camp: string | null = null;
  try {
    const normalizedCamp = normalizeCamp(message.camp);
    camp = normalizedCamp;
    if (message.type === 'get-status') {
      const status = await store.getStatus(normalizedCamp);
      const activeManifest = await store.getActiveModelManifest(normalizedCamp);
      scope.postMessage({
        type: 'status',
        id: message.id,
        status,
        readiness: evaluateAutoCreateTrainingReadinessFromStatus(status),
        activeTrainedModes: activeManifest ? [...activeManifest.trainedModes] : []
      });
      return;
    }
    if (message.type === 'train') {
      const result = await enqueueCampMutation(
        normalizedCamp,
        () => trainCamp(normalizedCamp, message.options)
      );
      scope.postMessage({ type: 'training-result', id: message.id, result });
      return;
    }
    if (message.type === 'clear') {
      const result = await enqueueCampMutation(
        normalizedCamp,
        () => clearCamp(normalizedCamp, message.preserveEnabled ?? true)
      );
      scope.postMessage({ type: 'clear-result', id: message.id, result });
      return;
    }
    const status = await enqueueCampMutation(
      normalizedCamp,
      () => store.setEnabled(normalizedCamp, message.enabled)
    );
    scope.postMessage({ type: 'enabled-result', id: message.id, status });
  } catch (error) {
    scope.postMessage({
      type: 'error',
      id: message.id,
      error: serializeError(error),
      ...(camp === null ? {} : { status: await safeRuntimeState(camp, {}) })
    });
  }
}

scope.addEventListener('message', (event) => {
  if (!event.data?.id) return;
  void handleRequest(event.data);
});
