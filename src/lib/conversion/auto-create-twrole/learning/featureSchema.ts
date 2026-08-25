import { AUTO_CREATE_FEATURE_SCHEMA_VERSION } from '../contracts';

export { AUTO_CREATE_FEATURE_SCHEMA_VERSION as FEATURE_SCHEMA_VERSION };

export const FEATURE_NAMES = [
  'mode_replace',
  'source_mean_r',
  'source_mean_g',
  'source_mean_b',
  'source_std_r',
  'source_std_g',
  'source_std_b',
  'source_alpha_ratio',
  'source_alpha_sum',
  'source_width',
  'source_height',
  'source_aspect',
  'source_center_x',
  'source_center_y',
  'source_asset_hash',
  'position_x',
  'position_y',
  'scale_x',
  'scale_y',
  'flip_x',
  'flip_y',
  'rotation_sin',
  'rotation_cos',
  'bbox_width',
  'bbox_height',
  'bbox_area',
  'bbox_outside',
  'focus_r',
  'focus_g',
  'focus_b',
  'target_mean_r',
  'target_mean_g',
  'target_mean_b',
  'target_std_r',
  'target_std_g',
  'target_std_b',
  'target_complexity',
  'target_alpha_ratio',
  'target_mask_coverage',
  'target_placement_coverage',
  'canvas_mean_r',
  'canvas_mean_g',
  'canvas_mean_b',
  'residual_mean_r',
  'residual_mean_g',
  'residual_mean_b',
  'residual_std_r',
  'residual_std_g',
  'residual_std_b',
  'bbox_error_upper_bound',
  'overlap_tile_count',
  'current_mse',
  'progress',
  'experience_source',
  'experience_color',
  'decoration_count',
  'replace_old_source_hash',
  'replace_stored_gain',
  'replace_bbox_iou',
  'replace_displacement',
  'replace_same_source',
  'replace_scale_delta_x',
  'replace_scale_delta_y',
  'replace_rotation_delta_sin'
] as const;

export type CandidateFeatureName = typeof FEATURE_NAMES[number];
export const FEATURE_COUNT = FEATURE_NAMES.length;

/**
 * Immutable metadata stored alongside examples and model revisions. A model
 * must only consume vectors with the exact same version and ordered names.
 */
export const FEATURE_SCHEMA = Object.freeze({
  version: AUTO_CREATE_FEATURE_SCHEMA_VERSION,
  names: FEATURE_NAMES,
  count: FEATURE_COUNT
});

type NumericVector = readonly number[] | Float32Array | Float64Array;
type BBox = readonly [left: number, top: number, right: number, bottom: number];

export interface CandidateFeatureContext {
  mode?: 'add' | 'replace';
  source?: {
    meanRgb?: NumericVector;
    stdRgb?: NumericVector;
    alphaRatio?: number;
    alphaSum?: number;
    width?: number;
    height?: number;
    centerX?: number;
    centerY?: number;
    /** A pre-normalized hash in [-1, 1]. `assetId` is used when omitted. */
    assetHash?: number;
    assetId?: string;
  };
  placement?: {
    centerX?: number;
    centerY?: number;
    targetWidth?: number;
    targetHeight?: number;
    scaleX?: number;
    scaleY?: number;
    flipX?: boolean;
    flipY?: boolean;
    rotationDeg?: number;
    bbox?: BBox;
    outsideRatio?: number;
  };
  target?: {
    focusRgb?: NumericVector;
    localMeanRgb?: NumericVector;
    localStdRgb?: NumericVector;
    complexity?: number;
    alphaRatio?: number;
    maskCoverage?: number;
    placementCoverage?: number;
  };
  state?: {
    canvasMeanRgb?: NumericVector;
    residualMeanRgb?: NumericVector;
    residualStdRgb?: NumericVector;
    /** MSE-like upper bound in the normal 8-bit RGB range (0..65025). */
    bboxErrorUpperBound?: number;
    overlapTileCount?: number;
    mse?: number;
    progress?: number;
    experienceSource?: number;
    experienceColor?: number;
    decorationCount?: number;
    maxDecorations?: number;
  };
  replace?: {
    oldSourceAssetId?: string;
    /** A pre-normalized hash in [-1, 1]. */
    oldSourceHash?: number;
    storedGainMse?: number;
    bboxIou?: number;
    displacement?: number;
    sameSource?: boolean;
    scaleDeltaX?: number;
    scaleDeltaY?: number;
    rotationDeltaDeg?: number;
  };
}

const BYTE_MAX = 255;
const RGB_MSE_MAX = BYTE_MAX * BYTE_MAX;

function finite(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function unit(value: number | undefined, scale = 1): number {
  return clamp(finite(value) / Math.max(Number.EPSILON, scale), 0, 1);
}

function signedUnit(value: number | undefined, scale = 1): number {
  return clamp(finite(value) / Math.max(Number.EPSILON, scale), -1, 1);
}

function vectorValue(vector: NumericVector | undefined, index: number): number {
  return finite(vector?.[index]);
}

function rgb(vector: NumericVector | undefined, index: number): number {
  return unit(vectorValue(vector, index), BYTE_MAX);
}

function signedRgb(vector: NumericVector | undefined, index: number): number {
  return signedUnit(vectorValue(vector, index), BYTE_MAX);
}

function positiveScale(value: number | undefined): number {
  const magnitude = Math.abs(finite(value));
  return clamp(Math.log2(1 + magnitude) / 4, 0, 1);
}

function signedLog(value: number | undefined, reference: number): number {
  const safe = finite(value);
  const magnitude = Math.log1p(Math.abs(safe)) / Math.log1p(reference);
  return clamp(Math.sign(safe) * magnitude, -1, 1);
}

function normalizedAssetHash(assetId: string | undefined, supplied: number | undefined): number {
  if (typeof supplied === 'number' && Number.isFinite(supplied)) {
    return clamp(supplied, -1, 1);
  }
  if (!assetId) return 0;
  let hash = 0x811c9dc5;
  for (let index = 0; index < assetId.length; index += 1) {
    hash ^= assetId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) / 0xffffffff) * 2 - 1;
}

function normalizedPosition(value: number | undefined, size: number): number {
  if (size <= 0) return 0;
  return clamp((finite(value) / size) * 2 - 1, -1, 1);
}

function bboxMetrics(
  bbox: BBox | undefined,
  targetWidth: number,
  targetHeight: number,
  suppliedOutsideRatio: number | undefined
): readonly [width: number, height: number, area: number, outside: number] {
  if (!bbox || targetWidth <= 0 || targetHeight <= 0) {
    return [0, 0, 0, unit(suppliedOutsideRatio)];
  }
  const left = finite(bbox[0]);
  const top = finite(bbox[1]);
  const right = finite(bbox[2]);
  const bottom = finite(bbox[3]);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const area = width * height;
  let outside = unit(suppliedOutsideRatio);
  if (suppliedOutsideRatio === undefined && area > 0) {
    const insideWidth = Math.max(0, Math.min(targetWidth, right) - Math.max(0, left));
    const insideHeight = Math.max(0, Math.min(targetHeight, bottom) - Math.max(0, top));
    outside = clamp(1 - (insideWidth * insideHeight) / area, 0, 1);
  }
  return [
    unit(width, targetWidth),
    unit(height, targetHeight),
    unit(area, targetWidth * targetHeight),
    outside
  ];
}

/**
 * Encodes one cheap candidate descriptor without rasterizing it. Every output
 * is finite and clamped to [-1, 1], so malformed persisted examples cannot
 * inject NaN/Infinity into either inference runtime.
 */
export function encodeCandidateFeatures(
  context: CandidateFeatureContext,
  output: Float32Array = new Float32Array(FEATURE_COUNT),
  offset = 0
): Float32Array {
  if (!Number.isInteger(offset) || offset < 0 || output.length < offset + FEATURE_COUNT) {
    throw new RangeError(`Feature output requires ${FEATURE_COUNT} values at offset ${offset}.`);
  }

  const source = context.source;
  const placement = context.placement;
  const target = context.target;
  const state = context.state;
  const replace = context.replace;
  const sourceWidth = Math.max(0, finite(source?.width));
  const sourceHeight = Math.max(0, finite(source?.height));
  const targetWidth = Math.max(0, finite(placement?.targetWidth));
  const targetHeight = Math.max(0, finite(placement?.targetHeight));
  const targetDiagonal = Math.hypot(targetWidth, targetHeight);
  const scaleX = finite(placement?.scaleX);
  const scaleY = finite(placement?.scaleY);
  const rotationRadians = finite(placement?.rotationDeg) * Math.PI / 180;
  const bbox = bboxMetrics(placement?.bbox, targetWidth, targetHeight, placement?.outsideRatio);
  const sourcePixelCount = Math.max(1, sourceWidth * sourceHeight);
  const maxDecorations = Math.max(1, finite(state?.maxDecorations));
  let index = offset;

  output[index++] = context.mode === 'replace' ? 1 : 0;
  output[index++] = rgb(source?.meanRgb, 0);
  output[index++] = rgb(source?.meanRgb, 1);
  output[index++] = rgb(source?.meanRgb, 2);
  output[index++] = rgb(source?.stdRgb, 0);
  output[index++] = rgb(source?.stdRgb, 1);
  output[index++] = rgb(source?.stdRgb, 2);
  output[index++] = unit(source?.alphaRatio);
  output[index++] = unit(source?.alphaSum, sourcePixelCount * BYTE_MAX);
  output[index++] = unit(sourceWidth, Math.max(1, targetWidth));
  output[index++] = unit(sourceHeight, Math.max(1, targetHeight));
  output[index++] = sourceWidth > 0 && sourceHeight > 0
    ? clamp(Math.log(sourceWidth / sourceHeight) / 4, -1, 1)
    : 0;
  output[index++] = signedUnit(source?.centerX, Math.max(1, sourceWidth / 2));
  output[index++] = signedUnit(source?.centerY, Math.max(1, sourceHeight / 2));
  output[index++] = normalizedAssetHash(source?.assetId, source?.assetHash);
  output[index++] = normalizedPosition(placement?.centerX, targetWidth);
  output[index++] = normalizedPosition(placement?.centerY, targetHeight);
  output[index++] = positiveScale(scaleX);
  output[index++] = positiveScale(scaleY);
  output[index++] = placement?.flipX ?? scaleX < 0 ? 1 : 0;
  output[index++] = placement?.flipY ?? scaleY < 0 ? 1 : 0;
  output[index++] = Math.sin(rotationRadians);
  output[index++] = Math.cos(rotationRadians);
  output[index++] = bbox[0];
  output[index++] = bbox[1];
  output[index++] = bbox[2];
  output[index++] = bbox[3];
  output[index++] = rgb(target?.focusRgb, 0);
  output[index++] = rgb(target?.focusRgb, 1);
  output[index++] = rgb(target?.focusRgb, 2);
  output[index++] = rgb(target?.localMeanRgb, 0);
  output[index++] = rgb(target?.localMeanRgb, 1);
  output[index++] = rgb(target?.localMeanRgb, 2);
  output[index++] = rgb(target?.localStdRgb, 0);
  output[index++] = rgb(target?.localStdRgb, 1);
  output[index++] = rgb(target?.localStdRgb, 2);
  output[index++] = unit(target?.complexity, BYTE_MAX * Math.sqrt(3));
  output[index++] = unit(target?.alphaRatio);
  output[index++] = unit(target?.maskCoverage);
  output[index++] = unit(target?.placementCoverage);
  output[index++] = rgb(state?.canvasMeanRgb, 0);
  output[index++] = rgb(state?.canvasMeanRgb, 1);
  output[index++] = rgb(state?.canvasMeanRgb, 2);
  output[index++] = signedRgb(state?.residualMeanRgb, 0);
  output[index++] = signedRgb(state?.residualMeanRgb, 1);
  output[index++] = signedRgb(state?.residualMeanRgb, 2);
  output[index++] = rgb(state?.residualStdRgb, 0);
  output[index++] = rgb(state?.residualStdRgb, 1);
  output[index++] = rgb(state?.residualStdRgb, 2);
  output[index++] = unit(state?.bboxErrorUpperBound, RGB_MSE_MAX);
  output[index++] = unit(Math.log1p(Math.max(0, finite(state?.overlapTileCount))), Math.log(65));
  output[index++] = unit(state?.mse, RGB_MSE_MAX);
  output[index++] = unit(state?.progress);
  output[index++] = clamp(Math.tanh(finite(state?.experienceSource)), -1, 1);
  output[index++] = clamp(Math.tanh(finite(state?.experienceColor)), -1, 1);
  output[index++] = unit(state?.decorationCount, maxDecorations);
  output[index++] = normalizedAssetHash(replace?.oldSourceAssetId, replace?.oldSourceHash);
  output[index++] = signedLog(replace?.storedGainMse, RGB_MSE_MAX);
  output[index++] = unit(replace?.bboxIou);
  output[index++] = unit(replace?.displacement, Math.max(1, targetDiagonal));
  output[index++] = replace?.sameSource ? 1 : 0;
  output[index++] = clamp(Math.tanh(finite(replace?.scaleDeltaX)), -1, 1);
  output[index++] = clamp(Math.tanh(finite(replace?.scaleDeltaY)), -1, 1);
  output[index++] = Math.sin(finite(replace?.rotationDeltaDeg) * Math.PI / 180);

  return output;
}

/** Encodes a batch into one contiguous row-major matrix. */
export function encodeCandidateFeatureBatch(
  contexts: readonly CandidateFeatureContext[],
  output: Float32Array = new Float32Array(contexts.length * FEATURE_COUNT)
): Float32Array {
  if (output.length < contexts.length * FEATURE_COUNT) {
    throw new RangeError(`Feature batch output requires ${contexts.length * FEATURE_COUNT} values.`);
  }
  for (let row = 0; row < contexts.length; row += 1) {
    encodeCandidateFeatures(contexts[row], output, row * FEATURE_COUNT);
  }
  return output;
}
