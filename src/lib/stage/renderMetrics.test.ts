import { describe, expect, it } from 'vitest';
import {
  alphaBounds,
  alphaIou,
  alphaMae,
  bboxCenterError,
  bboxSizeError,
  computeRenderMetrics,
  compositeScore,
  foregroundCropRgbL1,
  imageDeltaMagnitude,
  rgbaMseAlphaWeighted,
  scanAlphaCoverage,
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

it('reuses one alpha scan per image for every requested bounds-derived metric', () => {
  const transparent = new Uint8ClampedArray(4);
  let targetReads = 0;
  let candidateReads = 0;
  const target = { width: 1, height: 1, get data() { targetReads++; return transparent; } };
  const candidate = { width: 1, height: 1, get data() { candidateReads++; return transparent; } };
  expect(computeRenderMetrics(target, candidate, ['bbox_size_error', 'foreground_crop_rgb_l1', 'bbox_center_error', 'bbox_size_error'])).toEqual({
    bbox_size_error: 0,
    foreground_crop_rgb_l1: 0,
    bbox_center_error: 0
  });
  expect([targetReads, candidateReads]).toEqual([1, 1]);
});

it('matches independent metrics, even when input buffers are reused between calls', () => {
  const target = image(3, 1, [[3, 0, 255, 255], [0, 255, 0, 0], [0, 0, 0, 12]]);
  const candidate = image(3, 1, [[155, 0, 0, 0], [0, 255, 12, 128], [0, 0, 0, 0]]);
  for (const alpha of [0, 127, 255]) {
    candidate.data[3] = alpha;
    expect(computeRenderMetrics(target, candidate, ['foreground_crop_rgb_l1', 'bbox_center_error', 'bbox_size_error'])).toEqual({
      foreground_crop_rgb_l1: foregroundCropRgbL1(target, candidate),
      bbox_center_error: bboxCenterError(target, candidate),
      bbox_size_error: bboxSizeError(target, candidate)
    });
  }
  expect(() => computeRenderMetrics(target, image(1, 0, []), ['foreground_crop_rgb_l1'])).toThrow('Image sizes differ');
});

it('computes all three pixel metrics in one pass while preserving individual results and requested order', () => {
  const keys = ['full_role_alpha_mae', 'full_role_rgba_mse_alpha_weighted', 'full_role_alpha_iou'] as const;
  let state = 17;
  const bytes = (size: number, opacity: 'clear' | 'mixed' | 'opaque') => Uint8ClampedArray.from(
    { length: size * 4 }, (_, index) => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      if (index % 4 === 3) {
        if (opacity === 'clear') return 0;
        if (opacity === 'opaque') return 255;
        if (state % 3 === 0) return 0;
      }
      return state >>> 24;
    }
  );
  for (const opacity of ['clear', 'mixed', 'opaque'] as const) {
    for (let width = 0; width < 37; width += 1) {
      const height = 17;
      const targetBytes = bytes(width * height, opacity);
      const candidateBytes = bytes(width * height, opacity);
      let targetReads = 0;
      let candidateReads = 0;
      const target = { width, height, get data() { targetReads++; return targetBytes; } };
      const candidate = { width, height, get data() { candidateReads++; return candidateBytes; } };
      const actual = computeRenderMetrics(target, candidate, [...keys, keys[0]]);
      expect([targetReads, candidateReads]).toEqual([1, 1]);
      expect(Object.keys(actual)).toEqual([...keys]);
      expect(actual).toEqual({
        [keys[0]]: alphaMae(target, candidate),
        [keys[1]]: rgbaMseAlphaWeighted(target, candidate),
        [keys[2]]: alphaIou(target, candidate)
      });
      expect(computeRenderMetrics(target, candidate, [keys[1]])).toEqual({ [keys[1]]: actual[keys[1]] });
    }
  }
  expect(() => computeRenderMetrics(image(1, 0, []), image(2, 0, []), keys)).toThrow('Image sizes differ: 1x0 vs 2x0');
});

it('uses each nonzero-alpha row’s extremities without changing count or crop boundaries', () => {
  let state = 54;
  const fill = (width: number, height: number, pattern: number) => ({
    width, height, data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, offset) => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return offset % 4 === 3 && (state >>> 24) % 4 >= pattern ? 0 : 1 + (state % 255);
    })
  });
  for (let width = 0; width <= 31; width += 1) for (let pattern = 0; pattern <= 4; pattern += 1) {
    const image = fill(width, 17, pattern);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] <= 0) continue;
      xs.push(x);
      ys.push(y);
    }
    const nonTransparentBounds = xs.length
      ? { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
      : null;
    expect(scanAlphaCoverage(image)).toEqual({ alphaPixels: xs.length, nonTransparentBounds });
    expect(alphaBounds(image)).toEqual(nonTransparentBounds);
  }
  const offsetPixels = image(5, 3, [
    [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
    [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 255], [0, 0, 0, 0],
    [0, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]
  ]);
  expect(scanAlphaCoverage(offsetPixels)).toEqual({
    alphaPixels: 3, nonTransparentBounds: { minX: 0, maxX: 3, minY: 1, maxY: 2 }
  });
});

it('reads each stable pixel buffer once per scan, including individual score requests', () => {
  const a = image(2, 2, [[17, 9, 255, 1], [8, 2, 23, 0], [5, 0, 1, 111], [64, 2, 73, 255]]);
  const b = image(2, 2, [[8, 22, 25, 255], [10, 239, 23, 0], [10, 11, 0, 0], [0, 11, 7, 33]]);
  for (const metric of [imageDeltaMagnitude, rgbaMseAlphaWeighted, alphaIou, alphaMae, foregroundCropRgbL1]) {
    let aReads = 0;
    let bReads = 0;
    const target = { ...a, get data() { aReads++; return a.data; } };
    const candidate = { ...b, get data() { bReads++; return b.data; } };
    expect(metric(target, candidate)).toBe(metric(a, b));
    const expected = metric === foregroundCropRgbL1 ? 2 : 1; // Bounds scan plus foreground comparison.
    expect([aReads, bReads]).toEqual([expected, expected]);
  }
});
