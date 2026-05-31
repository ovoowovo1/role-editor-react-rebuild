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

export function alphaBounds(image: ImageDataLike): AlphaBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let found = false;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      if (alpha <= 0) continue;
      found = true;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return found ? { minX, minY, maxX, maxY } : null;
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
  let weightedError = 0;
  let weightTotal = 0;

  for (let index = 0; index < target.data.length; index += 4) {
    const targetAlpha = target.data[index + 3] / 255;
    const candidateAlpha = candidate.data[index + 3] / 255;
    const weight = Math.max(targetAlpha, candidateAlpha, 0.05);
    const dr = target.data[index] - candidate.data[index];
    const dg = target.data[index + 1] - candidate.data[index + 1];
    const db = target.data[index + 2] - candidate.data[index + 2];
    const da = target.data[index + 3] - candidate.data[index + 3];
    weightedError += (((dr * dr + dg * dg + db * db) / 3) + da * da) * weight;
    weightTotal += weight;
  }

  return weightTotal ? weightedError / weightTotal / (255 * 255) : 0;
}

export function alphaIou(target: ImageDataLike, candidate: ImageDataLike): number {
  assertSameSize(target, candidate);
  let intersection = 0;
  let union = 0;
  for (let index = 3; index < target.data.length; index += 4) {
    const a = target.data[index] > 0;
    const b = candidate.data[index] > 0;
    if (a && b) intersection += 1;
    if (a || b) union += 1;
  }
  return union ? intersection / union : 1;
}

export function alphaMae(target: ImageDataLike, candidate: ImageDataLike): number {
  assertSameSize(target, candidate);
  let error = 0;
  const pixels = target.width * target.height;
  for (let index = 3; index < target.data.length; index += 4) {
    error += Math.abs(target.data[index] - candidate.data[index]);
  }
  return pixels ? error / pixels / 255 : 0;
}

export function foregroundCropRgbL1(target: ImageDataLike, candidate: ImageDataLike): number {
  assertSameSize(target, candidate);
  const bounds = boundsUnion(alphaBounds(target), alphaBounds(candidate));
  if (!bounds) return 0;
  let error = 0;
  let channels = 0;

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const index = (y * target.width + x) * 4;
      if (target.data[index + 3] <= 0 && candidate.data[index + 3] <= 0) continue;
      error += Math.abs(target.data[index] - candidate.data[index]);
      error += Math.abs(target.data[index + 1] - candidate.data[index + 1]);
      error += Math.abs(target.data[index + 2] - candidate.data[index + 2]);
      channels += 3;
    }
  }

  return channels ? error / channels / 255 : 0;
}

export function bboxCenterError(target: ImageDataLike, candidate: ImageDataLike): number {
  const a = alphaBounds(target);
  const b = alphaBounds(candidate);
  if (!a && !b) return 0;
  if (!a || !b) return Math.hypot(target.width, target.height);
  const ax = (a.minX + a.maxX) / 2;
  const ay = (a.minY + a.maxY) / 2;
  const bx = (b.minX + b.maxX) / 2;
  const by = (b.minY + b.maxY) / 2;
  return Math.hypot(ax - bx, ay - by);
}

export function bboxSizeError(target: ImageDataLike, candidate: ImageDataLike): number {
  const a = alphaBounds(target);
  const b = alphaBounds(candidate);
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
  let delta = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    const alphaWeight = Math.max(a.data[index + 3], b.data[index + 3]) / 255;
    delta += Math.abs(a.data[index] - b.data[index]) * alphaWeight;
    delta += Math.abs(a.data[index + 1] - b.data[index + 1]) * alphaWeight;
    delta += Math.abs(a.data[index + 2] - b.data[index + 2]) * alphaWeight;
    delta += Math.abs(a.data[index + 3] - b.data[index + 3]);
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
  for (const metric of requested) {
    if (metric === 'full_role_rgba_mse_alpha_weighted') metrics[metric] = rgbaMseAlphaWeighted(target, candidate);
    if (metric === 'full_role_alpha_iou') metrics[metric] = alphaIou(target, candidate);
    if (metric === 'full_role_alpha_mae') metrics[metric] = alphaMae(target, candidate);
    if (metric === 'foreground_crop_rgb_l1') metrics[metric] = foregroundCropRgbL1(target, candidate);
    if (metric === 'bbox_center_error') metrics[metric] = bboxCenterError(target, candidate);
    if (metric === 'bbox_size_error') metrics[metric] = bboxSizeError(target, candidate);
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
