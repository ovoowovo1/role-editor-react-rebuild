import { AUTO_CREATE_FEATURE_SCHEMA_VERSION } from '../contracts';
import { FEATURE_COUNT } from './featureSchema';

export const DENSE_RANKER_HIDDEN_1 = 64;
export const DENSE_RANKER_HIDDEN_2 = 32;
export const DENSE_RANKER_OUTPUTS = 2;
export const DENSE_RANKER_OUTPUT_VALIDITY = 0;
export const DENSE_RANKER_OUTPUT_MARGIN = 1;

export const DENSE_RANKER_ARCHITECTURE = Object.freeze({
  input: FEATURE_COUNT,
  hidden1: DENSE_RANKER_HIDDEN_1,
  hidden2: DENSE_RANKER_HIDDEN_2,
  outputs: DENSE_RANKER_OUTPUTS,
  hiddenActivation: 'relu' as const,
  outputActivation: 'linear' as const
});

export interface DenseRankerWeights {
  readonly revision: string;
  readonly featureSchema: string;
  readonly inputSize: number;
  /** Row-major [inputSize, 64]. */
  readonly dense1Kernel: Float32Array;
  readonly dense1Bias: Float32Array;
  /** Row-major [64, 32]. */
  readonly dense2Kernel: Float32Array;
  readonly dense2Bias: Float32Array;
  /** Row-major [32, 2], validity logit followed by conditional margin. */
  readonly outputKernel: Float32Array;
  readonly outputBias: Float32Array;
}

export interface TfjsTensorWeightLike {
  readonly shape: readonly number[];
  dataSync(): ArrayLike<number>;
}

export interface TfjsModelWeightSource {
  getWeights(): readonly TfjsTensorWeightLike[];
}

export interface TfjsDenseRankerAdapter {
  readonly revision: string;
  predictSync(features: ArrayLike<number>, rowCount?: number): Float32Array;
  predict(features: ArrayLike<number>, rowCount?: number): Promise<Float32Array>;
  dispose(): void;
}

export interface DenseRankerPredictor {
  readonly revision: string;
  readonly runtime: 'tfjs' | 'typed';
  predict(features: ArrayLike<number>, rowCount?: number): Float32Array;
  dispose?(): void;
}

export function createTypedDenseRankerPredictor(weights: DenseRankerWeights): DenseRankerPredictor {
  validateDenseRankerWeights(weights);
  return {
    revision: weights.revision,
    runtime: 'typed',
    predict: (features, rowCount) => runDenseRankerBatch(weights, features, rowCount)
  };
}

const FEATURE_INPUT_LIMIT = 8;
const ACTIVATION_LIMIT = 1.0e20;
const INVALID_RANK_SCORE = -Number.MAX_VALUE;

function expectedLengths(inputSize: number): readonly number[] {
  return [
    inputSize * DENSE_RANKER_HIDDEN_1,
    DENSE_RANKER_HIDDEN_1,
    DENSE_RANKER_HIDDEN_1 * DENSE_RANKER_HIDDEN_2,
    DENSE_RANKER_HIDDEN_2,
    DENSE_RANKER_HIDDEN_2 * DENSE_RANKER_OUTPUTS,
    DENSE_RANKER_OUTPUTS
  ];
}

function assertFiniteArray(name: string, values: Float32Array, expectedLength: number): void {
  if (values.length !== expectedLength) {
    throw new RangeError(`${name} must contain ${expectedLength} values; received ${values.length}.`);
  }
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) {
      throw new TypeError(`${name}[${index}] must be finite.`);
    }
  }
}

/**
 * Rejects mismatched/corrupt model revisions before they reach either runtime.
 */
export function validateDenseRankerWeights(weights: DenseRankerWeights): void {
  if (weights.featureSchema !== AUTO_CREATE_FEATURE_SCHEMA_VERSION) {
    throw new Error(
      `Dense ranker feature schema ${weights.featureSchema} does not match ${AUTO_CREATE_FEATURE_SCHEMA_VERSION}.`
    );
  }
  if (weights.inputSize !== FEATURE_COUNT) {
    throw new RangeError(`Dense ranker input size must be ${FEATURE_COUNT}; received ${weights.inputSize}.`);
  }
  const lengths = expectedLengths(weights.inputSize);
  assertFiniteArray('dense1Kernel', weights.dense1Kernel, lengths[0]);
  assertFiniteArray('dense1Bias', weights.dense1Bias, lengths[1]);
  assertFiniteArray('dense2Kernel', weights.dense2Kernel, lengths[2]);
  assertFiniteArray('dense2Bias', weights.dense2Bias, lengths[3]);
  assertFiniteArray('outputKernel', weights.outputKernel, lengths[4]);
  assertFiniteArray('outputBias', weights.outputBias, lengths[5]);
}

export function createZeroDenseRankerWeights(revision = 'untrained'): DenseRankerWeights {
  const lengths = expectedLengths(FEATURE_COUNT);
  return {
    revision,
    featureSchema: AUTO_CREATE_FEATURE_SCHEMA_VERSION,
    inputSize: FEATURE_COUNT,
    dense1Kernel: new Float32Array(lengths[0]),
    dense1Bias: new Float32Array(lengths[1]),
    dense2Kernel: new Float32Array(lengths[2]),
    dense2Bias: new Float32Array(lengths[3]),
    outputKernel: new Float32Array(lengths[4]),
    outputBias: new Float32Array(lengths[5])
  };
}

function sanitizeFeature(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(-FEATURE_INPUT_LIMIT, Math.min(FEATURE_INPUT_LIMIT, value));
}

function boundedActivation(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(-ACTIVATION_LIMIT, Math.min(ACTIVATION_LIMIT, value));
}

function resolveRowCount(features: ArrayLike<number>, rowCount: number | undefined): number {
  if (rowCount === undefined) {
    if (features.length % FEATURE_COUNT !== 0) {
      throw new RangeError(`Feature matrix length must be divisible by ${FEATURE_COUNT}.`);
    }
    return features.length / FEATURE_COUNT;
  }
  if (!Number.isInteger(rowCount) || rowCount < 0) {
    throw new RangeError('rowCount must be a non-negative integer.');
  }
  if (features.length < rowCount * FEATURE_COUNT) {
    throw new RangeError(`Feature matrix is too short for ${rowCount} rows.`);
  }
  return rowCount;
}

/**
 * Allocation-conscious reference runtime for the frozen 64→32→2 MLP.
 * The returned matrix is row-major `[validityLogit, conditionalMargin]`.
 */
export function runDenseRankerBatch(
  weights: DenseRankerWeights,
  features: ArrayLike<number>,
  rowCount?: number
): Float32Array {
  validateDenseRankerWeights(weights);
  const rows = resolveRowCount(features, rowCount);
  const output = new Float32Array(rows * DENSE_RANKER_OUTPUTS);
  if (rows === 0) return output;

  const hidden1 = new Float64Array(DENSE_RANKER_HIDDEN_1);
  const hidden2 = new Float64Array(DENSE_RANKER_HIDDEN_2);
  for (let row = 0; row < rows; row += 1) {
    const featureOffset = row * FEATURE_COUNT;
    for (let unit = 0; unit < DENSE_RANKER_HIDDEN_1; unit += 1) {
      let sum = weights.dense1Bias[unit];
      for (let feature = 0; feature < FEATURE_COUNT; feature += 1) {
        sum += sanitizeFeature(features[featureOffset + feature])
          * weights.dense1Kernel[feature * DENSE_RANKER_HIDDEN_1 + unit];
      }
      hidden1[unit] = Math.max(0, boundedActivation(sum));
    }

    for (let unit = 0; unit < DENSE_RANKER_HIDDEN_2; unit += 1) {
      let sum = weights.dense2Bias[unit];
      for (let previous = 0; previous < DENSE_RANKER_HIDDEN_1; previous += 1) {
        sum += hidden1[previous]
          * weights.dense2Kernel[previous * DENSE_RANKER_HIDDEN_2 + unit];
      }
      hidden2[unit] = Math.max(0, boundedActivation(sum));
    }

    const outputOffset = row * DENSE_RANKER_OUTPUTS;
    for (let unit = 0; unit < DENSE_RANKER_OUTPUTS; unit += 1) {
      let sum = weights.outputBias[unit];
      for (let previous = 0; previous < DENSE_RANKER_HIDDEN_2; previous += 1) {
        sum += hidden2[previous]
          * weights.outputKernel[previous * DENSE_RANKER_OUTPUTS + unit];
      }
      output[outputOffset + unit] = boundedActivation(sum);
    }
  }

  return output;
}

function softplus(value: number): number {
  if (value > 20) return value;
  if (value < -20) return Math.exp(value);
  return Math.log1p(Math.exp(value));
}

/**
 * Combines the validity logit and conditional exact-decision margin without
 * turning either output into an acceptance decision.
 */
export function denseRankScore(validityLogit: number, conditionalMargin: number): number {
  if (!Number.isFinite(validityLogit) || !Number.isFinite(conditionalMargin)) {
    return INVALID_RANK_SCORE;
  }
  return boundedActivation(conditionalMargin - softplus(-validityLogit));
}

/** Returns row indices ordered by descending score and then proposal index. */
export function stableRankScores(
  scores: ArrayLike<number>,
  proposalIndices?: ArrayLike<number>
): number[] {
  if (proposalIndices && proposalIndices.length < scores.length) {
    throw new RangeError('proposalIndices must contain one value per score.');
  }
  const indices = Array.from({ length: scores.length }, (_, index) => index);
  indices.sort((left, right) => {
    const rawLeftScore = Number(scores[left]);
    const rawRightScore = Number(scores[right]);
    const leftScore = Number.isFinite(rawLeftScore) ? rawLeftScore : INVALID_RANK_SCORE;
    const rightScore = Number.isFinite(rawRightScore) ? rawRightScore : INVALID_RANK_SCORE;
    if (leftScore !== rightScore) return rightScore > leftScore ? 1 : -1;
    const rawLeftProposal = proposalIndices?.[left];
    const rawRightProposal = proposalIndices?.[right];
    const leftProposal = typeof rawLeftProposal === 'number' && Number.isFinite(rawLeftProposal)
      ? Number(rawLeftProposal)
      : left;
    const rightProposal = typeof rawRightProposal === 'number' && Number.isFinite(rawRightProposal)
      ? Number(rawRightProposal)
      : right;
    if (leftProposal !== rightProposal) return leftProposal < rightProposal ? -1 : 1;
    return left - right;
  });
  return indices;
}

/**
 * Ranks an interleaved 2-column prediction matrix. Exact ties always prefer
 * the smaller proposalIndex, independent of the input row order.
 */
export function stableRankPredictions(
  predictions: ArrayLike<number>,
  proposalIndices?: ArrayLike<number>
): number[] {
  if (predictions.length % DENSE_RANKER_OUTPUTS !== 0) {
    throw new RangeError('Prediction matrix must have exactly two values per row.');
  }
  const rows = predictions.length / DENSE_RANKER_OUTPUTS;
  if (proposalIndices && proposalIndices.length < rows) {
    throw new RangeError('proposalIndices must contain one value per prediction row.');
  }
  const scores = new Float64Array(rows);
  for (let row = 0; row < rows; row += 1) {
    scores[row] = denseRankScore(
      predictions[row * DENSE_RANKER_OUTPUTS + DENSE_RANKER_OUTPUT_VALIDITY],
      predictions[row * DENSE_RANKER_OUTPUTS + DENSE_RANKER_OUTPUT_MARGIN]
    );
  }
  return stableRankScores(scores, proposalIndices);
}

function sanitizedFeatureMatrix(
  features: ArrayLike<number>,
  rowCount: number
): Float32Array {
  const matrix = new Float32Array(rowCount * FEATURE_COUNT);
  for (let index = 0; index < matrix.length; index += 1) {
    matrix[index] = sanitizeFeature(features[index]);
  }
  return matrix;
}

/**
 * Creates a TFJS adapter lazily. There is intentionally no top-level TFJS
 * value import, keeping the library in a worker-only async chunk.
 */
export async function createTfjsDenseRankerAdapter(
  weights: DenseRankerWeights
): Promise<TfjsDenseRankerAdapter> {
  validateDenseRankerWeights(weights);
  const tf = await import('@tensorflow/tfjs');
  await tf.ready();

  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: DENSE_RANKER_HIDDEN_1,
    inputShape: [FEATURE_COUNT],
    activation: 'relu',
    useBias: true,
    trainable: false
  }));
  model.add(tf.layers.dense({
    units: DENSE_RANKER_HIDDEN_2,
    activation: 'relu',
    useBias: true,
    trainable: false
  }));
  model.add(tf.layers.dense({
    units: DENSE_RANKER_OUTPUTS,
    activation: 'linear',
    useBias: true,
    trainable: false
  }));

  const tensors = [
    tf.tensor2d(weights.dense1Kernel, [FEATURE_COUNT, DENSE_RANKER_HIDDEN_1]),
    tf.tensor1d(weights.dense1Bias),
    tf.tensor2d(weights.dense2Kernel, [DENSE_RANKER_HIDDEN_1, DENSE_RANKER_HIDDEN_2]),
    tf.tensor1d(weights.dense2Bias),
    tf.tensor2d(weights.outputKernel, [DENSE_RANKER_HIDDEN_2, DENSE_RANKER_OUTPUTS]),
    tf.tensor1d(weights.outputBias)
  ];
  try {
    model.setWeights(tensors);
  } finally {
    tensors.forEach((tensor) => tensor.dispose());
  }

  let disposed = false;
  const predictSync = (features: ArrayLike<number>, rowCount?: number): Float32Array => {
    if (disposed) throw new Error('TFJS dense ranker adapter is disposed.');
    const rows = resolveRowCount(features, rowCount);
    if (rows === 0) return new Float32Array();
    const input = tf.tensor2d(sanitizedFeatureMatrix(features, rows), [rows, FEATURE_COUNT]);
    const rawPrediction = model.predict(input, {
      batchSize: Math.min(1024, Math.max(1, rows))
    });
    const predictionTensors = Array.isArray(rawPrediction) ? rawPrediction : [rawPrediction];
    try {
      if (predictionTensors.length !== 1) {
        throw new Error(`Dense ranker produced ${predictionTensors.length} tensors instead of one.`);
      }
      const output = Float32Array.from(predictionTensors[0].dataSync());
      for (let index = 0; index < output.length; index += 1) {
        output[index] = boundedActivation(output[index]);
      }
      return output;
    } finally {
      input.dispose();
      predictionTensors.forEach((tensor) => tensor.dispose());
    }
  };
  return {
    revision: weights.revision,
    predictSync,
    async predict(features: ArrayLike<number>, rowCount?: number): Promise<Float32Array> {
      return predictSync(features, rowCount);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      model.dispose();
    }
  };
}

export async function createTfjsDenseRankerPredictor(
  weights: DenseRankerWeights
): Promise<DenseRankerPredictor> {
  const adapter = await createTfjsDenseRankerAdapter(weights);
  return {
    revision: adapter.revision,
    runtime: 'tfjs',
    predict: (features, rowCount) => adapter.predictSync(features, rowCount),
    dispose: () => adapter.dispose()
  };
}

/** One-shot convenience function used by diagnostics and runtime benchmarks. */
export async function predictDenseRankerTfjs(
  weights: DenseRankerWeights,
  features: ArrayLike<number>,
  rowCount?: number
): Promise<Float32Array> {
  const adapter = await createTfjsDenseRankerAdapter(weights);
  try {
    return await adapter.predict(features, rowCount);
  } finally {
    adapter.dispose();
  }
}

function copyTensor(
  tensor: TfjsTensorWeightLike,
  expectedShape: readonly number[],
  name: string
): Float32Array {
  if (
    tensor.shape.length !== expectedShape.length
    || tensor.shape.some((value, index) => value !== expectedShape[index])
  ) {
    throw new RangeError(`${name} has shape [${tensor.shape.join(',')}], expected [${expectedShape.join(',')}].`);
  }
  return Float32Array.from(tensor.dataSync());
}

/**
 * Extracts trained TFJS layer weights into the portable TypedArray schema.
 * `LayersModel` is accepted structurally, so importing this module stays lazy.
 */
export function denseRankerWeightsFromTfjsModel(
  model: TfjsModelWeightSource,
  revision: string
): DenseRankerWeights {
  const tensors = model.getWeights();
  if (tensors.length !== 6) {
    throw new RangeError(`Dense ranker TFJS model must expose 6 weight tensors; received ${tensors.length}.`);
  }
  const weights: DenseRankerWeights = {
    revision,
    featureSchema: AUTO_CREATE_FEATURE_SCHEMA_VERSION,
    inputSize: FEATURE_COUNT,
    dense1Kernel: copyTensor(
      tensors[0],
      [FEATURE_COUNT, DENSE_RANKER_HIDDEN_1],
      'dense1Kernel'
    ),
    dense1Bias: copyTensor(tensors[1], [DENSE_RANKER_HIDDEN_1], 'dense1Bias'),
    dense2Kernel: copyTensor(
      tensors[2],
      [DENSE_RANKER_HIDDEN_1, DENSE_RANKER_HIDDEN_2],
      'dense2Kernel'
    ),
    dense2Bias: copyTensor(tensors[3], [DENSE_RANKER_HIDDEN_2], 'dense2Bias'),
    outputKernel: copyTensor(
      tensors[4],
      [DENSE_RANKER_HIDDEN_2, DENSE_RANKER_OUTPUTS],
      'outputKernel'
    ),
    outputBias: copyTensor(tensors[5], [DENSE_RANKER_OUTPUTS], 'outputBias')
  };
  validateDenseRankerWeights(weights);
  return weights;
}
