import { FEATURE_COUNT } from './featureSchema';
import type {
  CandidateLearningMode,
  LearningModeCounts,
  LearningOutcomeCounts,
  PersistedCandidateLearningExample
} from './types';

export const PORTABLE_DATASET_VERSION = 1;
export const PORTABLE_DATASET_RECORD_BYTES = 288;
export const PORTABLE_DATASET_SHARD_ROWS = 25_000;

const MARGIN_OFFSET = FEATURE_COUNT * 4;
const PREDICTED_MARGIN_OFFSET = MARGIN_OFFSET + 4;
const VALID_PROBABILITY_OFFSET = PREDICTED_MARGIN_OFFSET + 4;
const RANKING_SCORE_OFFSET = VALID_PROBABILITY_OFFSET + 4;
const INCLUSION_OFFSET = RANKING_SCORE_OFFSET + 4;
const SAMPLE_HASH_OFFSET = INCLUSION_OFFSET + 4;
const TARGET_INDEX_OFFSET = SAMPLE_HASH_OFFSET + 4;
const MODE_OFFSET = TARGET_INDEX_OFFSET + 2;
const OUTCOME_OFFSET = MODE_OFFSET + 1;
const PROVENANCE_OFFSET = OUTCOME_OFFSET + 1;

const PROVENANCE_CODES = {
  'top-k': 0,
  exploration: 1,
  widening: 2,
  legacy: 3,
  audit: 4
} as const;

export interface PortableDatasetShard {
  file: string;
  rows: number;
  bytes: number;
  sha256: string;
}

export interface PortableDatasetManifest {
  format: 'auto-create-portable-dataset';
  version: typeof PORTABLE_DATASET_VERSION;
  complete: boolean;
  camp: string;
  featureSchema: string;
  rankingPolicy: string;
  featureCount: number;
  recordBytes: number;
  exportedAt: number;
  sourceExampleCount: number;
  sourceEstimatedBytes: number;
  exportedTrainableCount: number;
  skippedCensoredCount: number;
  outcomeCounts: LearningOutcomeCounts;
  modeCounts: LearningModeCounts;
  trainableModeCounts: LearningModeCounts;
  targetSignatures: string[];
  shards: PortableDatasetShard[];
}

export interface DecodedPortableDatasetRow {
  features: Float32Array;
  validity: 0 | 1;
  margin: number;
  marginMask: 0 | 1;
  mode: CandidateLearningMode;
  outcome: 'exact' | 'invalid';
  targetIndex: number;
  sampleHash: number;
  provenanceCode: number;
  inclusionProbability: number;
  predictedMargin: number;
  validProbability: number;
  rankingScore: number;
}

export function stablePortableHash(value: string, seed = 0x811c9dc5): number {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function encodePortableDatasetRow(
  target: Uint8Array,
  row: number,
  example: PersistedCandidateLearningExample,
  targetIndex: number
): void {
  if (target.byteLength < (row + 1) * PORTABLE_DATASET_RECORD_BYTES) {
    throw new RangeError('Portable dataset target buffer is too small.');
  }
  if (example.features.length !== FEATURE_COUNT) {
    throw new RangeError(`Expected ${FEATURE_COUNT} features; received ${example.features.length}.`);
  }
  if (example.outcome.kind === 'censored') {
    throw new Error('Censored examples cannot be encoded as trainable rows.');
  }
  const base = row * PORTABLE_DATASET_RECORD_BYTES;
  const view = new DataView(target.buffer, target.byteOffset + base, PORTABLE_DATASET_RECORD_BYTES);
  for (let index = 0; index < FEATURE_COUNT; index += 1) {
    view.setFloat32(index * 4, example.features[index] ?? 0, true);
  }
  view.setFloat32(
    MARGIN_OFFSET,
    example.outcome.kind === 'exact' ? example.outcome.decisionMargin : 0,
    true
  );
  view.setFloat32(
    PREDICTED_MARGIN_OFFSET,
    example.prediction?.predictedDecisionMargin ?? Number.NaN,
    true
  );
  view.setFloat32(
    VALID_PROBABILITY_OFFSET,
    example.prediction?.validProbability ?? Number.NaN,
    true
  );
  view.setFloat32(
    RANKING_SCORE_OFFSET,
    example.prediction?.rankingScore ?? Number.NaN,
    true
  );
  view.setFloat32(INCLUSION_OFFSET, example.provenance.inclusionProbability, true);
  view.setUint32(SAMPLE_HASH_OFFSET, stablePortableHash(example.id), true);
  view.setUint16(TARGET_INDEX_OFFSET, targetIndex, true);
  view.setUint8(MODE_OFFSET, example.mode === 'add' ? 0 : 1);
  view.setUint8(OUTCOME_OFFSET, example.outcome.kind === 'exact' ? 0 : 1);
  view.setUint8(PROVENANCE_OFFSET, PROVENANCE_CODES[example.provenance.kind]);
}

export function decodePortableDatasetRow(
  source: Uint8Array,
  row: number
): DecodedPortableDatasetRow {
  if (source.byteLength < (row + 1) * PORTABLE_DATASET_RECORD_BYTES) {
    throw new RangeError('Portable dataset row is outside the shard buffer.');
  }
  const base = row * PORTABLE_DATASET_RECORD_BYTES;
  const view = new DataView(source.buffer, source.byteOffset + base, PORTABLE_DATASET_RECORD_BYTES);
  const features = new Float32Array(FEATURE_COUNT);
  for (let index = 0; index < FEATURE_COUNT; index += 1) {
    features[index] = view.getFloat32(index * 4, true);
  }
  const exact = view.getUint8(OUTCOME_OFFSET) === 0;
  return {
    features,
    validity: exact ? 1 : 0,
    margin: view.getFloat32(MARGIN_OFFSET, true),
    marginMask: exact ? 1 : 0,
    mode: view.getUint8(MODE_OFFSET) === 0 ? 'add' : 'replace',
    outcome: exact ? 'exact' : 'invalid',
    targetIndex: view.getUint16(TARGET_INDEX_OFFSET, true),
    sampleHash: view.getUint32(SAMPLE_HASH_OFFSET, true),
    provenanceCode: view.getUint8(PROVENANCE_OFFSET),
    inclusionProbability: view.getFloat32(INCLUSION_OFFSET, true),
    predictedMargin: view.getFloat32(PREDICTED_MARGIN_OFFSET, true),
    validProbability: view.getFloat32(VALID_PROBABILITY_OFFSET, true),
    rankingScore: view.getFloat32(RANKING_SCORE_OFFSET, true)
  };
}

export async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
