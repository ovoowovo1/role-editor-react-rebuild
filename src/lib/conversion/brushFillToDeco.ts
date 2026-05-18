import type { DecorationLayer, PartOption } from '../../types/role';
import { DEFAULT_FILL_COLOR } from '../../constants/conversion';
import { createId, round } from '../math';
import {
  bestPaletteMatch,
  buildDecoPalette,
  visualWidthForOption,
  type ImageToDecoConversionOptions
} from './imageToDeco';

export interface BrushFillPoint {
  x: number;
  y: number;
  radius: number;
}

export interface BrushFillMask {
  points: BrushFillPoint[];
}

export type BrushFillSource =
  | { type: 'color'; color: string }
  | { type: 'deco'; assetId: string };

export interface BrushFillConversionResult {
  decorations: DecorationLayer[];
  generatedPixels: number;
  sampledPixels: number;
  paletteSize: number;
  truncated: boolean;
  warnings: string[];
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function brushMaskBounds(mask: BrushFillMask): Bounds | null {
  if (!mask.points.length) return null;
  return mask.points.reduce<Bounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x - point.radius),
      minY: Math.min(bounds.minY, point.y - point.radius),
      maxX: Math.max(bounds.maxX, point.x + point.radius),
      maxY: Math.max(bounds.maxY, point.y + point.radius)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    }
  );
}

export function maskContainsPoint(mask: BrushFillMask, x: number, y: number): boolean {
  return mask.points.some((point) => {
    const dx = x - point.x;
    const dy = y - point.y;
    return dx * dx + dy * dy <= point.radius * point.radius;
  });
}

export function parseHexColor(value: string): { r: number; g: number; b: number } {
  const hex = value.trim().replace(/^#/, '');
  const normalized = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return DEFAULT_FILL_COLOR;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function createFillDecoration(
  option: PartOption,
  x: number,
  y: number,
  index: number,
  options: ImageToDecoConversionOptions
): DecorationLayer {
  const itemScale = (options.gapFactor / visualWidthForOption(option)) * options.targetScaleMultiplier;
  return {
    id: createId('deco'),
    code: option.code,
    assetId: option.id,
    name: `Brush Fill ${String(index).padStart(4, '0')}`,
    x: round(x, 3),
    y: round(y, 3),
    scaleX: itemScale,
    scaleY: itemScale * options.targetRatio,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

async function resolveBrushFillOption(
  source: BrushFillSource,
  decoOptions: PartOption[],
  options: ImageToDecoConversionOptions
): Promise<{ option: PartOption; paletteSize: number }> {
  if (source.type === 'deco') {
    const option = decoOptions.find((item) => item.id === source.assetId);
    if (!option) throw new Error('Selected deco asset is not available.');
    return { option, paletteSize: decoOptions.length };
  }

  const palette = await buildDecoPalette(decoOptions, options);
  if (!palette.length) {
    throw new Error('No usable deco colors were found in the current asset palette.');
  }
  const color = parseHexColor(source.color);
  const entry = bestPaletteMatch(color.r, color.g, color.b, palette, options.colorAlgorithm);
  return { option: entry.option, paletteSize: palette.length };
}

export async function convertBrushFillToDecos(
  mask: BrushFillMask,
  source: BrushFillSource,
  decoOptions: PartOption[],
  options: ImageToDecoConversionOptions
): Promise<BrushFillConversionResult> {
  if (!decoOptions.length) {
    throw new Error('No deco assets are available for this camp.');
  }

  const bounds = brushMaskBounds(mask);
  if (!bounds) {
    throw new Error('Draw a range on the stage before filling.');
  }

  const { option, paletteSize } = await resolveBrushFillOption(source, decoOptions, options);
  const step = Math.max(0.5, options.gapFactor);
  const startX = Math.floor(bounds.minX / step) * step;
  const startY = Math.floor(bounds.minY / step) * step;
  const endX = Math.ceil(bounds.maxX / step) * step;
  const endY = Math.ceil(bounds.maxY / step) * step;
  const maxLayers = Math.max(0, Math.floor(options.maxLayers));
  const decorations: DecorationLayer[] = [];
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
      decorations.push(createFillDecoration(option, x, y, decorations.length + 1, options));
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
    paletteSize,
    truncated,
    warnings
  };
}
