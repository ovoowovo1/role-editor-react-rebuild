import { describe, expect, it } from 'vitest';
import {
  alphaIou,
  bboxCenterError,
  bboxSizeError,
  computeRenderMetrics,
  compositeScore,
  foregroundCropRgbL1,
  rgbaMseAlphaWeighted,
  stripPngDataUrlPrefix,
  type ImageDataLike
} from './renderMetrics';

function image(width: number, height: number, pixels: Array<[number, number, number, number]>): ImageDataLike {
  return {
    width,
    height,
    data: new Uint8ClampedArray(pixels.flat())
  };
}

describe('renderMetrics', () => {
  it('strips PNG data URL prefixes', () => {
    expect(stripPngDataUrlPrefix('data:image/png;base64,abc123')).toBe('abc123');
    expect(stripPngDataUrlPrefix('abc123')).toBe('abc123');
  });

  it('returns zero-ish loss for identical images', () => {
    const a = image(2, 2, [
      [255, 0, 0, 255],
      [0, 255, 0, 128],
      [0, 0, 0, 0],
      [0, 0, 255, 255]
    ]);
    const metrics = computeRenderMetrics(a, a, [
      'full_role_rgba_mse_alpha_weighted',
      'full_role_alpha_iou',
      'full_role_alpha_mae',
      'foreground_crop_rgb_l1',
      'bbox_center_error',
      'bbox_size_error'
    ]);

    expect(metrics.full_role_rgba_mse_alpha_weighted).toBe(0);
    expect(metrics.full_role_alpha_iou).toBe(1);
    expect(metrics.full_role_alpha_mae).toBe(0);
    expect(metrics.foreground_crop_rgb_l1).toBe(0);
    expect(metrics.bbox_center_error).toBe(0);
    expect(metrics.bbox_size_error).toBe(0);
    expect(compositeScore(metrics, 2, 2)).toBe(0);
  });

  it('computes alpha IoU, RGB foreground L1, and RGBA MSE', () => {
    const target = image(2, 2, [
      [255, 0, 0, 255],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 255, 0, 255]
    ]);
    const candidate = image(2, 2, [
      [0, 0, 255, 255],
      [0, 0, 0, 0],
      [255, 255, 0, 255],
      [0, 255, 0, 255]
    ]);

    expect(alphaIou(target, candidate)).toBeCloseTo(2 / 3, 5);
    expect(foregroundCropRgbL1(target, candidate)).toBeGreaterThan(0);
    expect(rgbaMseAlphaWeighted(target, candidate)).toBeGreaterThan(0);
  });

  it('computes bbox center and size errors', () => {
    const target = image(4, 4, [
      [255, 0, 0, 255], [255, 0, 0, 255], [0, 0, 0, 0], [0, 0, 0, 0],
      [255, 0, 0, 255], [255, 0, 0, 255], [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]
    ]);
    const candidate = image(4, 4, [
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 255, 255], [0, 0, 255, 255], [0, 0, 255, 255],
      [0, 0, 0, 0], [0, 0, 255, 255], [0, 0, 255, 255], [0, 0, 255, 255]
    ]);

    expect(bboxCenterError(target, candidate)).toBeCloseTo(Math.hypot(1.5, 2), 5);
    expect(bboxSizeError(target, candidate)).toBeCloseTo((1 / 3 + 0) / 2, 5);
  });

  it('expands fake_part_score into individual fake part metrics', () => {
    const target = image(1, 1, [[0, 0, 0, 0]]);
    const metrics = computeRenderMetrics(target, target, ['fake_part_score'], {
      head: 0.1,
      hand: 0.2,
      foot: 0.3,
      cape: 0.4,
      deco: 0.4
    });

    expect(metrics.fake_head_score).toBeGreaterThan(metrics.fake_cape_score);
    expect(metrics.fake_part_score).toBeGreaterThan(0);
  });
});
