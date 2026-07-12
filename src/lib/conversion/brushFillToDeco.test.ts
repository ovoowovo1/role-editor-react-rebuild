import { describe, expect, it } from 'vitest';
import { makePartOption } from '../../test/roleFixtures';
import {
  brushMaskBounds,
  convertBrushFillToDecos,
  createBrushMaskPointTester,
  maskContainsPoint,
  parseHexColor,
  type BrushFillConversionResult,
  type BrushFillMask
} from './brushFillToDeco';
import { visualWidthForOption, type ImageToDecoConversionOptions } from './imageToDeco';
import { round } from '../math';
import type { PartOption } from '../../types/role';

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

function referenceBrushConversion(
  mask: BrushFillMask,
  option: PartOption,
  options: ImageToDecoConversionOptions
): BrushFillConversionResult {
  const bounds = brushMaskBounds(mask);
  if (!bounds) throw new Error('Draw a range on the stage before filling.');
  const step = Math.max(0.5, options.gapFactor);
  const startX = Math.floor(bounds.minX / step) * step;
  const startY = Math.floor(bounds.minY / step) * step;
  const endX = Math.ceil(bounds.maxX / step) * step;
  const endY = Math.ceil(bounds.maxY / step) * step;
  const maxLayers = Math.max(0, Math.floor(options.maxLayers));
  const decorations: BrushFillConversionResult['decorations'] = [];
  const itemScale = (options.gapFactor / visualWidthForOption(option)) * options.targetScaleMultiplier;
  let sampledPixels = 0;
  let truncated = false;

  for (let y = startY; y <= endY; y += step) {
    for (let x = startX; x <= endX; x += step) {
      if (!maskContainsPoint(mask, x, y)) continue;
      sampledPixels += 1;
      if (decorations.length >= maxLayers) {
        truncated = true;
        continue;
      }
      decorations.push({
        id: 'reference-id',
        code: option.code,
        assetId: option.id,
        name: `Brush Fill ${String(decorations.length + 1).padStart(4, '0')}`,
        x: round(x, 3),
        y: round(y, 3),
        scaleX: itemScale,
        scaleY: itemScale * options.targetRatio,
        rotation: 0,
        visible: true,
        opacity: 1
      });
    }
  }

  const warnings: string[] = [];
  if (truncated) {
    warnings.push(`Layer limit reached. Generated ${decorations.length} of ${sampledPixels} brush samples.`);
  }
  if (!decorations.length) {
    warnings.push('Brush range is too small for the current gap setting.');
  }
  return {
    decorations,
    generatedPixels: decorations.length,
    sampledPixels,
    paletteSize: 1,
    truncated,
    warnings
  };
}

function normalizeDecorationIds(result: BrushFillConversionResult): BrushFillConversionResult {
  return {
    ...result,
    decorations: result.decorations.map((decoration) => ({ ...decoration, id: 'reference-id' }))
  };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

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

  it('keeps tangent boundaries, negative coordinates, overlaps, and mixed radii exact', () => {
    const mask: BrushFillMask = {
      points: [
        { x: -5, y: -5, radius: 5 },
        { x: 0, y: 0, radius: 2 },
        { x: 1, y: 0, radius: 1 }
      ]
    };
    const indexedContainsPoint = createBrushMaskPointTester(mask, 1);
    const samples = [
      [-2, -1],
      [-5, 0],
      [-1, 0],
      [0, 0],
      [2, 0],
      [3, 0],
      [-11, -5]
    ] as const;

    for (const [x, y] of samples) {
      expect(indexedContainsPoint(x, y), `${x},${y}`).toBe(maskContainsPoint(mask, x, y));
    }
    expect(indexedContainsPoint(-2, -1)).toBe(true); // 3-4-5 tangent point.
    expect(indexedContainsPoint(2, 0)).toBe(true); // Overlapping-circle outer tangent.
  });

  it('keeps wide circles exact without adding them to every grid bucket', () => {
    const mask: BrushFillMask = {
      points: [
        { x: 0, y: 0, radius: 100 },
        ...Array.from({ length: 9 }, (_, index) => ({ x: 200 + index * 4, y: -10, radius: 1 }))
      ]
    };
    let comparisons = 0;
    const indexedContainsPoint = createBrushMaskPointTester(mask, 1, () => { comparisons += 1; });

    expect(indexedContainsPoint(60, 80)).toBe(true);
    expect(indexedContainsPoint(101, 0)).toBe(false);
    expect(indexedContainsPoint(204, -10)).toBe(true);
    expect(comparisons).toBeLessThan(10);
  });

  it('reduces candidate comparisons structurally for sparse masks', () => {
    const points = Array.from({ length: 100 }, (_, index) => ({
      x: (index % 10) * 10,
      y: Math.floor(index / 10) * 10,
      radius: 1
    }));
    let comparisons = 0;
    const indexedContainsPoint = createBrushMaskPointTester({ points }, 1, () => { comparisons += 1; });

    for (const point of points) {
      expect(indexedContainsPoint(point.x, point.y)).toBe(true);
    }

    expect(comparisons).toBeLessThan(points.length * points.length / 4);
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
    expect(result.decorations.map(({ name, x, y }) => ({ name, x, y }))).toEqual([
      { name: 'Brush Fill 0001', x: 0, y: -1 },
      { name: 'Brush Fill 0002', x: -1, y: 0 },
      { name: 'Brush Fill 0003', x: 0, y: 0 }
    ]);
  });

  it('rejects an empty mask and still counts every sample after truncation', async () => {
    const option = makePartOption('asset');
    await expect(convertBrushFillToDecos(
      { points: [] },
      { type: 'deco', assetId: option.id },
      [option],
      conversionOptions
    )).rejects.toThrow('Draw a range');

    const result = await convertBrushFillToDecos(
      { points: [{ x: 0, y: 0, radius: 2 }] },
      { type: 'deco', assetId: option.id },
      [option],
      { ...conversionOptions, maxLayers: 0 }
    );
    expect(result).toMatchObject({ generatedPixels: 0, sampledPixels: 13, truncated: true });
    expect(result.warnings).toEqual([
      'Layer limit reached. Generated 0 of 13 brush samples.',
      'Brush range is too small for the current gap setting.'
    ]);
  });

  it('matches the old full scan for deterministic random masks, including ordering and result metadata', async () => {
    const random = seededRandom(0x51a7c0de);
    const mask: BrushFillMask = {
      points: Array.from({ length: 24 }, () => ({
        x: Math.round((random() * 40 - 20) * 10) / 10,
        y: Math.round((random() * 40 - 20) * 10) / 10,
        radius: Math.round((random() * 5 + 0.5) * 10) / 10
      }))
    };
    const option = makePartOption('random-asset', {
      code: 'random-code',
      atlas: {
        texture: 'atlas.png',
        x: 0,
        y: 0,
        width: 17,
        height: 11,
        pivotX: 0,
        pivotY: 0,
        scale: 1
      }
    });
    const options = { ...conversionOptions, gapFactor: 1.25, maxLayers: 73 };

    const actual = await convertBrushFillToDecos(
      mask,
      { type: 'deco', assetId: option.id },
      [option],
      options
    );
    const reference = referenceBrushConversion(mask, option, options);

    expect(normalizeDecorationIds(actual)).toEqual(reference);
  });
});
