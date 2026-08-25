import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as tf from '@tensorflow/tfjs';
import {
  DENSE_RANKER_HIDDEN_1,
  DENSE_RANKER_HIDDEN_2,
  DENSE_RANKER_OUTPUTS,
  denseRankerWeightsFromTfjsModel
} from '../src/lib/conversion/auto-create-twrole/learning/denseRanker';
import { FEATURE_COUNT } from '../src/lib/conversion/auto-create-twrole/learning/featureSchema';
import {
  decodePortableDatasetRow,
  PORTABLE_DATASET_RECORD_BYTES,
  stablePortableHash,
  type DecodedPortableDatasetRow,
  type PortableDatasetManifest
} from '../src/lib/conversion/auto-create-twrole/learning/portableDataset';
import {
  finalizePortableModel,
  type PortableRankerModel
} from '../src/lib/conversion/auto-create-twrole/learning/portableModel';
import { TRAINING_DATA_FINGERPRINT_VERSION } from
  '../src/lib/conversion/auto-create-twrole/learning/types';

interface Options {
  dataset: string;
  output: string;
  all: boolean;
  maxExamples: number;
  seed: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
}

interface SelectedRow {
  row: DecodedPortableDatasetRow;
  priority: number;
}

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  let all = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === '--all') {
      all = true;
      continue;
    }
    if (!argument.startsWith('--') || !argv[index + 1]) {
      throw new Error(`Invalid argument: ${argument}`);
    }
    values.set(argument.slice(2), argv[++index]!);
  }
  const dataset = values.get('dataset');
  const output = values.get('output');
  if (!dataset || !output) {
    throw new Error('Usage: --dataset <folder> --output <folder> [--all]');
  }
  const options = {
    dataset: path.resolve(dataset),
    output: path.resolve(output),
    all,
    maxExamples: Number(values.get('max-examples') ?? 200_000),
    seed: Number(values.get('seed') ?? 1337),
    epochs: Number(values.get('epochs') ?? 6),
    batchSize: Number(values.get('batch-size') ?? 256),
    learningRate: Number(values.get('learning-rate') ?? 1e-3),
    validationSplit: Number(values.get('validation-split') ?? 0.1)
  };
  if (
    !Number.isInteger(options.maxExamples) || options.maxExamples <= 0
    || !Number.isInteger(options.seed)
    || !Number.isInteger(options.epochs) || options.epochs <= 0
    || !Number.isInteger(options.batchSize) || options.batchSize <= 0
    || !Number.isFinite(options.learningRate) || options.learningRate <= 0
    || !Number.isFinite(options.validationSplit)
    || options.validationSplit < 0 || options.validationSplit >= 0.5
  ) {
    throw new Error('Training numeric options are invalid.');
  }
  return options;
}

async function loadManifest(folder: string): Promise<PortableDatasetManifest> {
  const manifest = JSON.parse(
    await readFile(path.join(folder, 'manifest.json'), 'utf8')
  ) as PortableDatasetManifest;
  if (
    manifest.format !== 'auto-create-portable-dataset'
    || manifest.version !== 1
    || !manifest.complete
    || manifest.featureCount !== FEATURE_COUNT
    || manifest.recordBytes !== PORTABLE_DATASET_RECORD_BYTES
  ) {
    throw new Error('Dataset manifest is incomplete or incompatible.');
  }
  return manifest;
}

async function readVerifiedShard(
  folder: string,
  shard: PortableDatasetManifest['shards'][number]
): Promise<Uint8Array> {
  const data = new Uint8Array(await readFile(path.join(folder, shard.file)));
  if (data.byteLength !== shard.bytes || data.byteLength !== shard.rows * PORTABLE_DATASET_RECORD_BYTES) {
    throw new Error(`Shard ${shard.file} has an invalid size.`);
  }
  const checksum = createHash('sha256').update(data).digest('hex');
  if (checksum !== shard.sha256) throw new Error(`Shard ${shard.file} checksum mismatch.`);
  return data;
}

function stratum(row: DecodedPortableDatasetRow): string {
  const margin = row.outcome === 'invalid'
    ? 'invalid'
    : Math.abs(row.margin) <= 1e-7
      ? 'near-zero'
      : row.margin > 0 ? 'positive' : 'negative';
  const prediction = Number.isFinite(row.predictedMargin)
    ? row.predictedMargin > 0 && row.validity === 0
      ? 'hard-negative'
      : row.predictedMargin <= 0 && row.validity === 1 && row.margin > 0
        ? 'hard-positive'
        : 'normal'
    : 'unscored';
  return `${row.mode}:${row.targetIndex}:${margin}:${prediction}:${row.provenanceCode}`;
}

async function selectRows(
  options: Options,
  manifest: PortableDatasetManifest
): Promise<DecodedPortableDatasetRow[] | null> {
  if (options.all) return null;
  const counts = new Map<string, number>();
  for (const shard of manifest.shards) {
    const data = await readVerifiedShard(options.dataset, shard);
    for (let rowIndex = 0; rowIndex < shard.rows; rowIndex += 1) {
      const key = stratum(decodePortableDatasetRow(data, rowIndex));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const caps = new Map<string, number>();
  for (const [key, count] of counts) {
    caps.set(key, Math.min(count, Math.max(32, Math.floor(options.maxExamples * count / total))));
  }
  const selected = new Map<string, SelectedRow[]>();
  const seenByStratum = new Map<string, number>();
  for (const shard of manifest.shards) {
    const data = await readVerifiedShard(options.dataset, shard);
    for (let rowIndex = 0; rowIndex < shard.rows; rowIndex += 1) {
      const row = decodePortableDatasetRow(data, rowIndex);
      const key = stratum(row);
      const priority = stablePortableHash(`${options.seed}:${row.sampleHash}:${key}`);
      const bucket = selected.get(key) ?? [];
      const cap = caps.get(key) ?? 0;
      const seen = (seenByStratum.get(key) ?? 0) + 1;
      seenByStratum.set(key, seen);
      if (bucket.length < cap) {
        bucket.push({ row, priority });
      } else if (cap > 0) {
        const replacement = stablePortableHash(
          `${options.seed}:${key}:${row.sampleHash}:${seen}`
        ) % seen;
        if (replacement < cap) bucket[replacement] = { row, priority };
      }
      selected.set(key, bucket);
    }
  }
  const mandatory: SelectedRow[] = [];
  const remainder: SelectedRow[] = [];
  for (const bucket of selected.values()) {
    bucket.sort((left, right) => left.priority - right.priority);
    if (bucket[0]) mandatory.push(bucket[0]);
    remainder.push(...bucket.slice(1));
  }
  const chosen = [
    ...mandatory.sort((left, right) => left.priority - right.priority),
    ...remainder.sort((left, right) => left.priority - right.priority)
      .slice(0, Math.max(0, options.maxExamples - mandatory.length))
  ];
  return chosen.slice(0, options.maxExamples).map(({ row }) => row);
}

function shuffledIndices(length: number, seed: number): Uint32Array {
  const indices = Uint32Array.from({ length }, (_, index) => index);
  let state = seed || 1;
  const random = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
  for (let index = length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [indices[index], indices[other]] = [indices[other]!, indices[index]!];
  }
  return indices;
}

function trainBatch(
  model: tf.LayersModel,
  optimizer: tf.Optimizer,
  rows: readonly DecodedPortableDatasetRow[]
): number {
  const features = new Float32Array(rows.length * FEATURE_COUNT);
  const validity = new Float32Array(rows.length);
  const margins = new Float32Array(rows.length);
  const masks = new Float32Array(rows.length);
  rows.forEach((row, index) => {
    features.set(row.features, index * FEATURE_COUNT);
    validity[index] = row.validity;
    margins[index] = row.margin;
    masks[index] = row.marginMask;
  });
  return tf.tidy(() => {
    const x = tf.tensor2d(features, [rows.length, FEATURE_COUNT]);
    const yValidity = tf.tensor2d(validity, [rows.length, 1]);
    const yMargins = tf.tensor2d(margins, [rows.length, 1]);
    const yMask = tf.tensor2d(masks, [rows.length, 1]);
    const loss = optimizer.minimize(() => {
      const prediction = model.apply(x, { training: true }) as tf.Tensor2D;
      const validityLogit = prediction.slice([0, 0], [rows.length, 1]);
      const predictedMargin = prediction.slice([0, 1], [rows.length, 1]);
      const validityLoss = tf.softplus(validityLogit)
        .sub(yValidity.mul(validityLogit))
        .mean();
      const marginLoss = predictedMargin.sub(yMargins).square().mul(yMask).sum()
        .div(yMask.sum().maximum(tf.scalar(1)));
      return validityLoss.add(marginLoss);
    }, true);
    return loss?.dataSync()[0] ?? Number.NaN;
  });
}

function isValidationRow(row: DecodedPortableDatasetRow, split: number): boolean {
  return row.sampleHash / 0x1_0000_0000 < split;
}

function evaluateBatch(model: tf.LayersModel, rows: readonly DecodedPortableDatasetRow[]): number {
  if (rows.length === 0) return 0;
  const features = new Float32Array(rows.length * FEATURE_COUNT);
  const validity = new Float32Array(rows.length);
  const margins = new Float32Array(rows.length);
  const masks = new Float32Array(rows.length);
  rows.forEach((row, index) => {
    features.set(row.features, index * FEATURE_COUNT);
    validity[index] = row.validity;
    margins[index] = row.margin;
    masks[index] = row.marginMask;
  });
  return tf.tidy(() => {
    const prediction = model.predict(
      tf.tensor2d(features, [rows.length, FEATURE_COUNT])
    ) as tf.Tensor2D;
    const validityLogit = prediction.slice([0, 0], [rows.length, 1]);
    const predictedMargin = prediction.slice([0, 1], [rows.length, 1]);
    const yValidity = tf.tensor2d(validity, [rows.length, 1]);
    const yMargins = tf.tensor2d(margins, [rows.length, 1]);
    const yMask = tf.tensor2d(masks, [rows.length, 1]);
    return tf.softplus(validityLogit).sub(yValidity.mul(validityLogit)).mean()
      .add(
        predictedMargin.sub(yMargins).square().mul(yMask).sum()
          .div(yMask.sum().maximum(tf.scalar(1)))
      )
      .dataSync()[0]!;
  });
}

async function rowsForAll(
  options: Options,
  manifest: PortableDatasetManifest,
  epoch: number,
  visit: (batch: DecodedPortableDatasetRow[]) => void
): Promise<void> {
  const order = [...manifest.shards.keys()];
  const shuffled = shuffledIndices(order.length, options.seed + epoch);
  for (const shardIndex of shuffled) {
    const shard = manifest.shards[shardIndex]!;
    const data = await readVerifiedShard(options.dataset, shard);
    const rows = shuffledIndices(shard.rows, options.seed + epoch * 1009 + shardIndex);
    for (let start = 0; start < rows.length; start += options.batchSize) {
      const batch: DecodedPortableDatasetRow[] = [];
      for (let index = start; index < Math.min(rows.length, start + options.batchSize); index += 1) {
        batch.push(decodePortableDatasetRow(data, rows[index]!));
      }
      visit(batch);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest(options.dataset);
  await mkdir(options.output, { recursive: true });
  await writeFile(path.join(options.output, 'training.incomplete.json'), JSON.stringify({
    startedAt: Date.now(),
    options
  }, null, 2));
  const selected = await selectRows(options, manifest);
  const seed = options.seed;
  const model = tf.sequential();
  model.add(tf.layers.dense({
    inputShape: [FEATURE_COUNT],
    units: DENSE_RANKER_HIDDEN_1,
    activation: 'relu',
    kernelInitializer: tf.initializers.glorotUniform({ seed })
  }));
  model.add(tf.layers.dense({
    units: DENSE_RANKER_HIDDEN_2,
    activation: 'relu',
    kernelInitializer: tf.initializers.glorotUniform({ seed: seed + 1 })
  }));
  model.add(tf.layers.dense({
    units: DENSE_RANKER_OUTPUTS,
    activation: 'linear',
    kernelInitializer: tf.initializers.glorotUniform({ seed: seed + 2 })
  }));
  const optimizer = tf.train.adam(options.learningRate);
  const epochLosses: number[] = [];
  try {
    for (let epoch = 0; epoch < options.epochs; epoch += 1) {
      let weightedLoss = 0;
      let seen = 0;
      if (selected) {
        const trainingRows = selected.filter(
          (row) => !isValidationRow(row, options.validationSplit)
        );
        const order = shuffledIndices(trainingRows.length, seed + epoch + 1);
        for (let start = 0; start < order.length; start += options.batchSize) {
          const batch = [...order.subarray(start, Math.min(order.length, start + options.batchSize))]
            .map((index) => trainingRows[index]!);
          weightedLoss += trainBatch(model, optimizer, batch) * batch.length;
          seen += batch.length;
        }
      } else {
        await rowsForAll(options, manifest, epoch, (batch) => {
          const trainingBatch = batch.filter(
            (row) => !isValidationRow(row, options.validationSplit)
          );
          if (trainingBatch.length > 0) {
            weightedLoss += trainBatch(model, optimizer, trainingBatch) * trainingBatch.length;
            seen += trainingBatch.length;
          }
        });
      }
      const loss = weightedLoss / Math.max(1, seen);
      epochLosses.push(loss);
      console.log(`[auto-create:train] epoch=${epoch + 1}/${options.epochs} rows=${seen} loss=${loss}`);
    }
    const revision = `mlp-local-${Date.now().toString(36)}-${stablePortableHash(manifest.camp).toString(36)}`;
    const dense = denseRankerWeightsFromTfjsModel(model, revision);
    const parityFeatures = Array.from({ length: FEATURE_COUNT * 4 }, (_, index) => (
      ((stablePortableHash(`${seed}:${index}`) / 0xffffffff) * 2 - 1)
    ));
    const parityTensor = tf.tensor2d(parityFeatures, [4, FEATURE_COUNT]);
    const parityPredictions = Array.from((model.predict(parityTensor) as tf.Tensor).dataSync());
    parityTensor.dispose();
    let validationWeightedLoss = 0;
    let validationRows = 0;
    if (selected) {
      const validation = selected.filter(
        (row) => isValidationRow(row, options.validationSplit)
      );
      for (let start = 0; start < validation.length; start += options.batchSize) {
        const batch = validation.slice(start, start + options.batchSize);
        validationWeightedLoss += evaluateBatch(model, batch) * batch.length;
        validationRows += batch.length;
      }
    } else {
      await rowsForAll(options, manifest, options.epochs + 1, (batch) => {
        const validation = batch.filter(
          (row) => isValidationRow(row, options.validationSplit)
        );
        if (validation.length > 0) {
          validationWeightedLoss += evaluateBatch(model, validation) * validation.length;
          validationRows += validation.length;
        }
      });
    }
    const validationLoss = validationWeightedLoss / Math.max(1, validationRows);
    const unsigned: Omit<PortableRankerModel, 'checksum'> = {
      format: 'auto-create-portable-ranker',
      version: 1,
      camp: manifest.camp,
      revision,
      featureSchema: manifest.featureSchema,
      rankingPolicy: manifest.rankingPolicy,
      createdAt: Date.now(),
      trainingExampleCount: selected?.length ?? manifest.exportedTrainableCount,
      targetSignatureCount: manifest.targetSignatures.length,
      trainingDataFingerprint: `${TRAINING_DATA_FINGERPRINT_VERSION}:${
        createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0, 32)
      }`,
      trainingTargetSignatures: [...manifest.targetSignatures].sort(),
      trainedModes: (['add', 'replace'] as const).filter(
        (mode) => manifest.trainableModeCounts[mode] > 0
      ),
      weights: {
        dense1Kernel: Array.from(dense.dense1Kernel),
        dense1Bias: Array.from(dense.dense1Bias),
        dense2Kernel: Array.from(dense.dense2Kernel),
        dense2Bias: Array.from(dense.dense2Bias),
        outputKernel: Array.from(dense.outputKernel),
        outputBias: Array.from(dense.outputBias)
      },
      parity: { features: parityFeatures, predictions: parityPredictions, tolerance: 1e-5 },
      metrics: { validationLoss }
    };
    const portable = await finalizePortableModel(unsigned);
    const packedWeights = Float32Array.from([
      ...dense.dense1Kernel,
      ...dense.dense1Bias,
      ...dense.dense2Kernel,
      ...dense.dense2Bias,
      ...dense.outputKernel,
      ...dense.outputBias
    ]);
    const report = {
      revision,
      dataset: options.dataset,
      sampled: !options.all,
      trainingExampleCount: portable.trainingExampleCount,
      sourceTrainableCount: manifest.exportedTrainableCount,
      epochLosses,
      validationLoss,
      validationRows,
      seed,
      options,
      completedAt: Date.now()
    };
    await writeFile(path.join(options.output, 'model.json'), JSON.stringify(portable));
    await writeFile(
      path.join(options.output, 'weights.bin'),
      new Uint8Array(packedWeights.buffer)
    );
    await writeFile(path.join(options.output, 'training-report.json'), JSON.stringify(report, null, 2));
    await writeFile(path.join(options.output, 'training.incomplete.json'), JSON.stringify({
      complete: true,
      revision
    }, null, 2));
    console.log(`[auto-create:train] wrote ${path.join(options.output, 'model.json')}`);
  } finally {
    optimizer.dispose();
    model.dispose();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
