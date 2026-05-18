import { describe, expect, it } from 'vitest';
import { makePartOption } from '../../test/roleFixtures';
import {
  brushMaskBounds,
  convertBrushFillToDecos,
  maskContainsPoint,
  parseHexColor,
  type BrushFillMask
} from './brushFillToDeco';
import type { ImageToDecoConversionOptions } from './imageToDeco';

const conversionOptions: ImageToDecoConversionOptions = {
  maxSize: 64,
  alphaThreshold: 120,
  gapFactor: 1,
  targetScaleMultiplier: 2,
  targetRatio: 0.5,
  colorAlgorithm: 'rgb',
  maxLayers: 3,
  minSourceOpaquePixels: 1
};

describe('brush fill to deco helpers', () => {
  it('parses short and long hex colors with fallback for invalid values', () => {
    expect(parseHexColor('#0af')).toEqual({ r: 0, g: 170, b: 255 });
    expect(parseHexColor('35d0ff')).toEqual({ r: 53, g: 208, b: 255 });
    expect(parseHexColor('not-a-color')).toEqual({ r: 53, g: 208, b: 255 });
  });

  it('computes brush bounds and point inclusion across circles', () => {
    const mask: BrushFillMask = {
      points: [
        { x: 10, y: 20, radius: 5 },
        { x: -4, y: 2, radius: 3 }
      ]
    };

    expect(brushMaskBounds(mask)).toEqual({ minX: -7, minY: -1, maxX: 15, maxY: 25 });
    expect(maskContainsPoint(mask, 13, 24)).toBe(true);
    expect(maskContainsPoint(mask, -1, 2)).toBe(true);
    expect(maskContainsPoint(mask, 30, 30)).toBe(false);
  });

  it('converts a deco brush source into bounded sampled decorations', async () => {
    const option = makePartOption('asset', {
      code: 'deco-code',
      atlas: {
        texture: 'atlas.png',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        pivotX: 0,
        pivotY: 0,
        scale: 1
      }
    });

    const result = await convertBrushFillToDecos(
      { points: [{ x: 0, y: 0, radius: 1 }] },
      { type: 'deco', assetId: 'asset' },
      [option],
      conversionOptions
    );

    expect(result.sampledPixels).toBe(5);
    expect(result.generatedPixels).toBe(3);
    expect(result.truncated).toBe(true);
    expect(result.warnings[0]).toContain('Layer limit reached');
    expect(result.decorations[0]).toMatchObject({
      code: 'deco-code',
      assetId: 'asset',
      scaleX: 0.1,
      scaleY: 0.05,
      visible: true,
      opacity: 1
    });
  });
});
