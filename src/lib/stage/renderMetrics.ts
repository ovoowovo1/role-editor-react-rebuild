export type RenderMetricName =
  | 'full_role_rgba_mse_alpha_weighted'
  | 'full_role_alpha_iou'
  | 'full_role_alpha_mae'
  | 'foreground_crop_rgb_l1'
  | 'bbox_center_error'
  | 'bbox_size_error'
  | 'fake_part_score';

export interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface AlphaBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PartContribution {
  head: number;
  hand: number;
  foot: number;
  cape: number;
  deco: number;
}

export type MetricMap = Record<string, number>;

const EMPTY_CONTRIBUTION: PartContribution = { head: 0, hand: 0, foot: 0, cape: 0, deco: 0 };

export function stripPngDataUrlPrefix(value: string): string {
  return value.replace(/^data:image\/png;base64,/i, '');
}

export function scanAlphaCoverage({ width, height, data }: ImageDataLike): {
  alphaPixels: number;
  nonTransparentBounds: AlphaBounds | null;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = -1;
  let maxX = -1;
  let maxY = -1;
  let alphaPixels = 0;

  for (let y = 0; y < height; y += 1) {
    let offset = y * width * 4 + 3;
    let first = -1;
    let last = -1;
    for (let x = 0; x < width; x += 1, offset += 4) {
      if (data[offset] <= 0) continue;
      if (first < 0) first = x;
      last = x;
      alphaPixels += 1;
    }
    if (last < 0) continue;
    if (first < minX) minX = first;
    if (last > maxX) maxX = last;
    if (minY < 0) minY = y;
    maxY = y;
  }

  return {
    alphaPixels,
    nonTransparentBounds: alphaPixels ? { minX, minY, maxX, maxY } : null
  };
}

export function alphaBounds(image: ImageDataLike): AlphaBounds | null {
  return scanAlphaCoverage(image).nonTransparentBounds;
}

function assertSameSize(a: ImageDataLike, b: ImageDataLike): void {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Image sizes differ: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function boundsUnion(a: AlphaBounds | null, b: AlphaBounds | null): AlphaBounds | null {
  if (!a) return b;
  if (!b) return a;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  };
}

export function rgbaMseAlphaWeighted(target: ImageDataLike, candidate: ImageDataLike): number {
  assertSameSize(target, candidate);
  const targetBytes = target.data;
  const candidateBytes = candidate.data;
  let weightedError = 0;
  let weightTotal = 0;

  for (let index = 0; index < targetBytes.length; index += 4) {
    const targetAlpha = targetBytes[index + 3];
    const candidateAlpha = candidateBytes[index + 3];
    const weight = Math.max(targetAlpha / 255, candidateAlpha / 255, 0.05);
    const dr = targetBytes[index] - candidateBytes[index];
    const dg = targetBytes[index + 1] - candidateBytes[index + 1];
    const db = targetBytes[index + 2] - candidateBytes[index + 2];
    const da = targetAlpha - candidateAlpha;
    weightedError += (((dr * dr + dg * dg + db * db) / 3) + da * da) * weight;
    weightTotal += weight;
  }

  return weightTotal ? weightedError / weightTotal / (255 * 255) : 0;
}

export function alphaIou(target: ImageDataLike, candidate: ImageDataLike): number {
  assertSameSize(target, candidate);
  const targetBytes = target.data;
  const candidateBytes = candidate.data;
  let intersection = 0;
  let union = 0;
  for (let index = 3; index < targetBytes.length; index += 4) {
    const a = targetBytes[index] > 0;
    const b = candidateBytes[index] > 0;
    if (a && b) intersection += 1;
    if (a || b) union += 1;
  }
  return union ? intersection / union : 1;
}

export function alphaMae(target: ImageDataLike, candidate: ImageDataLike): number {
  assertSameSize(target, candidate);
  const targetBytes = target.data;
  const candidateBytes = candidate.data;
  let error = 0;
  const pixels = target.width * target.height;
  for (let index = 3; index < targetBytes.length; index += 4) {
    error += Math.abs(targetBytes[index] - candidateBytes[index]);
  }
  return pixels ? error / pixels / 255 : 0;
}

const RGBA_MSE = 'full_role_rgba_mse_alpha_weighted';
const ALPHA_IOU = 'full_role_alpha_iou';
const ALPHA_MAE = 'full_role_alpha_mae';

/** One pass if all three are requested; accumulation order for each is unchanged. */
function comparePixels(target: ImageDataLike, candidate: ImageDataLike): Record<
  typeof RGBA_MSE | typeof ALPHA_IOU | typeof ALPHA_MAE, number
> {
  assertSameSize(target, candidate);
  const targetBytes = target.data;
  const candidateBytes = candidate.data;
  let weightedError = 0;
  let weightTotal = 0;
  let intersection = 0;
  let union = 0;
  let alphaError = 0;
  for (let index = 0; index < targetBytes.length; index += 4) {
    const a = targetBytes[index + 3];
    const b = candidateBytes[index + 3];
    const da = a - b;
    const weight = Math.max(a / 255, b / 255, 0.05);
    const dr = targetBytes[index] - candidateBytes[index];
    const dg = targetBytes[index + 1] - candidateBytes[index + 1];
    const db = targetBytes[index + 2] - candidateBytes[index + 2];
    weightedError += (((dr * dr + dg * dg + db * db) / 3) + da * da) * weight;
    weightTotal += weight;
    if (a > 0 && b > 0) intersection += 1;
    if (a > 0 || b > 0) union += 1;
    alphaError += Math.abs(da);
  }
  const pixels = target.width * target.height;
  return {
    [RGBA_MSE]: weightTotal ? weightedError / weightTotal / (255 * 255) : 0,
    [ALPHA_IOU]: union ? intersection / union : 1,
    [ALPHA_MAE]: pixels ? alphaError / pixels / 255 : 0
  };
}

export function foregroundCropRgbL1(target: ImageDataLike, candidate: ImageDataLike): number {
  assertSameSize(target, candidate);
  return foregroundRgbInBounds(target, candidate, boundsUnion(alphaBounds(target), alphaBounds(candidate)));
}

function foregroundRgbInBounds(target: ImageDataLike, candidate: ImageDataLike, bounds: AlphaBounds | null): number {
  if (!bounds) return 0;
  const targetBytes = target.data;
  const candidateBytes = candidate.data;
  const width = target.width;
  let error = 0;
  let channels = 0;

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const index = (y * width + x) * 4;
      if (targetBytes[index + 3] <= 0 && candidateBytes[index + 3] <= 0) continue;
      error += Math.abs(targetBytes[index] - candidateBytes[index]);
      error += Math.abs(targetBytes[index + 1] - candidateBytes[index + 1]);
      error += Math.abs(targetBytes[index + 2] - candidateBytes[index + 2]);
      channels += 3;
    }
  }

  return channels ? error / channels / 255 : 0;
}

export function bboxCenterError(target: ImageDataLike, candidate: ImageDataLike): number {
  return bboxCenterFromBounds(alphaBounds(target), alphaBounds(candidate), target);
}

function bboxCenterFromBounds(a: AlphaBounds | null, b: AlphaBounds | null, size: { width: number; height: number }): number {
  if (!a && !b) return 0;
  if (!a || !b) return Math.hypot(size.width, size.height);
  const ax = (a.minX + a.maxX) / 2;
  const ay = (a.minY + a.maxY) / 2;
  const bx = (b.minX + b.maxX) / 2;
  const by = (b.minY + b.maxY) / 2;
  return Math.hypot(ax - bx, ay - by);
}

export function bboxSizeError(target: ImageDataLike, candidate: ImageDataLike): number {
  return bboxSizeFromBounds(alphaBounds(target), alphaBounds(candidate));
}

function bboxSizeFromBounds(a: AlphaBounds | null, b: AlphaBounds | null): number {
  if (!a && !b) return 0;
  if (!a || !b) return 1;
  const aw = a.maxX - a.minX + 1;
  const ah = a.maxY - a.minY + 1;
  const bw = b.maxX - b.minX + 1;
  const bh = b.maxY - b.minY + 1;
  return (Math.abs(aw - bw) / Math.max(aw, bw, 1) + Math.abs(ah - bh) / Math.max(ah, bh, 1)) / 2;
}

export function imageDeltaMagnitude(a: ImageDataLike, b: ImageDataLike): number {
  assertSameSize(a, b);
  const aBytes = a.data;
  const bBytes = b.data;
  let delta = 0;
  for (let index = 0; index < aBytes.length; index += 4) {
    const aAlpha = aBytes[index + 3];
    const bAlpha = bBytes[index + 3];
    const alphaWeight = Math.max(aAlpha, bAlpha) / 255;
    delta += Math.abs(aBytes[index] - bBytes[index]) * alphaWeight;
    delta += Math.abs(aBytes[index + 1] - bBytes[index + 1]) * alphaWeight;
    delta += Math.abs(aBytes[index + 2] - bBytes[index + 2]) * alphaWeight;
    delta += Math.abs(aAlpha - bAlpha);
  }
  return delta / (a.width * a.height * 4 * 255);
}

export function contributionFromAblations(ablations: Partial<Record<keyof PartContribution, number>>): PartContribution {
  return { ...EMPTY_CONTRIBUTION, ...ablations };
}

export function fakePartMetrics(contribution: PartContribution = EMPTY_CONTRIBUTION): MetricMap {
  const deco = Math.max(0, contribution.deco);
  const fakeFor = (part: keyof Omit<PartContribution, 'deco'>) => {
    const partContribution = Math.max(0, contribution[part]);
    return clamp01(deco / (deco + partContribution + 1e-9));
  };
  const metrics = {
    fake_head_score: fakeFor('head'),
    fake_hand_score: fakeFor('hand'),
    fake_foot_score: fakeFor('foot'),
    fake_cape_score: fakeFor('cape')
  };
  return {
    ...metrics,
    fake_part_score: (metrics.fake_head_score + metrics.fake_hand_score + metrics.fake_foot_score + metrics.fake_cape_score) / 4
  };
}

export function computeRenderMetrics(
  target: ImageDataLike,
  candidate: ImageDataLike,
  requested: readonly RenderMetricName[],
  contribution?: PartContribution
): MetricMap {
  const metrics: MetricMap = {};
  // Keep the pair local to this call: arrays may be reused and mutated by
  // callers between requests, and alpha-only metrics don't need the bounds.
  let bounds: [AlphaBounds | null, AlphaBounds | null] | undefined;
  const getBounds = () => bounds ??= [alphaBounds(target), alphaBounds(candidate)];
  const wantsPixelSuite = requested.length >= 3 &&
    requested.includes(RGBA_MSE) && requested.includes(ALPHA_IOU) && requested.includes(ALPHA_MAE);
  let pixelSuite: ReturnType<typeof comparePixels> | undefined;
  for (const metric of requested) {
    if (metric === RGBA_MSE || metric === ALPHA_IOU || metric === ALPHA_MAE) {
      if (wantsPixelSuite) metrics[metric] = (pixelSuite ??= comparePixels(target, candidate))[metric];
      else if (metric === RGBA_MSE) metrics[metric] = rgbaMseAlphaWeighted(target, candidate);
      else if (metric === ALPHA_IOU) metrics[metric] = alphaIou(target, candidate);
      else metrics[metric] = alphaMae(target, candidate);
    }
    if (metric === 'foreground_crop_rgb_l1') {
      assertSameSize(target, candidate);
      metrics[metric] = foregroundRgbInBounds(target, candidate, boundsUnion(...getBounds()));
    }
    if (metric === 'bbox_center_error') metrics[metric] = bboxCenterFromBounds(...getBounds(), target);
    if (metric === 'bbox_size_error') metrics[metric] = bboxSizeFromBounds(...getBounds());
    if (metric === 'fake_part_score') Object.assign(metrics, fakePartMetrics(contribution));
  }
  return metrics;
}

export function compositeScore(metrics: MetricMap, width: number, height: number): number {
  const diagonal = Math.max(1, Math.hypot(width, height));
  const losses = [
    metrics.full_role_rgba_mse_alpha_weighted ?? 0,
    metrics.full_role_alpha_iou === undefined ? 0 : 1 - metrics.full_role_alpha_iou,
    metrics.full_role_alpha_mae ?? 0,
    metrics.foreground_crop_rgb_l1 ?? 0,
    metrics.bbox_center_error === undefined ? 0 : metrics.bbox_center_error / diagonal,
    metrics.bbox_size_error ?? 0,
    metrics.fake_part_score ?? 0
  ];
  return losses.reduce((sum, value) => sum + clamp01(value), 0) / losses.length;
}
