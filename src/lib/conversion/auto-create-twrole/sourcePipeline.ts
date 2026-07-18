import type { PartOption } from '../../../types/role';
import type { AutoCreateTwroleSettings } from './contracts';
import type { AutoCreateImage, SourceTile, TargetImageData, Vec3 } from './internalTypes';
import {
  clamp255,
  createCanvas,
  get2d,
  imagePixelHeight,
  imagePixelWidth,
  loadImage,
  loadImageFromFile,
  nextFrame,
  throwIfAborted
} from './platform';
import {
  gafFrameOneDisplayListSignature,
  rasterizeDecorationFrameOne
} from './gafSourceRaster';
import { erodeContainmentMask } from './containment';

export const AUTO_CREATE_EMPTY_TARGET_ERROR_NAME = 'AutoCreateEmptyTargetError';
export const AUTO_CREATE_NO_PLACEMENT_AREA_ERROR_NAME = 'AutoCreateNoPlacementAreaError';
const AUTO_CREATE_SOURCE_POLICY_VERSION = 'native-gaf-frame1-v1:strict-alpha-fringe1-v1:focus-mask-v1';

export class AutoCreateEmptyTargetError extends Error {
  constructor() {
    super('The target image is fully transparent and has no valid decoration area.');
    this.name = AUTO_CREATE_EMPTY_TARGET_ERROR_NAME;
  }
}

export class AutoCreateNoPlacementAreaError extends Error {
  constructor() {
    super('The target image has no interior pixels that can safely contain a decoration.');
    this.name = AUTO_CREATE_NO_PLACEMENT_AREA_ERROR_NAME;
  }
}

export function premultiply(data: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(data.length);
  for (let index = 0; index < data.length; index += 4) {
    const a = data[index + 3];
    const af = a / 255;
    out[index] = data[index] * af;
    out[index + 1] = data[index + 1] * af;
    out[index + 2] = data[index + 2] * af;
    out[index + 3] = a;
  }
  return out;
}

export function premultToStraightImageData(
  premult: Float32Array,
  width: number,
  height: number,
  output?: Uint8ClampedArray
): ImageData {
  const out = output && output.length === premult.length ? output : new Uint8ClampedArray(premult.length);
  for (let index = 0; index < premult.length; index += 4) {
    const a = premult[index + 3];
    if (a > 1.0e-6) {
      const af = Math.max(1.0e-6, a / 255);
      out[index] = clamp255(premult[index] / af);
      out[index + 1] = clamp255(premult[index + 1] / af);
      out[index + 2] = clamp255(premult[index + 2] / af);
      out[index + 3] = clamp255(a);
    } else {
      out[index] = 0;
      out[index + 1] = 0;
      out[index + 2] = 0;
      out[index + 3] = 0;
    }
  }
  return new ImageData(out as Uint8ClampedArray<ArrayBuffer>, width, height);
}

export async function loadTargetImage(file: File, settings: AutoCreateTwroleSettings): Promise<TargetImageData> {
  const image = await loadImageFromFile(file);
  const sourceWidth = imagePixelWidth(image);
  const sourceHeight = imagePixelHeight(image);
  // Match Pillow's Image.open(...).convert("RGBA") behavior: keep the target size.
  const width = sourceWidth;
  const height = sourceHeight;
  const canvas = createCanvas(width, height);
  const context = get2d(canvas);
  context.clearRect(0, 0, width, height);
  context.drawImage(image as CanvasImageSource, 0, 0, width, height);
  const straight = context.getImageData(0, 0, width, height).data;
  const premult = premultiply(straight);
  const mask = new Uint8Array(width * height);
  const containmentMask = new Uint8Array(width * height);
  let maskCount = 0;
  let containmentCount = 0;

  for (let pixel = 0, index = 0; pixel < mask.length; pixel += 1, index += 4) {
    if (straight[index + 3] > 0) {
      containmentMask[pixel] = 1;
      containmentCount += 1;
    }
    if (straight[index + 3] > settings.alphaThresh) {
      mask[pixel] = 1;
      maskCount += 1;
    }
  }

  if (containmentCount === 0) throw new AutoCreateEmptyTargetError();

  // A very faint target still needs a scoring area. Preserve its real alpha
  // rather than silently treating the complete rectangle as opaque.
  if (maskCount === 0) {
    mask.set(containmentMask);
    maskCount = containmentCount;
  }

  const placementMask = erodeContainmentMask(containmentMask, width, height, 1);
  let placementCount = 0;
  for (let pixel = 0; pixel < placementMask.length; pixel += 1) {
    placementCount += placementMask[pixel] ? 1 : 0;
  }
  if (placementCount === 0) throw new AutoCreateNoPlacementAreaError();

  return {
    width,
    height,
    sourceWidth,
    sourceHeight,
    straight,
    premult,
    mask,
    maskCount,
    containmentMask,
    containmentCount,
    placementMask
  };
}

export function sourceSignatureForTiles(sources: readonly SourceTile[]): string {
  const payload = `${AUTO_CREATE_SOURCE_POLICY_VERSION}|${sources.map((source) => [
    source.assetId,
    source.code,
    `${source.origW}x${source.origH}`,
    `${source.localCenterX.toFixed(6)},${source.localCenterY.toFixed(6)}`,
    source.alphaSum.toFixed(6),
    gafFrameOneDisplayListSignature(source.option)
  ].join(':')).join('|')}`;
  // Keep checkpoints compact while hashing every display-list field above.
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < payload.length; index += 1) {
    const code = payload.charCodeAt(index);
    hashA = Math.imul(hashA ^ code, 0x01000193);
    hashB = Math.imul(hashB ^ code, 0x85ebca6b);
  }
  return `${AUTO_CREATE_SOURCE_POLICY_VERSION}:${payload.length}:${(hashA >>> 0).toString(16)}:${(hashB >>> 0).toString(16)}`;
}

export function targetSignatureForImage(
  target: Pick<TargetImageData, 'width' | 'height' | 'straight'>
): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < target.straight.length; index += 1) {
    const value = target.straight[index];
    hashA = Math.imul(hashA ^ value, 0x01000193);
    hashB = Math.imul(hashB ^ value, 0x85ebca6b);
  }
  return `${AUTO_CREATE_SOURCE_POLICY_VERSION}:target:${target.width}x${target.height}:${(hashA >>> 0).toString(16)}:${(hashB >>> 0).toString(16)}`;
}

export interface SourceVisualSize {
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
}

export function visualSizeForOption(option: PartOption, image: AutoCreateImage): SourceVisualSize {
  const atlas = option.atlas;
  const fallbackWidth = imagePixelWidth(image);
  const fallbackHeight = imagePixelHeight(image);
  const frameWidth = Math.max(1, Math.round(atlas?.width ?? fallbackWidth));
  const frameHeight = Math.max(1, Math.round(atlas?.height ?? fallbackHeight));
  return {
    width: Math.max(1, Math.round(atlas?.runtimeDisplayWidth ?? atlas?.width ?? fallbackWidth)),
    height: Math.max(1, Math.round(atlas?.runtimeDisplayHeight ?? atlas?.height ?? fallbackHeight)),
    frameWidth,
    frameHeight
  };
}

export function localCenterOffsetForOption(
  option: PartOption,
  size: SourceVisualSize
): { x: number; y: number } {
  const atlas = option.atlas;
  if (!atlas) {
    // Non-GAF fallback sprites are drawn by the editor with anchor 0.5, so their
    // local visual center is exactly the DecorationLayer x/y origin.
    return { x: 0, y: 0 };
  }

  const pivotX = atlas.runtimePivotX ?? atlas.pivotX ?? size.frameWidth / 2;
  const pivotY = atlas.runtimePivotY ?? atlas.pivotY ?? size.frameHeight / 2;
  const displayScaleX = size.width / Math.max(1, size.frameWidth);
  const displayScaleY = size.height / Math.max(1, size.frameHeight);

  return {
    x: size.width / 2 - pivotX * displayScaleX,
    y: size.height / 2 - pivotY * displayScaleY
  };
}

export async function optionToSourceTile(
  option: PartOption,
  idx: number,
  settings: AutoCreateTwroleSettings
): Promise<SourceTile | null> {
  const atlas = option.atlas;
  const image = await loadImage(atlas?.texture ?? option.icon);
  const exactGaf = rasterizeDecorationFrameOne(option, image);
  const size = exactGaf ? null : visualSizeForOption(option, image);
  const localCenter = exactGaf
    ? { x: exactGaf.localCenterX, y: exactGaf.localCenterY }
    : localCenterOffsetForOption(option, size!);
  const renderW = exactGaf?.width ?? size!.frameWidth;
  const renderH = exactGaf?.height ?? size!.frameHeight;
  const origW = exactGaf?.width ?? size!.width;
  const origH = exactGaf?.height ?? size!.height;
  const renderCanvas = exactGaf?.canvas ?? createCanvas(renderW, renderH);

  if (!exactGaf) {
    const renderContext = get2d(renderCanvas);
    renderContext.clearRect(0, 0, renderW, renderH);
    if (atlas) {
      renderContext.drawImage(image as CanvasImageSource, atlas.x, atlas.y, atlas.width, atlas.height, 0, 0, renderW, renderH);
    } else {
      renderContext.drawImage(image as CanvasImageSource, 0, 0, renderW, renderH);
    }
  }

  // Keep maxTileSize as a color-statistics budget only. Candidate transforms
  // use the native renderCanvas so the Worker evaluates the same source detail
  // that Pixi displays after insertion.
  const maxFrameSide = Math.max(renderW, renderH);
  const thumbScale = Math.min(1, Math.max(1, settings.maxTileSize) / Math.max(1, maxFrameSide));
  const analysisW = Math.max(1, Math.round(renderW * thumbScale));
  const analysisH = Math.max(1, Math.round(renderH * thumbScale));
  const analysisCanvas = createCanvas(analysisW, analysisH);
  const analysisContext = get2d(analysisCanvas);
  analysisContext.clearRect(0, 0, analysisW, analysisH);
  analysisContext.drawImage(renderCanvas as CanvasImageSource, 0, 0, renderW, renderH, 0, 0, analysisW, analysisH);

  const data = analysisContext.getImageData(0, 0, analysisW, analysisH).data;
  let alphaSum = 0;
  let visibleCount = 0;
  let weightSum = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    alphaSum += alpha / 255;
    if (alpha <= settings.alphaThresh) continue;
    visibleCount += 1;
    const weight = alpha / 255;
    weightSum += weight;
    rSum += data[index] * weight;
    gSum += data[index + 1] * weight;
    bSum += data[index + 2] * weight;
  }

  if (visibleCount === 0 || weightSum <= 1.0e-6) return null;

  const meanRgb: Vec3 = [rSum / weightSum, gSum / weightSum, bSum / weightSum];
  let varR = 0;
  let varG = 0;
  let varB = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha <= settings.alphaThresh) continue;
    const weight = alpha / 255;
    const dr = data[index] - meanRgb[0];
    const dg = data[index + 1] - meanRgb[1];
    const db = data[index + 2] - meanRgb[2];
    varR += dr * dr * weight;
    varG += dg * dg * weight;
    varB += db * db * weight;
  }

  const stdRgb: Vec3 = [
    Math.sqrt(Math.max(0, varR / weightSum)),
    Math.sqrt(Math.max(0, varG / weightSum)),
    Math.sqrt(Math.max(0, varB / weightSum))
  ];

  return {
    idx,
    option,
    code: option.code,
    assetId: option.id,
    label: option.label,
    canvas: renderCanvas,
    origW,
    origH,
    thumbW: renderW,
    thumbH: renderH,
    sFactor: Math.max(1.0e-9, renderW / Math.max(1, origW)),
    localCenterX: localCenter.x,
    localCenterY: localCenter.y,
    meanRgb,
    stdRgb,
    alphaRatio: visibleCount / Math.max(1, analysisW * analysisH),
    alphaSum
  };
}

export async function loadSourceTiles(
  options: PartOption[],
  settings: AutoCreateTwroleSettings,
  signal?: AbortSignal,
  onProgress?: (done: number, total: number) => void
): Promise<{ sources: SourceTile[]; warnings: string[] }> {
  const sources: SourceTile[] = [];
  const warnings: string[] = [];
  let idx = 0;

  for (let i = 0; i < options.length; i += 1) {
    throwIfAborted(signal);
    const option = options[i];
    try {
      const tile = await optionToSourceTile(option, idx, settings);
      if (tile) {
        sources.push(tile);
        idx += 1;
      } else {
        warnings.push(`Skipped empty-alpha source: ${option.label || option.code}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Skipped source ${option.label || option.code}: ${message}`);
    }

    if (i % 12 === 0) {
      onProgress?.(i + 1, options.length);
      await nextFrame();
    }
  }

  return { sources, warnings };
}
