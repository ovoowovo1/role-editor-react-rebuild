import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUTO_CREATE_TWROLE_SETTINGS } from './contracts';

const targetFixture = vi.hoisted(() => ({
  width: 2,
  height: 1,
  pixels: new Uint8ClampedArray(8)
}));

vi.mock('./platform', async (importOriginal) => {
  const original = await importOriginal<typeof import('./platform')>();
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: targetFixture.pixels }))
  };
  return {
    ...original,
    createCanvas: vi.fn(() => ({ width: targetFixture.width, height: targetFixture.height })),
    get2d: vi.fn(() => context),
    imagePixelWidth: vi.fn(() => targetFixture.width),
    imagePixelHeight: vi.fn(() => targetFixture.height),
    loadImageFromFile: vi.fn(async () => ({ width: targetFixture.width, height: targetFixture.height }))
  };
});

import {
  AUTO_CREATE_EMPTY_TARGET_ERROR_NAME,
  AUTO_CREATE_NO_PLACEMENT_AREA_ERROR_NAME,
  AutoCreateEmptyTargetError,
  AutoCreateNoPlacementAreaError,
  loadTargetImage,
  targetSignatureForImage
} from './sourcePipeline';

describe('auto-create target containment mask', () => {
  beforeEach(() => {
    targetFixture.width = 2;
    targetFixture.height = 1;
    targetFixture.pixels = new Uint8ClampedArray(8);
  });

  it('rejects a fully transparent target instead of treating the rectangle as placeable', async () => {
    const promise = loadTargetImage({} as File, DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);

    await expect(promise).rejects.toBeInstanceOf(AutoCreateEmptyTargetError);
    await expect(promise).rejects.toMatchObject({ name: AUTO_CREATE_EMPTY_TARGET_ERROR_NAME });
  });

  it('rejects a visible target whose erosion leaves no safe placement pixel', async () => {
    targetFixture.pixels = new Uint8ClampedArray([200, 100, 50, 1, 20, 40, 60, 0]);

    const promise = loadTargetImage({} as File, DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);

    await expect(promise).rejects.toBeInstanceOf(AutoCreateNoPlacementAreaError);
    await expect(promise).rejects.toMatchObject({ name: AUTO_CREATE_NO_PLACEMENT_AREA_ERROR_NAME });
  });

  it('uses every alpha > 0 pixel for containment while keeping alphaThresh for scoring', async () => {
    targetFixture.width = 3;
    targetFixture.height = 3;
    targetFixture.pixels = new Uint8ClampedArray(3 * 3 * 4);
    for (let offset = 0; offset < targetFixture.pixels.length; offset += 4) {
      targetFixture.pixels.set([200, 100, 50, 1], offset);
    }

    const target = await loadTargetImage({} as File, {
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      alphaThresh: 8
    });

    expect(Array.from(target.containmentMask)).toEqual(new Array(9).fill(1));
    expect(target.containmentCount).toBe(9);
    expect(Array.from(target.placementMask)).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    // A faint-but-visible target falls back to its containment pixels for MSE,
    // without changing the original alpha or making the rectangle opaque.
    expect(Array.from(target.mask)).toEqual(new Array(9).fill(1));
    expect(target.maskCount).toBe(9);
    expect(Array.from(target.straight)).toEqual(Array.from(targetFixture.pixels));
    expect(target.premult[3]).toBe(1);
    expect(target.premult[target.premult.length - 1]).toBe(1);
  });

  it('binds v4 checkpoints to the exact target RGBA, not only its dimensions', () => {
    const first = {
      width: 1,
      height: 1,
      straight: new Uint8ClampedArray([20, 40, 60, 255])
    };
    const second = {
      ...first,
      straight: new Uint8ClampedArray([20, 40, 61, 255])
    };

    expect(targetSignatureForImage(first)).not.toBe(targetSignatureForImage(second));
    expect(targetSignatureForImage(first)).toBe(targetSignatureForImage({
      ...first,
      straight: new Uint8ClampedArray(first.straight)
    }));
  });
});
