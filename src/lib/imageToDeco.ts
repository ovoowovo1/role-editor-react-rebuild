import type { DecorationLayer, PartOption } from '../types/role';
import { createId, round } from './math';

export type ColorMatchAlgorithm =
  | 'cielab'
  | 'weighted-rgb'
  | 'rgb'
  | 'luminance'
  | 'hsv'
  | 'hsl'
  | 'brightness-color';
export type ImageToDecoQuality = 'performance' | 'balanced' | 'detail' | 'custom';

export interface ImageToDecoConversionOptions {
  maxSize: number;
  alphaThreshold: number;
  gapFactor: number;
  targetScaleMultiplier: number;
  targetRatio: number;
  colorAlgorithm: ColorMatchAlgorithm;
  maxLayers: number;
  minSourceOpaquePixels: number;
}

export interface ImageToDecoProgress {
  stage: 'palette' | 'image' | 'pixels';
  done: number;
  total: number;
}

export interface ImageToDecoConversionResult {
  decorations: DecorationLayer[];
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  opaquePixels: number;
  generatedPixels: number;
  skippedPixels: number;
  paletteSize: number;
  truncated: boolean;
  previewDataUrl: string;
  warnings: string[];
}

interface LabColor {
  l: number;
  a: number;
  b: number;
}

interface HsvColor {
  h: number;
  s: number;
  v: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface DecoPaletteEntry {
  option: PartOption;
  r: number;
  g: number;
  b: number;
  lab: LabColor;
  hsv: HsvColor;
  hsl: HslColor;
  luminance: number;
  opaquePixels: number;
  visualWidth: number;
}

interface ColorDistanceContext {
  lab: LabColor | null;
  hsv: HsvColor | null;
  hsl: HslColor | null;
  luminance: number;
}

export const IMAGE_TO_DECO_PRESETS: Record<Exclude<ImageToDecoQuality, 'custom'>, ImageToDecoConversionOptions> = {
  performance: {
    maxSize: 64,
    alphaThreshold: 170,
    gapFactor: 2,
    targetScaleMultiplier: 2.1,
    targetRatio: 1,
    colorAlgorithm: 'weighted-rgb',
    maxLayers: 2500,
    minSourceOpaquePixels: 20
  },
  balanced: {
    maxSize: 128,
    alphaThreshold: 150,
    gapFactor: 2,
    targetScaleMultiplier: 2.26,
    targetRatio: 1,
    colorAlgorithm: 'cielab',
    maxLayers: 6000,
    minSourceOpaquePixels: 20
  },
  detail: {
    maxSize: 192,
    alphaThreshold: 120,
    gapFactor: 1.75,
    targetScaleMultiplier: 2.35,
    targetRatio: 1,
    colorAlgorithm: 'cielab',
    maxLayers: 10000,
    minSourceOpaquePixels: 8
  }
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D context is not available.');
  return context;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
  imageCache.set(src, request);
  return request;
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
    imageCache.delete(url);
  }
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;

  rr = rr > 0.04045 ? ((rr + 0.055) / 1.055) ** 2.4 : rr / 12.92;
  gg = gg > 0.04045 ? ((gg + 0.055) / 1.055) ** 2.4 : gg / 12.92;
  bb = bb > 0.04045 ? ((bb + 0.055) / 1.055) ** 2.4 : bb / 12.92;

  let x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
  let y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1;
  let z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;

  x = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116;

  return {
    l: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}

function hueFromDelta(r: number, g: number, b: number, max: number, delta: number): number {
  if (!delta) return 0;
  if (max === r) return 60 * (((g - b) / delta) % 6);
  if (max === g) return 60 * ((b - r) / delta + 2);
  return 60 * ((r - g) / delta + 4);
}

function normalizeHue(hue: number): number {
  return hue < 0 ? hue + 360 : hue;
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff) / 180;
}

function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  return {
    h: normalizeHue(hueFromDelta(r, g, b, max, delta)),
    s: max === 0 ? 0 : delta / max,
    v: max / 255
  };
}

function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  const lightness = (max + min) / 2;

  return {
    h: normalizeHue(hueFromDelta(rr, gg, bb, max, delta)),
    s: delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)),
    l: lightness
  };
}

function luminanceForRgb(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colorDistance(
  r: number,
  g: number,
  b: number,
  context: ColorDistanceContext,
  entry: DecoPaletteEntry,
  algorithm: ColorMatchAlgorithm
): number {
  if (algorithm === 'cielab') {
    const currentLab = context.lab ?? rgbToLab(r, g, b);
    return (
      (currentLab.l - entry.lab.l) ** 2 +
      (currentLab.a - entry.lab.a) ** 2 +
      (currentLab.b - entry.lab.b) ** 2
    );
  }

  if (algorithm === 'weighted-rgb') {
    const dr = r - entry.r;
    const dg = g - entry.g;
    const db = b - entry.b;
    return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
  }

  if (algorithm === 'luminance') {
    return Math.abs(context.luminance - entry.luminance);
  }

  if (algorithm === 'hsv') {
    const currentHsv = context.hsv ?? rgbToHsv(r, g, b);
    const hue = hueDistance(currentHsv.h, entry.hsv.h);
    const saturation = currentHsv.s - entry.hsv.s;
    const value = currentHsv.v - entry.hsv.v;
    const hueWeight = currentHsv.s * entry.hsv.s;
    return 1800 * hueWeight * hue * hue + 400 * saturation * saturation + 250 * value * value;
  }

  if (algorithm === 'hsl') {
    const currentHsl = context.hsl ?? rgbToHsl(r, g, b);
    const hue = hueDistance(currentHsl.h, entry.hsl.h);
    const saturation = currentHsl.s - entry.hsl.s;
    const lightness = currentHsl.l - entry.hsl.l;
    const hueWeight = currentHsl.s * entry.hsl.s;
    return 1200 * hueWeight * hue * hue + 500 * saturation * saturation + 350 * lightness * lightness;
  }

  if (algorithm === 'brightness-color') {
    const dr = r - entry.r;
    const dg = g - entry.g;
    const db = b - entry.b;
    const weightedRgb = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    const brightness = context.luminance - entry.luminance;
    return 6 * brightness * brightness + 0.25 * weightedRgb;
  }

  return (r - entry.r) ** 2 + (g - entry.g) ** 2 + (b - entry.b) ** 2;
}

export function visualWidthForOption(option: PartOption): number {
  const atlas = option.atlas;
  return Math.max(1, atlas?.runtimeDisplayWidth ?? atlas?.width ?? 50);
}

function averageOpaqueColor(data: Uint8ClampedArray, alphaThreshold: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] <= alphaThreshold) continue;
    r += data[index];
    g += data[index + 1];
    b += data[index + 2];
    count += 1;
  }

  if (!count) return null;
  return {
    r: r / count,
    g: g / count,
    b: b / count,
    count
  };
}

async function optionToPaletteEntry(
  option: PartOption,
  alphaThreshold: number
): Promise<DecoPaletteEntry | null> {
  const atlas = option.atlas;
  const image = await loadImage(atlas?.texture ?? option.icon);
  const width = Math.max(1, Math.round(atlas?.width ?? image.naturalWidth ?? 50));
  const height = Math.max(1, Math.round(atlas?.height ?? image.naturalHeight ?? 50));
  const canvas = createCanvas(width, height);
  const context = get2d(canvas);

  if (atlas) {
    context.drawImage(image, atlas.x, atlas.y, atlas.width, atlas.height, 0, 0, width, height);
  } else {
    context.drawImage(image, 0, 0, width, height);
  }

  const average = averageOpaqueColor(context.getImageData(0, 0, width, height).data, alphaThreshold);
  if (!average) return null;

  return {
    option,
    r: average.r,
    g: average.g,
    b: average.b,
    lab: rgbToLab(average.r, average.g, average.b),
    hsv: rgbToHsv(average.r, average.g, average.b),
    hsl: rgbToHsl(average.r, average.g, average.b),
    luminance: luminanceForRgb(average.r, average.g, average.b),
    opaquePixels: average.count,
    visualWidth: visualWidthForOption(option)
  };
}

export async function buildDecoPalette(
  options: PartOption[],
  conversionOptions: ImageToDecoConversionOptions,
  onProgress?: (progress: ImageToDecoProgress) => void
): Promise<DecoPaletteEntry[]> {
  const palette: DecoPaletteEntry[] = [];
  const total = options.length;

  for (let index = 0; index < options.length; index += 1) {
    try {
      const entry = await optionToPaletteEntry(options[index], conversionOptions.alphaThreshold);
      if (entry && entry.opaquePixels >= conversionOptions.minSourceOpaquePixels) {
        palette.push(entry);
      }
    } catch {
      // Broken or unavailable atlas entries are simply skipped.
    }

    if (index % 16 === 0 || index === options.length - 1) {
      onProgress?.({ stage: 'palette', done: index + 1, total });
      await nextFrame();
    }
  }

  return palette;
}

export function bestPaletteMatch(
  r: number,
  g: number,
  b: number,
  palette: DecoPaletteEntry[],
  algorithm: ColorMatchAlgorithm
): DecoPaletteEntry {
  const context: ColorDistanceContext = {
    lab: algorithm === 'cielab' ? rgbToLab(r, g, b) : null,
    hsv: algorithm === 'hsv' ? rgbToHsv(r, g, b) : null,
    hsl: algorithm === 'hsl' ? rgbToHsl(r, g, b) : null,
    luminance: luminanceForRgb(r, g, b)
  };
  let best = palette[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entry of palette) {
    const distance = colorDistance(r, g, b, context, entry, algorithm);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }

  return best;
}

export async function convertImageFileToDecos(
  file: File,
  decoOptions: PartOption[],
  conversionOptions: ImageToDecoConversionOptions,
  onProgress?: (progress: ImageToDecoProgress) => void
): Promise<ImageToDecoConversionResult> {
  if (!decoOptions.length) {
    throw new Error('No deco assets are available for this camp.');
  }

  const palette = await buildDecoPalette(decoOptions, conversionOptions, onProgress);
  if (!palette.length) {
    throw new Error('No usable deco colors were found in the current asset palette.');
  }

  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const maxSize = Math.max(1, conversionOptions.maxSize);
  const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
  const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = createCanvas(outputWidth, outputHeight);
  const context = get2d(canvas);

  context.clearRect(0, 0, outputWidth, outputHeight);
  context.drawImage(image, 0, 0, outputWidth, outputHeight);
  onProgress?.({ stage: 'image', done: 1, total: 1 });

  const data = context.getImageData(0, 0, outputWidth, outputHeight).data;
  const decorations: DecorationLayer[] = [];
  const centerX = (outputWidth - 1) / 2;
  const centerY = (outputHeight - 1) / 2;
  const totalPixels = outputWidth * outputHeight;
  let opaquePixels = 0;
  let skippedPixels = 0;
  let truncated = false;
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'Image';

  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      const index = (y * outputWidth + x) * 4;
      if (data[index + 3] <= conversionOptions.alphaThreshold) {
        skippedPixels += 1;
        continue;
      }

      opaquePixels += 1;
      if (decorations.length >= conversionOptions.maxLayers) {
        truncated = true;
        continue;
      }

      const entry = bestPaletteMatch(
        data[index],
        data[index + 1],
        data[index + 2],
        palette,
        conversionOptions.colorAlgorithm
      );
      const itemScale = (conversionOptions.gapFactor / entry.visualWidth) * conversionOptions.targetScaleMultiplier;
      const count = decorations.length + 1;

      decorations.push({
        id: createId('deco'),
        code: entry.option.code,
        assetId: entry.option.id,
        name: `${baseName} ${String(count).padStart(4, '0')}`,
        x: round((x - centerX) * conversionOptions.gapFactor, 3),
        y: round((y - centerY) * conversionOptions.gapFactor, 3),
        scaleX: itemScale,
        scaleY: itemScale * conversionOptions.targetRatio,
        rotation: 0,
        visible: true,
        opacity: 1
      });
    }

    if (y % 8 === 0 || y === outputHeight - 1) {
      onProgress?.({ stage: 'pixels', done: Math.min(totalPixels, (y + 1) * outputWidth), total: totalPixels });
      await nextFrame();
    }
  }

  const warnings: string[] = [];
  if (truncated) {
    warnings.push(`Layer limit reached. Generated ${decorations.length} of ${opaquePixels} visible pixels.`);
  }
  if (sourceWidth !== outputWidth || sourceHeight !== outputHeight) {
    warnings.push(`Image resized from ${sourceWidth}x${sourceHeight} to ${outputWidth}x${outputHeight}.`);
  }

  return {
    decorations,
    sourceWidth,
    sourceHeight,
    outputWidth,
    outputHeight,
    opaquePixels,
    generatedPixels: decorations.length,
    skippedPixels,
    paletteSize: palette.length,
    truncated,
    previewDataUrl: canvas.toDataURL('image/png'),
    warnings
  };
}
