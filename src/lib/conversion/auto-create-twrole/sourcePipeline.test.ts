import { afterEach, describe, expect, it, vi } from 'vitest';
import { makePartOption } from '../../../test/roleFixtures';
import { makeRgbaPixels, referencePremultiply } from '../../../test/autoCreateFixtures';
import {
  localCenterOffsetForOption,
  premultToStraightImageData,
  premultiply,
  visualSizeForOption
} from './sourcePipeline';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auto-create source pipeline', () => {
  it('premultiplies transparent, partial-alpha, and opaque pixels', () => {
    const straight = new Uint8ClampedArray([
      200, 100, 50, 0,
      200, 100, 50, 128,
      200, 100, 50, 255
    ]);

    expect(premultiply(straight)).toEqual(referencePremultiply(straight));
  });

  it('converts premultiplied pixels back to straight RGBA and reuses a matching output buffer', () => {
    class FakeImageData {
      constructor(
        readonly data: Uint8ClampedArray,
        readonly width: number,
        readonly height: number
      ) {}
    }
    vi.stubGlobal('ImageData', FakeImageData);
    const straight = makeRgbaPixels(2, 1, (x) => x === 0 ? [180, 90, 30, 128] : [44, 55, 66, 0]);
    const premult = referencePremultiply(straight);
    const output = new Uint8ClampedArray(straight.length);

    const image = premultToStraightImageData(premult, 2, 1, output);

    expect(image.data).toBe(output);
    expect(Array.from(image.data)).toEqual([180, 90, 30, 128, 0, 0, 0, 0]);
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
  });

  it('derives visual and frame sizes from runtime atlas metadata before fallbacks', () => {
    const image = { width: 14, height: 9 } as ImageBitmap;

    expect(visualSizeForOption(makePartOption('plain'), image)).toEqual({
      width: 14,
      height: 9,
      frameWidth: 14,
      frameHeight: 9
    });

    const atlas = makePartOption('atlas', {
      atlas: {
        texture: 'atlas.png',
        x: 0,
        y: 0,
        width: 20,
        height: 10,
        pivotX: 5,
        pivotY: 2,
        scale: 1,
        runtimeDisplayWidth: 40,
        runtimeDisplayHeight: 30
      }
    });
    expect(visualSizeForOption(atlas, image)).toEqual({
      width: 40,
      height: 30,
      frameWidth: 20,
      frameHeight: 10
    });
  });

  it('preserves atlas visual centers through scaled and runtime pivot offsets', () => {
    const option = makePartOption('atlas', {
      atlas: {
        texture: 'atlas.png',
        x: 0,
        y: 0,
        width: 20,
        height: 10,
        pivotX: 5,
        pivotY: 2,
        scale: 1,
        runtimePivotX: 8,
        runtimePivotY: 4,
        runtimeDisplayWidth: 40,
        runtimeDisplayHeight: 30
      }
    });
    const size = { width: 40, height: 30, frameWidth: 20, frameHeight: 10 };

    expect(localCenterOffsetForOption(option, size)).toEqual({ x: 4, y: 3 });
    expect(localCenterOffsetForOption(makePartOption('plain'), size)).toEqual({ x: 0, y: 0 });
  });
});
