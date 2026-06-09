import type { DecorationLayer, PartOption } from '../../types/role';
import { DEFAULT_POSITION_RANGE } from '../../constants/editor';
import { createId, round } from '../math';

const ALPHA_MSE_WEIGHT = 1.0;
const ALPHA_THRESH_DEFAULT = 10;
const DEFAULT_MAX_TILE_SIZE = 40;
const DEFAULT_CELL_SIZE = 16;
const DEFAULT_CANDIDATE_BATCH = 96;
const DEFAULT_COLOR_TOPK = 24;
const DEFAULT_TILE_PENALTY_MSE = 2.5e-4;
const DEFAULT_MAX_OUTSIDE_ALPHA_RATIO = 0.025;
const DEFAULT_GRADIENT_LOCAL_RADIUS = 12;
const DEFAULT_GRADIENT_PIXEL_MIX = 0.72;
const DEFAULT_GRADIENT_STD_SIGMA = 44.0;
const DEFAULT_GRADIENT_STD_WEIGHT = 0.42;
const DEFAULT_GRADIENT_COMPLEXITY_THRESHOLD = 18.0;
const DEFAULT_GRADIENT_ORIGINAL_MAX_PX = 12;
const MEMORY_VERSION = 1;
const AUTO_CREATE_SNAPSHOT_VERSION = 1;
const DEFAULT_ROLE_EXPORT_MAX_SIDE = DEFAULT_POSITION_RANGE * 2;
const DEFAULT_MEMORY_NAME = 'experience_color_memory.json';
const AUTO_CREATE_EXPERIENCE_STORAGE_PREFIX = 'auto-create-twrole:';

export interface AutoCreateTwroleSettings {
  // These names mirror the Python worker CLI. The React panel only exposes the
  // same controls as gui_app.py: --tiles, --tile-budget, --log-every,
  // and the preview checkbox that maps to --export-every.
  tiles: number;
  tileBudget: number;
  seed: number;
  logEvery: number;
  exportEvery: number;
  maxTileSize: number;
  alphaThresh: number;
  errorCellSize: number;
  candidateBatch: number;
  replaceCandidateBatch: number;
  colorTopk: number;
  colorSigma: number;
  exploration: number;
  tilePenaltyMse: number;
  maxOutsideAlphaRatio: number;
  gradientLocalRadius: number;
  gradientPixelMix: number;
  gradientStdSigma: number;
  gradientStdWeight: number;
  gradientComplexityThreshold: number;
  gradientOriginalMaxPx: number;
  minRenderedPx: number;
  maxRenderedPx: number;
  rotationProb: number;
  flipProb: number;
  removeEvery: number;
  replaceEvery: number;
  pruneRounds: number;
  pruneSampleSize: number;
  prunePenaltyFactor: number;
  replaceMinGainMse: number;
  finalPruneRounds: number;
  fullErrorRecomputeEvery: number;
  variantCacheItems: number;
  experienceJson: string;
  resetExperience: boolean;
}

export const DEFAULT_AUTO_CREATE_TWROLE_SETTINGS: AutoCreateTwroleSettings = {
  // gui_app.py defaults for the user-visible controls.
  tiles: 4000,
  tileBudget: 3000,
  seed: 0,
  logEvery: 1000,
  exportEvery: 1000,

  // reversible_collage_system_hotcachev2_fast_exact.py defaults for the worker.
  maxTileSize: DEFAULT_MAX_TILE_SIZE,
  alphaThresh: ALPHA_THRESH_DEFAULT,
  errorCellSize: DEFAULT_CELL_SIZE,
  candidateBatch: DEFAULT_CANDIDATE_BATCH,
  replaceCandidateBatch: 32,
  colorTopk: DEFAULT_COLOR_TOPK,
  colorSigma: 54,
  exploration: 0.12,
  tilePenaltyMse: DEFAULT_TILE_PENALTY_MSE,
  maxOutsideAlphaRatio: DEFAULT_MAX_OUTSIDE_ALPHA_RATIO,
  gradientLocalRadius: DEFAULT_GRADIENT_LOCAL_RADIUS,
  gradientPixelMix: DEFAULT_GRADIENT_PIXEL_MIX,
  gradientStdSigma: DEFAULT_GRADIENT_STD_SIGMA,
  gradientStdWeight: DEFAULT_GRADIENT_STD_WEIGHT,
  gradientComplexityThreshold: DEFAULT_GRADIENT_COMPLEXITY_THRESHOLD,
  gradientOriginalMaxPx: DEFAULT_GRADIENT_ORIGINAL_MAX_PX,
  minRenderedPx: 4,
  maxRenderedPx: 0,
  rotationProb: 0.22,
  flipProb: 0.04,
  removeEvery: 200,
  replaceEvery: 350,
  pruneRounds: 1,
  pruneSampleSize: 18,
  prunePenaltyFactor: 1.15,
  replaceMinGainMse: 1.0e-7,
  finalPruneRounds: 200,
  fullErrorRecomputeEvery: 1000,
  variantCacheItems: 4096,
  experienceJson: DEFAULT_MEMORY_NAME,
  resetExperience: false
};

export type AutoCreateTwroleProgressStage = 'sources' | 'run' | 'final';

export interface AutoCreateTwroleProgress {
  stage: AutoCreateTwroleProgressStage;
  step: number;
  total: number;
  mse: number;
  active: number;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  message?: string;
}

export interface AutoCreateTwroleLegacyDecoEntry {
  c: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  r: number;
}

export interface AutoCreateTwroleResult {
  decorations: DecorationLayer[];
  exportJson: { deco: AutoCreateTwroleLegacyDecoEntry[] };
  previewDataUrl: string;
  targetWidth: number;
  targetHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceCount: number;
  insertScale: number;
  mse: number;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  warnings: string[];
}

export interface AutoCreateTwroleSnapshotTile {
  active: boolean;
  sourceId: number;
  sxInternal: number;
  syInternal: number;
  rDeg: number;
  centerX: number;
  centerY: number;
  bbox: [left: number, top: number, right: number, bottom: number];
  decoration: DecorationLayer;
  legacy: AutoCreateTwroleLegacyDecoEntry;
  gainMse: number;
}

export interface AutoCreateTwroleSnapshot {
  version: number;
  targetWidth: number;
  targetHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceCount: number;
  sourceSignature: string;
  step: number;
  totalSteps: number;
  seed: number;
  rngState: number;
  rngSpareNormal: number | null;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  mse: number;
  tiles: AutoCreateTwroleSnapshotTile[];
  warnings: string[];
}

export interface AutoCreateTwroleCheckpoint {
  progress: AutoCreateTwroleProgress;
  result: AutoCreateTwroleResult;
  snapshot: AutoCreateTwroleSnapshot;
}

export interface AutoCreateTwroleStoppedResult {
  result: AutoCreateTwroleResult;
  checkpoint: AutoCreateTwroleCheckpoint;
}

export class AutoCreateTwroleStoppedError extends Error {
  readonly result: AutoCreateTwroleResult;
  readonly checkpoint: AutoCreateTwroleCheckpoint;

  constructor(stopped: AutoCreateTwroleStoppedResult) {
    super('AutoCreateTwrole was stopped.');
    this.name = 'AutoCreateTwroleStoppedError';
    this.result = stopped.result;
    this.checkpoint = stopped.checkpoint;
  }
}

export function isAutoCreateTwroleStoppedError(error: unknown): error is AutoCreateTwroleStoppedError {
  return error instanceof AutoCreateTwroleStoppedError;
}

export interface RunAutoCreateTwroleOptions {
  targetFile: File;
  decoOptions: PartOption[];
  settings?: Partial<AutoCreateTwroleSettings>;
  resumeSnapshot?: AutoCreateTwroleSnapshot | null;
  signal?: AbortSignal;
  onProgress?: (progress: AutoCreateTwroleProgress) => void;
  onCheckpoint?: (checkpoint: AutoCreateTwroleCheckpoint) => void;
}

type Vec3 = [number, number, number];
type AutoCreateCanvas = HTMLCanvasElement | OffscreenCanvas;
type AutoCreateCanvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type AutoCreateImage = HTMLImageElement | ImageBitmap;

interface TargetImageData {
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  straight: Uint8ClampedArray;
  premult: Float32Array;
  mask: Uint8Array;
  maskCount: number;
}

interface SourceTile {
  idx: number;
  option: PartOption;
  code: string;
  assetId: string;
  label: string;
  canvas: AutoCreateCanvas;
  origW: number;
  origH: number;
  thumbW: number;
  thumbH: number;
  sFactor: number;
  localCenterX: number;
  localCenterY: number;
  meanRgb: Vec3;
  stdRgb: Vec3;
  alphaRatio: number;
  alphaSum: number;
}

interface TransformedImage {
  width: number;
  height: number;
  data: Float32Array; // straight RGBA, 0..255
}

interface DecoDraft {
  code: string;
  assetId: string;
  name: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  legacy: AutoCreateTwroleLegacyDecoEntry;
}

interface Candidate {
  sourceId: number;
  sxInternal: number;
  syInternal: number;
  rDeg: number;
  centerX: number;
  centerY: number;
  rgba: TransformedImage;
  bbox: BBox;
  draft: DecoDraft;
  sseBefore: number;
  sseAfter: number;
  globalGainMse: number;
  score: number;
}

interface TileRecord {
  active: boolean;
  sourceId: number;
  sxInternal: number;
  syInternal: number;
  rDeg: number;
  bbox: BBox;
  centerX: number;
  centerY: number;
  decoration: DecorationLayer;
  legacy: AutoCreateTwroleLegacyDecoEntry;
  gainMse: number;
}

type BBox = [left: number, top: number, right: number, bottom: number];

interface MemoryStat {
  trials: number;
  accepted: number;
  gain_sum: number;
  ema_gain: number;
}

interface MemoryPayload {
  version: number;
  updated_at?: number;
  source_stats: Record<string, MemoryStat>;
  color_stats: Record<string, MemoryStat>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp255(value: number): number {
  return clamp(Math.round(value), 0, 255);
}

function createCanvas(width: number, height: number): AutoCreateCanvas {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));

  // Main thread keeps using a normal canvas so the existing internal preview
  // path can still call toDataURL(). Workers do not have document, so they use
  // OffscreenCanvas for the heavy AutoCreate math.
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = safeWidth;
    canvas.height = safeHeight;
    return canvas;
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(safeWidth, safeHeight);
  }

  throw new Error('Canvas is not available in this browser context.');
}

type FileReaderSyncConstructor = new () => { readAsDataURL(blob: Blob): string };

function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Failed to read preview blob.'));
      reader.readAsDataURL(blob);
    });
  }

  const ReaderSync = (globalThis as unknown as { FileReaderSync?: FileReaderSyncConstructor }).FileReaderSync;
  if (ReaderSync) {
    try {
      return Promise.resolve(new ReaderSync().readAsDataURL(blob));
    } catch {
      // Fall through to the ArrayBuffer encoder below.
    }
  }

  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    const base64 = typeof btoa === 'function' ? btoa(binary) : '';
    return base64 ? `data:${blob.type || 'application/octet-stream'};base64,${base64}` : '';
  });
}

async function canvasToDataUrl(canvas: AutoCreateCanvas): Promise<string> {
  if ('toDataURL' in canvas && typeof canvas.toDataURL === 'function') {
    return canvas.toDataURL('image/png');
  }

  const offscreen = canvas as OffscreenCanvas & { convertToBlob?: (options?: { type?: string; quality?: number }) => Promise<Blob> };
  if (typeof offscreen.convertToBlob === 'function') {
    const blob = await offscreen.convertToBlob({ type: 'image/png' });
    return blobToDataUrl(blob);
  }

  return '';
}

function get2d(canvas: AutoCreateCanvas): AutoCreateCanvas2D {
  const context = canvas.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings);
  if (!context) throw new Error('Canvas 2D context is not available.');
  return context as AutoCreateCanvas2D;
}

function imagePixelWidth(image: AutoCreateImage): number {
  return Math.max(1, Math.round(('naturalWidth' in image ? image.naturalWidth : image.width) || image.width || 1));
}

function imagePixelHeight(image: AutoCreateImage): number {
  return Math.max(1, Math.round(('naturalHeight' in image ? image.naturalHeight : image.height) || image.height || 1));
}

const imageCache = new Map<string, Promise<AutoCreateImage>>();

async function loadImageBitmapFromUrl(src: string): Promise<ImageBitmap> {
  if (typeof fetch === 'undefined' || typeof createImageBitmap === 'undefined') {
    throw new Error('ImageBitmap loading is not available in this browser context.');
  }
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to fetch image: ${src}`);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function loadImage(src: string): Promise<AutoCreateImage> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const request =
    typeof Image !== 'undefined'
      ? loadImageElement(src)
      : loadImageBitmapFromUrl(src);
  imageCache.set(src, request);
  return request;
}

async function loadImageFromFile(file: File): Promise<AutoCreateImage> {
  if (typeof createImageBitmap !== 'undefined' && typeof document === 'undefined') {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
    imageCache.delete(url);
  }
}

function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== 'undefined') {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function makeAbortError(): DOMException {
  return new DOMException('AutoCreateTwrole was aborted.', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw makeAbortError();
  }
}

class SeededRandom {
  private state: number;
  private spareNormal: number | null = null;

  constructor(seed: number) {
    const normalized = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : Date.now();
    this.state = normalized >>> 0;
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }

  integer(minInclusive: number, maxExclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.max(min + 1, Math.floor(maxExclusive));
    return min + Math.floor(this.next() * (max - min));
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  normal(mean = 0, std = 1): number {
    if (this.spareNormal != null) {
      const value = this.spareNormal;
      this.spareNormal = null;
      return mean + value * std;
    }
    const u = Math.max(1.0e-12, this.next());
    const v = Math.max(1.0e-12, this.next());
    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v);
    const z1 = mag * Math.sin(2 * Math.PI * v);
    this.spareNormal = z1;
    return mean + z0 * std;
  }

  choice<T>(items: readonly T[]): T {
    return items[this.integer(0, items.length)];
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = this.integer(0, i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  snapshot(): { state: number; spareNormal: number | null } {
    return { state: this.state, spareNormal: this.spareNormal };
  }

  restore(state: number, spareNormal: number | null): void {
    const normalized = Number.isFinite(state) ? Math.floor(state) >>> 0 : 0x9e3779b9;
    this.state = normalized === 0 ? 0x9e3779b9 : normalized;
    this.spareNormal = Number.isFinite(spareNormal) ? spareNormal : null;
  }

  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const weight of weights) total += Math.max(0, weight);
    if (!(total > 0)) return this.integer(0, weights.length);
    const pick = this.next() * total;
    let cumulative = 0;
    for (let index = 0; index < weights.length; index += 1) {
      cumulative += Math.max(0, weights[index]);
      if (pick <= cumulative) return index;
    }
    return weights.length - 1;
  }
}

function bboxIntersects(a: BBox, b: BBox): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function bboxClip(bbox: BBox, width: number, height: number): BBox | null {
  const left = clamp(Math.trunc(bbox[0]), 0, width);
  const top = clamp(Math.trunc(bbox[1]), 0, height);
  const right = clamp(Math.trunc(bbox[2]), 0, width);
  const bottom = clamp(Math.trunc(bbox[3]), 0, height);
  if (right <= left || bottom <= top) return null;
  return [left, top, right, bottom];
}

function pixelOffset(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

function premultiply(data: Uint8ClampedArray): Float32Array {
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

function premultToStraightImageData(premult: Float32Array, width: number, height: number): ImageData {
  const out = new Uint8ClampedArray(premult.length);
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
  return new ImageData(out, width, height);
}

async function loadTargetImage(file: File, settings: AutoCreateTwroleSettings): Promise<TargetImageData> {
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
  let maskCount = 0;

  for (let pixel = 0, index = 0; pixel < mask.length; pixel += 1, index += 4) {
    if (straight[index + 3] > settings.alphaThresh) {
      mask[pixel] = 1;
      maskCount += 1;
    }
  }

  if (maskCount === 0) {
    mask.fill(1);
    maskCount = mask.length;
    for (let index = 3; index < premult.length; index += 4) {
      premult[index] = 255;
    }
  }

  return { width, height, sourceWidth, sourceHeight, straight, premult, mask, maskCount };
}

interface SourceVisualSize {
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
}

function visualSizeForOption(option: PartOption, image: AutoCreateImage): SourceVisualSize {
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

function localCenterOffsetForOption(option: PartOption, size: SourceVisualSize): { x: number; y: number } {
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

async function optionToSourceTile(option: PartOption, idx: number, settings: AutoCreateTwroleSettings): Promise<SourceTile | null> {
  const atlas = option.atlas;
  const image = await loadImage(atlas?.texture ?? option.icon);
  const size = visualSizeForOption(option, image);
  const localCenter = localCenterOffsetForOption(option, size);
  const maxFrameSide = Math.max(size.frameWidth, size.frameHeight);
  const thumbScale = Math.min(1, Math.max(1, settings.maxTileSize) / Math.max(1, maxFrameSide));
  const thumbW = Math.max(1, Math.round(size.frameWidth * thumbScale));
  const thumbH = Math.max(1, Math.round(size.frameHeight * thumbScale));
  const canvas = createCanvas(thumbW, thumbH);
  const context = get2d(canvas);
  context.clearRect(0, 0, thumbW, thumbH);

  if (atlas) {
    context.drawImage(image as CanvasImageSource, atlas.x, atlas.y, atlas.width, atlas.height, 0, 0, thumbW, thumbH);
  } else {
    context.drawImage(image as CanvasImageSource, 0, 0, thumbW, thumbH);
  }

  const data = context.getImageData(0, 0, thumbW, thumbH).data;
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
    canvas,
    origW: size.width,
    origH: size.height,
    thumbW,
    thumbH,
    sFactor: Math.max(1.0e-9, thumbW / Math.max(1, size.width)),
    localCenterX: localCenter.x,
    localCenterY: localCenter.y,
    meanRgb,
    stdRgb,
    alphaRatio: visibleCount / Math.max(1, thumbW * thumbH),
    alphaSum
  };
}

async function loadSourceTiles(
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

class ErrorField {
  readonly cell: number;
  readonly gw: number;
  readonly gh: number;
  readonly errorMap: Float32Array;
  readonly cellW: Float64Array;
  readonly cellColor: Float32Array;
  readonly cellMaskCount: Int32Array;

  constructor(
    private readonly canvas: Float32Array,
    private readonly target: Float32Array,
    private readonly targetStraight: Uint8ClampedArray,
    private readonly mask: Uint8Array,
    private readonly width: number,
    private readonly height: number,
    cellSize: number
  ) {
    this.cell = Math.max(4, Math.round(cellSize));
    this.gw = Math.ceil(width / this.cell);
    this.gh = Math.ceil(height / this.cell);
    this.errorMap = new Float32Array(width * height);
    this.cellW = new Float64Array(this.gw * this.gh);
    this.cellColor = new Float32Array(this.gw * this.gh * 3);
    this.cellMaskCount = new Int32Array(this.gw * this.gh);
    this.buildStaticCellColor();
    this.recomputeAll();
  }

  private cellIndex(cy: number, cx: number): number {
    return cy * this.gw + cx;
  }

  private cellBounds(cy: number, cx: number): BBox {
    const left = cx * this.cell;
    const top = cy * this.cell;
    return [left, top, Math.min(this.width, left + this.cell), Math.min(this.height, top + this.cell)];
  }

  private buildStaticCellColor(): void {
    for (let cy = 0; cy < this.gh; cy += 1) {
      for (let cx = 0; cx < this.gw; cx += 1) {
        const [left, top, right, bottom] = this.cellBounds(cy, cx);
        let count = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let y = top; y < bottom; y += 1) {
          for (let x = left; x < right; x += 1) {
            const pixel = y * this.width + x;
            if (!this.mask[pixel]) continue;
            const offset = pixel * 4;
            r += this.targetStraight[offset];
            g += this.targetStraight[offset + 1];
            b += this.targetStraight[offset + 2];
            count += 1;
          }
        }
        const cell = this.cellIndex(cy, cx);
        this.cellMaskCount[cell] = count;
        if (count > 0) {
          const base = cell * 3;
          this.cellColor[base] = r / count;
          this.cellColor[base + 1] = g / count;
          this.cellColor[base + 2] = b / count;
        }
      }
    }
  }

  private pixelError(x: number, y: number): number {
    const pixel = y * this.width + x;
    if (!this.mask[pixel]) return 0;
    const offset = pixel * 4;
    const dr = this.canvas[offset] - this.target[offset];
    const dg = this.canvas[offset + 1] - this.target[offset + 1];
    const db = this.canvas[offset + 2] - this.target[offset + 2];
    const da = this.canvas[offset + 3] - this.target[offset + 3];
    return dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;
  }

  recomputeAll(): void {
    this.cellW.fill(0);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const pixel = y * this.width + x;
        const err = this.pixelError(x, y);
        this.errorMap[pixel] = err;
        const cx = Math.floor(x / this.cell);
        const cy = Math.floor(y / this.cell);
        this.cellW[this.cellIndex(cy, cx)] += err;
      }
    }
  }

  updateBBox(bbox: BBox): void {
    const clipped = bboxClip(bbox, this.width, this.height);
    if (!clipped) return;
    const [left, top, right, bottom] = clipped;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const pixel = y * this.width + x;
        this.errorMap[pixel] = this.pixelError(x, y);
      }
    }
    const cx0 = Math.max(0, Math.floor(left / this.cell));
    const cx1 = Math.min(this.gw - 1, Math.floor((right - 1) / this.cell));
    const cy0 = Math.max(0, Math.floor(top / this.cell));
    const cy1 = Math.min(this.gh - 1, Math.floor((bottom - 1) / this.cell));
    for (let cy = cy0; cy <= cy1; cy += 1) {
      for (let cx = cx0; cx <= cx1; cx += 1) {
        const [cl, ct, cr, cb] = this.cellBounds(cy, cx);
        let sum = 0;
        for (let y = ct; y < cb; y += 1) {
          for (let x = cl; x < cr; x += 1) {
            sum += this.errorMap[y * this.width + x];
          }
        }
        this.cellW[this.cellIndex(cy, cx)] = sum;
      }
    }
  }

  get totalSse(): number {
    let total = 0;
    for (const value of this.cellW) total += value;
    return total;
  }

  chooseFocus(rng: SeededRandom): { x: number; y: number; color: Vec3; cell: [number, number] } {
    let total = 0;
    for (const value of this.cellW) total += Math.max(0, value);

    if (!(total > 1.0e-9) || !Number.isFinite(total)) {
      return this.randomMaskedPixel(rng);
    }

    let pick = rng.next() * total;
    let cellIndex = 0;
    for (; cellIndex < this.cellW.length; cellIndex += 1) {
      pick -= Math.max(0, this.cellW[cellIndex]);
      if (pick <= 0) break;
    }
    cellIndex = clamp(cellIndex, 0, this.cellW.length - 1);
    const cy = Math.floor(cellIndex / this.gw);
    const cx = cellIndex % this.gw;
    const [left, top, right, bottom] = this.cellBounds(cy, cx);
    const candidates: number[] = [];

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const pixel = y * this.width + x;
        if (this.mask[pixel]) candidates.push(pixel);
      }
    }

    const pixel = candidates.length ? candidates[rng.integer(0, candidates.length)] : top * this.width + left;
    const x = pixel % this.width;
    const y = Math.floor(pixel / this.width);
    const colorBase = cellIndex * 3;
    const fallbackOffset = pixel * 4;
    const color: Vec3 = this.cellMaskCount[cellIndex] > 0
      ? [this.cellColor[colorBase], this.cellColor[colorBase + 1], this.cellColor[colorBase + 2]]
      : [this.targetStraight[fallbackOffset], this.targetStraight[fallbackOffset + 1], this.targetStraight[fallbackOffset + 2]];
    return { x, y, color, cell: [cy, cx] };
  }

  private randomMaskedPixel(rng: SeededRandom): { x: number; y: number; color: Vec3; cell: [number, number] } {
    for (let attempt = 0; attempt < 2000; attempt += 1) {
      const x = rng.integer(0, this.width);
      const y = rng.integer(0, this.height);
      const pixel = y * this.width + x;
      if (!this.mask[pixel]) continue;
      const cx = Math.min(this.gw - 1, Math.floor(x / this.cell));
      const cy = Math.min(this.gh - 1, Math.floor(y / this.cell));
      const offset = pixel * 4;
      return {
        x,
        y,
        color: [this.targetStraight[offset], this.targetStraight[offset + 1], this.targetStraight[offset + 2]],
        cell: [cy, cx]
      };
    }
    return { x: 0, y: 0, color: [128, 128, 128], cell: [0, 0] };
  }
}

class ExperienceMemory {
  private payload: MemoryPayload;

  constructor(
    private readonly key: string,
    sources: readonly SourceTile[],
    reset: boolean
  ) {
    this.payload = { version: MEMORY_VERSION, source_stats: {}, color_stats: {} };
    if (!reset) this.load();
    for (const source of sources) {
      this.payload.source_stats[source.code] ??= { trials: 0, accepted: 0, gain_sum: 0, ema_gain: 0 };
    }
  }

  private load(): void {
    if (!this.key) return;
    try {
      const raw = getLocalStorage()?.getItem(this.key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MemoryPayload;
      if (!parsed || typeof parsed !== 'object') return;
      this.payload = {
        version: Number(parsed.version) || MEMORY_VERSION,
        updated_at: parsed.updated_at,
        source_stats: parsed.source_stats ?? {},
        color_stats: parsed.color_stats ?? {}
      };
    } catch {
      this.payload = { version: MEMORY_VERSION, source_stats: {}, color_stats: {} };
    }
  }

  save(): void {
    if (!this.key) return;
    try {
      const next: MemoryPayload = { ...this.payload, updated_at: Math.floor(Date.now() / 1000) };
      getLocalStorage()?.setItem(this.key, JSON.stringify(next));
    } catch {
      // localStorage can be unavailable in private mode. The generator still works without memory.
    }
  }

  private colorBin(color: Vec3): string {
    return color.map((value) => clamp(Math.floor(clamp(value, 0, 255) / 16), 0, 15)).join(',');
  }

  private colorKey(sourceName: string, color: Vec3): string {
    return `${sourceName}|${this.colorBin(color)}`;
  }

  noteTrial(sourceName: string, color: Vec3, accepted: boolean, gainMse: number): void {
    const sourceStat = this.payload.source_stats[sourceName] ?? { trials: 0, accepted: 0, gain_sum: 0, ema_gain: 0 };
    sourceStat.trials += 1;
    if (accepted) sourceStat.accepted += 1;
    sourceStat.gain_sum += gainMse;
    sourceStat.ema_gain = sourceStat.ema_gain * 0.92 + gainMse * 0.08;
    this.payload.source_stats[sourceName] = sourceStat;

    const key = this.colorKey(sourceName, color);
    const colorStat = this.payload.color_stats[key] ?? { trials: 0, accepted: 0, gain_sum: 0, ema_gain: 0 };
    colorStat.trials += 1;
    if (accepted) colorStat.accepted += 1;
    colorStat.gain_sum += gainMse;
    colorStat.ema_gain = colorStat.ema_gain * 0.9 + gainMse * 0.1;
    this.payload.color_stats[key] = colorStat;
  }

  private statBonus(stat: MemoryStat | undefined): number {
    if (!stat || stat.trials <= 0) return 1;
    const trials = Math.max(1, stat.trials);
    const acceptRate = Math.max(0, stat.accepted) / trials;
    const avgGain = stat.gain_sum / trials;
    const gainBonus = Math.tanh(clamp(avgGain + stat.ema_gain, -0.01, 0.01) * 150);
    return clamp(1 + 0.55 * acceptRate + 0.65 * gainBonus, 0.35, 2.75);
  }

  sourceMultiplier(sourceName: string, targetColor: Vec3): number {
    const globalBonus = this.statBonus(this.payload.source_stats[sourceName]);
    const colorBonus = this.statBonus(this.payload.color_stats[this.colorKey(sourceName, targetColor)]);
    return globalBonus * colorBonus;
  }
}

class VariantCache {
  private readonly cache = new Map<string, TransformedImage>();

  constructor(private readonly maxItems: number) {}

  private quantize(value: number, step: number): number {
    return Math.round(value / step);
  }

  private key(sourceId: number, sxInternal: number, syInternal: number, rDeg: number): string {
    return [
      sourceId,
      this.quantize(sxInternal, 0.0025),
      this.quantize(syInternal, 0.0025),
      this.quantize(rDeg, 0.25)
    ].join('|');
  }

  get(source: SourceTile, sxInternal: number, syInternal: number, rDeg: number): TransformedImage {
    const key = this.key(source.idx, sxInternal, syInternal, rDeg);
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }

    const transformed = transformSource(source, sxInternal, syInternal, rDeg);
    this.cache.set(key, transformed);
    while (this.cache.size > Math.max(16, this.maxItems)) {
      const first = this.cache.keys().next().value as string | undefined;
      if (first == null) break;
      this.cache.delete(first);
    }
    return transformed;
  }
}

function transformSource(source: SourceTile, sxInternal: number, syInternal: number, rDeg: number): TransformedImage {
  const scaleX = Math.max(1.0e-6, Math.abs(sxInternal));
  const scaleY = Math.max(1.0e-6, Math.abs(syInternal));
  const newW = Math.max(1, Math.round(source.thumbW * scaleX));
  const newH = Math.max(1, Math.round(source.thumbH * scaleY));
  const resized = createCanvas(newW, newH);
  const resizeContext = get2d(resized);
  resizeContext.save();
  resizeContext.translate(sxInternal < 0 ? newW : 0, syInternal < 0 ? newH : 0);
  resizeContext.scale(sxInternal < 0 ? -1 : 1, syInternal < 0 ? -1 : 1);
  resizeContext.drawImage(source.canvas as CanvasImageSource, 0, 0, source.thumbW, source.thumbH, 0, 0, newW, newH);
  resizeContext.restore();

  let finalCanvas = resized;
  if (Math.abs(rDeg) > 1.0e-9) {
    const rad = (rDeg * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const rotW = Math.max(1, Math.ceil(newW * cos + newH * sin));
    const rotH = Math.max(1, Math.ceil(newW * sin + newH * cos));
    finalCanvas = createCanvas(rotW, rotH);
    const rotateContext = get2d(finalCanvas);
    rotateContext.translate(rotW / 2, rotH / 2);
    rotateContext.rotate(rad);
    rotateContext.drawImage(resized as CanvasImageSource, -newW / 2, -newH / 2);
  }

  const context = get2d(finalCanvas);
  const data = context.getImageData(0, 0, finalCanvas.width, finalCanvas.height).data;
  return { width: finalCanvas.width, height: finalCanvas.height, data: new Float32Array(data) };
}

function targetCenterCoords(px: number, py: number, width: number, height: number): { x: number; y: number } {
  return { x: px - width / 2, y: py - height / 2 };
}

function roleExportScaleForTarget(width: number, height: number): number {
  const maxSide = Math.max(1, width, height);
  return Math.min(1, DEFAULT_ROLE_EXPORT_MAX_SIDE / maxSide);
}

function rolePositionForVisualCenter(
  source: SourceTile,
  desiredX: number,
  desiredY: number,
  scaleX: number,
  scaleY: number,
  rDeg: number
): { x: number; y: number } {
  const rad = (rDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const offsetX = source.localCenterX * scaleX;
  const offsetY = source.localCenterY * scaleY;
  return {
    x: desiredX - (offsetX * cos - offsetY * sin),
    y: desiredY - (offsetX * sin + offsetY * cos)
  };
}

function buildDecoDraft(source: SourceTile, centerX: number, centerY: number, sxInternal: number, syInternal: number, rDeg: number, width: number, height: number): DecoDraft {
  const roleScale = roleExportScaleForTarget(width, height);
  const rawScaleX = sxInternal * source.sFactor * roleScale;
  const rawScaleY = syInternal * source.sFactor * roleScale;
  const scaleX = round(rawScaleX, 4);
  const scaleY = round(rawScaleY, 4);
  const desired = targetCenterCoords(centerX, centerY, width, height);
  const desiredRoleX = desired.x * roleScale;
  const desiredRoleY = desired.y * roleScale;
  const { x, y } = rolePositionForVisualCenter(source, desiredRoleX, desiredRoleY, rawScaleX, rawScaleY, rDeg);
  const roleX = round(x, 2);
  const roleY = round(y, 2);
  const rotation = round(rDeg, 3);
  return {
    code: source.code,
    assetId: source.assetId,
    name: source.label,
    x: roleX,
    y: roleY,
    scaleX,
    scaleY,
    rotation,
    legacy: {
      c: source.code,
      x: roleX,
      y: roleY,
      sx: scaleX,
      sy: scaleY,
      r: round((rDeg * Math.PI) / 180, 6)
    }
  };
}

function decorationFromDraft(draft: DecoDraft): DecorationLayer {
  return {
    id: createId('deco'),
    code: draft.code,
    assetId: draft.assetId,
    name: draft.name,
    x: draft.x,
    y: draft.y,
    scaleX: draft.scaleX,
    scaleY: draft.scaleY,
    rotation: draft.rotation,
    visible: true,
    opacity: 1
  };
}

function sourceChoiceScores(sources: readonly SourceTile[], targetColor: Vec3, memory: ExperienceMemory, settings: AutoCreateTwroleSettings, targetStd?: Vec3): number[] {
  const sigmaDen = Math.max(1, 2 * settings.colorSigma * settings.colorSigma);
  const stdDen = Math.max(1, 2 * settings.gradientStdSigma * settings.gradientStdSigma);
  const complexity = targetStd ? Math.hypot(targetStd[0], targetStd[1], targetStd[2]) : 0;
  const mix = clamp(complexity / Math.max(1, DEFAULT_GRADIENT_COMPLEXITY_THRESHOLD * 3), 0, 1);
  const stdWeight = clamp(settings.gradientStdWeight * mix, 0, 1);

  return sources.map((source) => {
    const dr = source.meanRgb[0] - targetColor[0];
    const dg = source.meanRgb[1] - targetColor[1];
    const db = source.meanRgb[2] - targetColor[2];
    let base = Math.exp(-(dr * dr + dg * dg + db * db) / sigmaDen);

    if (targetStd && stdWeight > 0) {
      const sr = source.stdRgb[0] - targetStd[0];
      const sg = source.stdRgb[1] - targetStd[1];
      const sb = source.stdRgb[2] - targetStd[2];
      const stdScore = Math.exp(-(sr * sr + sg * sg + sb * sb) / stdDen);
      base *= (1 - stdWeight) + stdWeight * stdScore;
    }

    const alphaBonus = 0.7 + 0.6 * Math.min(1, source.alphaRatio * 2);
    const memoryBonus = memory.sourceMultiplier(source.code, targetColor);
    return Math.max(1.0e-9, base * alphaBonus * memoryBonus);
  });
}

function chooseSourceIds(sources: readonly SourceTile[], targetColor: Vec3, memory: ExperienceMemory, rng: SeededRandom, settings: AutoCreateTwroleSettings, targetStd?: Vec3, topkOverride?: number, explorationOverride?: number): number[] {
  const n = sources.length;
  if (n <= 0) return [];
  const topk = clamp(Math.round(topkOverride ?? settings.colorTopk), 1, n);
  const exploration = explorationOverride ?? settings.exploration;

  if (rng.next() < exploration) {
    return rng.shuffle(Array.from({ length: n }, (_, index) => index)).slice(0, topk);
  }

  const scores = sourceChoiceScores(sources, targetColor, memory, settings, targetStd);
  return scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topk)
    .map((item) => item.index);
}

function autoMaxRenderedPx(width: number, height: number): number {
  return Math.max(32, Math.min(160, Math.round(Math.min(width, height) * 0.18)));
}

function proposeCandidate(
  sources: readonly SourceTile[],
  sourceId: number,
  centerX: number,
  centerY: number,
  targetWidth: number,
  targetHeight: number,
  progress: number,
  rng: SeededRandom,
  cache: VariantCache,
  settings: AutoCreateTwroleSettings,
  options: {
    desiredPx?: number;
    maxRenderedPx?: number;
    rotationProb?: number;
    flipProb?: number;
    centerJitterPx?: number;
  } = {}
): Candidate | null {
  const source = sources[sourceId];
  const maxPx = options.maxRenderedPx && options.maxRenderedPx > 0 ? options.maxRenderedPx : autoMaxRenderedPx(targetWidth, targetHeight);
  const minPx = Math.max(2, Math.round(settings.minRenderedPx));
  let sizePx: number;

  if (options.desiredPx == null) {
    const minDim = Math.max(1, Math.min(targetWidth, targetHeight));
    const early = Math.min(maxPx, Math.max(18, minDim * 0.13));
    const late = Math.max(minPx, Math.min(24, minDim * 0.035));
    const base = early * (1 - progress) ** 0.75 + late * progress ** 0.75;
    sizePx = base * Math.exp(rng.normal(0, 0.5));
  } else {
    sizePx = options.desiredPx * Math.exp(rng.normal(0, 0.22));
  }

  sizePx = clamp(sizePx, minPx, maxPx);
  const maxOrig = Math.max(1, source.origW, source.origH);
  let finalScale = sizePx / maxOrig;
  finalScale = clamp(finalScale, minPx / maxOrig, 2);

  const flipProb = options.flipProb ?? settings.flipProb;
  const sxSign = rng.next() < flipProb ? -1 : 1;
  const sySign = rng.next() < flipProb ? -1 : 1;
  const aspectJitter = Math.exp(rng.normal(0, 0.06));
  const finalSx = sxSign * finalScale;
  const finalSy = sySign * finalScale * aspectJitter;
  const sxInternal = finalSx / source.sFactor;
  const syInternal = finalSy / source.sFactor;

  let rDeg = 0;
  const rotationProb = options.rotationProb ?? settings.rotationProb;
  if (rng.next() < rotationProb && sizePx >= Math.max(8, settings.minRenderedPx * 2)) {
    if (rng.next() < 0.65) {
      rDeg = rng.choice([0, 15, -15, 30, -30, 45, -45, 60, -60, 90, -90, 135, -135, 180]);
    } else {
      rDeg = rng.uniform(-180, 180);
    }
  }

  const jitter = Math.max(0, options.centerJitterPx ?? 0);
  if (jitter > 0) {
    centerX = Math.round(centerX + rng.normal(0, jitter));
    centerY = Math.round(centerY + rng.normal(0, jitter));
  }
  centerX = clamp(centerX, 0, Math.max(0, targetWidth - 1));
  centerY = clamp(centerY, 0, Math.max(0, targetHeight - 1));

  const rgba = cache.get(source, sxInternal, syInternal, rDeg);
  if (rgba.width <= 0 || rgba.height <= 0) return null;
  if (rgba.width > targetWidth * 1.5 || rgba.height > targetHeight * 1.5) return null;

  const left = Math.round(centerX - rgba.width / 2);
  const top = Math.round(centerY - rgba.height / 2);
  const right = left + rgba.width;
  const bottom = top + rgba.height;
  if (left < 0 || top < 0 || right > targetWidth || bottom > targetHeight) return null;

  return {
    sourceId: source.idx,
    sxInternal,
    syInternal,
    rDeg,
    centerX,
    centerY,
    rgba,
    bbox: [left, top, right, bottom],
    draft: buildDecoDraft(source, centerX, centerY, sxInternal, syInternal, rDeg, targetWidth, targetHeight),
    sseBefore: 0,
    sseAfter: 0,
    globalGainMse: -1.0e30,
    score: -1.0e30
  };
}

class ColorLearningCollage {
  private readonly canvas: Float32Array;
  private readonly errors: ErrorField;
  private readonly cache: VariantCache;
  private readonly memory: ExperienceMemory;
  private readonly tiles: TileRecord[] = [];
  private readonly globalDen: number;

  accepted = 0;
  rejected = 0;
  pruned = 0;
  replaced = 0;

  constructor(
    private readonly sources: SourceTile[],
    private readonly targetStraight: Uint8ClampedArray,
    private readonly targetPremult: Float32Array,
    private readonly mask: Uint8Array,
    private readonly width: number,
    private readonly height: number,
    private readonly rng: SeededRandom,
    private readonly settings: AutoCreateTwroleSettings
  ) {
    this.canvas = new Float32Array(width * height * 4);
    const maskCount = Math.max(1, mask.reduce((sum, value) => sum + (value ? 1 : 0), 0));
    this.globalDen = maskCount * (3 + ALPHA_MSE_WEIGHT);
    this.errors = new ErrorField(this.canvas, targetPremult, targetStraight, mask, width, height, settings.errorCellSize);
    this.cache = new VariantCache(settings.variantCacheItems);
    const experienceName = settings.experienceJson || DEFAULT_MEMORY_NAME;
    this.memory = new ExperienceMemory(`${AUTO_CREATE_EXPERIENCE_STORAGE_PREFIX}${experienceName}`, sources, settings.resetExperience);
  }

  currentMse(): number {
    return this.errors.totalSse / Math.max(1, this.globalDen);
  }

  activeCount(): number {
    return this.tiles.reduce((sum, tile) => sum + (tile.active ? 1 : 0), 0);
  }

  restoreFromSnapshot(snapshot: AutoCreateTwroleSnapshot): void {
    const restored: TileRecord[] = [];

    for (const tile of snapshot.tiles) {
      if (!tile.active) continue;
      const source = this.sources[tile.sourceId];
      if (!source) continue;

      const rgba = this.cache.get(source, tile.sxInternal, tile.syInternal, tile.rDeg);
      const left = Math.round(tile.centerX - rgba.width / 2);
      const top = Math.round(tile.centerY - rgba.height / 2);
      const right = left + rgba.width;
      const bottom = top + rgba.height;
      const bbox = bboxClip([left, top, right, bottom], this.width, this.height);
      if (!bbox || bbox[0] !== left || bbox[1] !== top || bbox[2] !== right || bbox[3] !== bottom) continue;

      restored.push({
        active: true,
        sourceId: tile.sourceId,
        sxInternal: tile.sxInternal,
        syInternal: tile.syInternal,
        rDeg: tile.rDeg,
        bbox,
        centerX: tile.centerX,
        centerY: tile.centerY,
        decoration: { ...tile.decoration },
        legacy: { ...tile.legacy },
        gainMse: tile.gainMse
      });
    }

    this.tiles.splice(0, this.tiles.length, ...restored);
    this.accepted = Math.max(snapshot.accepted, restored.length);
    this.rejected = Math.max(0, Math.round(snapshot.rejected));
    this.pruned = Math.max(0, Math.round(snapshot.pruned));
    this.replaced = Math.max(0, Math.round(snapshot.replaced));

    this.canvas.fill(0);
    for (const tile of this.tiles) {
      this.alphaOverFull(tile.bbox, this.tileRgba(tile));
    }
    this.errors.recomputeAll();
  }

  createSnapshot(
    step: number,
    totalSteps: number,
    seed: number,
    target: Pick<TargetImageData, 'width' | 'height' | 'sourceWidth' | 'sourceHeight'>,
    warnings: string[]
  ): AutoCreateTwroleSnapshot {
    const rng = this.rng.snapshot();
    return {
      version: AUTO_CREATE_SNAPSHOT_VERSION,
      targetWidth: target.width,
      targetHeight: target.height,
      sourceWidth: target.sourceWidth,
      sourceHeight: target.sourceHeight,
      sourceCount: this.sources.length,
      sourceSignature: this.sources.map((source) => source.assetId + ':' + source.code).join('|'),
      step: Math.max(0, Math.round(step)),
      totalSteps: Math.max(1, Math.round(totalSteps)),
      seed,
      rngState: rng.state,
      rngSpareNormal: rng.spareNormal,
      accepted: this.accepted,
      rejected: this.rejected,
      pruned: this.pruned,
      replaced: this.replaced,
      mse: this.currentMse(),
      tiles: this.tiles
        .filter((tile) => tile.active)
        .map((tile) => ({
          active: true,
          sourceId: tile.sourceId,
          sxInternal: tile.sxInternal,
          syInternal: tile.syInternal,
          rDeg: tile.rDeg,
          centerX: tile.centerX,
          centerY: tile.centerY,
          bbox: [...tile.bbox] as [number, number, number, number],
          decoration: { ...tile.decoration },
          legacy: { ...tile.legacy },
          gainMse: tile.gainMse
        })),
      warnings: [...warnings]
    };
  }

  exportDecorations(): DecorationLayer[] {
    // Python export_deco() is in render order: first accepted = bottom,
    // last accepted = top. role-editor-react-rebuild stores RoleDocument
    // decorations in top-first order and reverses them when drawing/exporting.
    // Reverse only the in-memory DecorationLayer[] used for insertion; keep
    // exportLegacyDeco() in Python's original bottom-to-top order.
    return this.tiles
      .filter((tile) => tile.active)
      .slice()
      .reverse()
      .map((tile) => tile.decoration);
  }

  exportLegacyDeco(): AutoCreateTwroleLegacyDecoEntry[] {
    return this.tiles.filter((tile) => tile.active).map((tile) => tile.legacy);
  }

  saveMemory(): void {
    this.memory.save();
  }

  async previewDataUrl(): Promise<string> {
    const imageData = premultToStraightImageData(this.canvas, this.width, this.height);
    const canvas = createCanvas(this.width, this.height);
    get2d(canvas).putImageData(imageData, 0, 0);
    return canvasToDataUrl(canvas);
  }

  private evaluateCandidate(candidate: Candidate): Candidate | null {
    const [left, top, right, bottom] = candidate.bbox;
    if (left < 0 || top < 0 || right > this.width || bottom > this.height) return null;
    if (candidate.rgba.width !== right - left || candidate.rgba.height !== bottom - top) return null;

    let beforeSse = 0;
    let afterSse = 0;
    let alphaSum = 0;
    let outsideAlpha = 0;
    let hasMask = false;

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const srcOffset = pixelOffset(candidate.rgba.width, x - left, y - top);
        const srcA = candidate.rgba.data[srcOffset + 3] / 255;
        alphaSum += srcA;
        const pixel = y * this.width + x;
        const insideMask = this.mask[pixel] !== 0;
        if (!insideMask) {
          outsideAlpha += srcA;
          continue;
        }
        hasMask = true;
        const offset = pixel * 4;
        const beforeR = this.canvas[offset];
        const beforeG = this.canvas[offset + 1];
        const beforeB = this.canvas[offset + 2];
        const beforeA = this.canvas[offset + 3];
        const dr = beforeR - this.targetPremult[offset];
        const dg = beforeG - this.targetPremult[offset + 1];
        const db = beforeB - this.targetPremult[offset + 2];
        const da = beforeA - this.targetPremult[offset + 3];
        beforeSse += dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;

        const inv = 1 - srcA;
        const afterR = candidate.rgba.data[srcOffset] * srcA + beforeR * inv;
        const afterG = candidate.rgba.data[srcOffset + 1] * srcA + beforeG * inv;
        const afterB = candidate.rgba.data[srcOffset + 2] * srcA + beforeB * inv;
        const beforeAf = beforeA / 255;
        const afterA = (srcA + beforeAf * inv) * 255;
        const ar = afterR - this.targetPremult[offset];
        const ag = afterG - this.targetPremult[offset + 1];
        const ab = afterB - this.targetPremult[offset + 2];
        const aa = afterA - this.targetPremult[offset + 3];
        afterSse += ar * ar + ag * ag + ab * ab + ALPHA_MSE_WEIGHT * aa * aa;
      }
    }

    if (!hasMask || alphaSum <= 1.0e-6) return null;
    if (outsideAlpha / Math.max(1.0e-9, alphaSum) > this.settings.maxOutsideAlphaRatio) return null;

    candidate.sseBefore = beforeSse;
    candidate.sseAfter = afterSse;
    candidate.globalGainMse = (beforeSse - afterSse) / Math.max(1, this.globalDen);
    candidate.score = candidate.globalGainMse - this.settings.tilePenaltyMse;
    return candidate;
  }

  private localTargetStats(x: number, y: number, radius: number): { mean: Vec3; std: Vec3; complexity: number } {
    const rad = Math.max(1, Math.round(radius));
    const left = Math.max(0, x - rad);
    const right = Math.min(this.width, x + rad + 1);
    const top = Math.max(0, y - rad);
    const bottom = Math.min(this.height, y + rad + 1);
    let weightSum = 0;
    let r = 0;
    let g = 0;
    let b = 0;

    for (let yy = top; yy < bottom; yy += 1) {
      for (let xx = left; xx < right; xx += 1) {
        const pixel = yy * this.width + xx;
        if (!this.mask[pixel]) continue;
        const offset = pixel * 4;
        const weight = Math.max(this.targetStraight[offset + 3] / 255, 1.0e-3);
        weightSum += weight;
        r += this.targetStraight[offset] * weight;
        g += this.targetStraight[offset + 1] * weight;
        b += this.targetStraight[offset + 2] * weight;
      }
    }

    if (weightSum <= 1.0e-6) {
      const offset = pixelOffset(this.width, clamp(x, 0, this.width - 1), clamp(y, 0, this.height - 1));
      return { mean: [this.targetStraight[offset], this.targetStraight[offset + 1], this.targetStraight[offset + 2]], std: [0, 0, 0], complexity: 0 };
    }

    const mean: Vec3 = [r / weightSum, g / weightSum, b / weightSum];
    let vr = 0;
    let vg = 0;
    let vb = 0;
    for (let yy = top; yy < bottom; yy += 1) {
      for (let xx = left; xx < right; xx += 1) {
        const pixel = yy * this.width + xx;
        if (!this.mask[pixel]) continue;
        const offset = pixel * 4;
        const weight = Math.max(this.targetStraight[offset + 3] / 255, 1.0e-3);
        const dr = this.targetStraight[offset] - mean[0];
        const dg = this.targetStraight[offset + 1] - mean[1];
        const db = this.targetStraight[offset + 2] - mean[2];
        vr += dr * dr * weight;
        vg += dg * dg * weight;
        vb += db * db * weight;
      }
    }

    const std: Vec3 = [Math.sqrt(vr / weightSum), Math.sqrt(vg / weightSum), Math.sqrt(vb / weightSum)];
    return { mean, std, complexity: Math.hypot(std[0], std[1], std[2]) };
  }

  private focusGradientColor(focusX: number, focusY: number): { color: Vec3; std: Vec3; complexity: number } {
    const stats = this.localTargetStats(focusX, focusY, this.settings.gradientLocalRadius);
    const offset = pixelOffset(this.width, clamp(focusX, 0, this.width - 1), clamp(focusY, 0, this.height - 1));
    const mix = clamp(this.settings.gradientPixelMix, 0, 1);
    return {
      color: [
        this.targetStraight[offset] * mix + stats.mean[0] * (1 - mix),
        this.targetStraight[offset + 1] * mix + stats.mean[1] * (1 - mix),
        this.targetStraight[offset + 2] * mix + stats.mean[2] * (1 - mix)
      ],
      std: stats.std,
      complexity: stats.complexity
    };
  }

  private generateAddCandidates(progress: number): Candidate[] {
    const focus = this.errors.chooseFocus(this.rng);
    const target = this.focusGradientColor(focus.x, focus.y);
    const sourceIds = chooseSourceIds(this.sources, target.color, this.memory, this.rng, this.settings, target.std);
    if (!sourceIds.length) return [];

    const allScores = sourceChoiceScores(this.sources, target.color, this.memory, this.settings, target.std);
    const poolScores = sourceIds.map((sourceId) => Math.max(1.0e-12, allScores[sourceId]));
    const candidates: Candidate[] = [];
    const batch = Math.max(1, Math.round(this.settings.candidateBatch));
    const jitter = Math.max(1, this.settings.errorCellSize * 0.35);
    const isGradient = target.complexity >= this.settings.gradientComplexityThreshold;

    for (let i = 0; i < batch; i += 1) {
      const sourceId = sourceIds[this.rng.weightedIndex(poolScores)];
      let desiredPx: number | undefined;
      let maxRenderedPx = this.settings.maxRenderedPx;
      if (isGradient) {
        desiredPx = Math.max(this.settings.minRenderedPx, this.settings.gradientOriginalMaxPx);
        const autoMax = maxRenderedPx > 0 ? maxRenderedPx : autoMaxRenderedPx(this.width, this.height);
        maxRenderedPx = Math.min(autoMax, this.settings.gradientOriginalMaxPx);
      }

      const candidate = proposeCandidate(this.sources, sourceId, focus.x, focus.y, this.width, this.height, progress, this.rng, this.cache, this.settings, {
        desiredPx,
        maxRenderedPx,
        centerJitterPx: jitter
      });
      if (!candidate) continue;
      const evaluated = this.evaluateCandidate(candidate);
      if (evaluated) candidates.push(evaluated);
    }
    return candidates;
  }

  private alphaOverFull(bbox: BBox, rgba: TransformedImage): void {
    const [left, top, right, bottom] = bbox;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const srcOffset = pixelOffset(rgba.width, x - left, y - top);
        const srcA = rgba.data[srcOffset + 3] / 255;
        if (srcA <= 0) continue;
        const offset = pixelOffset(this.width, x, y);
        const inv = 1 - srcA;
        this.canvas[offset] = rgba.data[srcOffset] * srcA + this.canvas[offset] * inv;
        this.canvas[offset + 1] = rgba.data[srcOffset + 1] * srcA + this.canvas[offset + 1] * inv;
        this.canvas[offset + 2] = rgba.data[srcOffset + 2] * srcA + this.canvas[offset + 2] * inv;
        this.canvas[offset + 3] = (srcA + (this.canvas[offset + 3] / 255) * inv) * 255;
      }
    }
  }

  private recordFromCandidate(candidate: Candidate): TileRecord {
    return {
      active: true,
      sourceId: candidate.sourceId,
      sxInternal: candidate.sxInternal,
      syInternal: candidate.syInternal,
      rDeg: candidate.rDeg,
      bbox: candidate.bbox,
      centerX: candidate.centerX,
      centerY: candidate.centerY,
      decoration: decorationFromDraft(candidate.draft),
      legacy: candidate.draft.legacy,
      gainMse: candidate.globalGainMse
    };
  }

  private acceptCandidate(candidate: Candidate): void {
    this.alphaOverFull(candidate.bbox, candidate.rgba);
    this.errors.updateBBox(candidate.bbox);
    this.tiles.push(this.recordFromCandidate(candidate));
    this.accepted += 1;
    const source = this.sources[candidate.sourceId];
    const color = this.focusGradientColor(candidate.centerX, candidate.centerY).color;
    this.memory.noteTrial(source.code, color, true, candidate.globalGainMse);
  }

  tryAdd(step: number, totalSteps: number): boolean {
    if (this.settings.tileBudget > 0 && this.activeCount() >= this.settings.tileBudget) return false;
    const progress = step / Math.max(1, totalSteps);
    const candidates = this.generateAddCandidates(progress);
    if (!candidates.length) {
      this.rejected += 1;
      return false;
    }
    const best = candidates.reduce((current, candidate) => (candidate.score > current.score ? candidate : current), candidates[0]);
    const targetColor = this.focusGradientColor(best.centerX, best.centerY).color;
    const source = this.sources[best.sourceId];
    if (best.score > 0) {
      this.acceptCandidate(best);
      return true;
    }
    this.memory.noteTrial(source.code, targetColor, false, best.globalGainMse);
    this.rejected += 1;
    return false;
  }

  private activeIndices(): number[] {
    return this.tiles.map((tile, index) => (tile.active ? index : -1)).filter((index) => index >= 0);
  }

  private tileRgba(tile: TileRecord): TransformedImage {
    return this.cache.get(this.sources[tile.sourceId], tile.sxInternal, tile.syInternal, tile.rDeg);
  }

  private alphaOverPatch(
    dst: Float32Array,
    dstWidth: number,
    src: TransformedImage,
    srcX: number,
    srcY: number,
    dstX: number,
    dstY: number,
    width: number,
    height: number
  ): void {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const srcOffset = pixelOffset(src.width, srcX + x, srcY + y);
        const srcA = src.data[srcOffset + 3] / 255;
        if (srcA <= 0) continue;
        const dstOffset = pixelOffset(dstWidth, dstX + x, dstY + y);
        const inv = 1 - srcA;
        dst[dstOffset] = src.data[srcOffset] * srcA + dst[dstOffset] * inv;
        dst[dstOffset + 1] = src.data[srcOffset + 1] * srcA + dst[dstOffset + 1] * inv;
        dst[dstOffset + 2] = src.data[srcOffset + 2] * srcA + dst[dstOffset + 2] * inv;
        dst[dstOffset + 3] = (srcA + (dst[dstOffset + 3] / 255) * inv) * 255;
      }
    }
  }

  private renderPatchFromTiles(bbox: BBox, excludeIndex?: number, replaceIndex?: number, replacement?: Candidate): Float32Array {
    const [left, top, right, bottom] = bbox;
    const patchWidth = right - left;
    const out = new Float32Array(patchWidth * (bottom - top) * 4);

    for (let index = 0; index < this.tiles.length; index += 1) {
      const tile = this.tiles[index];
      if (!tile.active) continue;
      if (excludeIndex != null && index === excludeIndex) continue;

      const tileBox = replaceIndex != null && index === replaceIndex && replacement ? replacement.bbox : tile.bbox;
      const rgba = replaceIndex != null && index === replaceIndex && replacement ? replacement.rgba : this.tileRgba(tile);
      if (!bboxIntersects(tileBox, bbox)) continue;

      const il = Math.max(left, tileBox[0]);
      const it = Math.max(top, tileBox[1]);
      const ir = Math.min(right, tileBox[2]);
      const ib = Math.min(bottom, tileBox[3]);
      if (ir <= il || ib <= it) continue;

      this.alphaOverPatch(
        out,
        patchWidth,
        rgba,
        il - tileBox[0],
        it - tileBox[1],
        il - left,
        it - top,
        ir - il,
        ib - it
      );
    }
    return out;
  }

  private maskedSseFull(bbox: BBox): number {
    const [left, top, right, bottom] = bbox;
    let sse = 0;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const pixel = y * this.width + x;
        if (!this.mask[pixel]) continue;
        const offset = pixel * 4;
        const dr = this.canvas[offset] - this.targetPremult[offset];
        const dg = this.canvas[offset + 1] - this.targetPremult[offset + 1];
        const db = this.canvas[offset + 2] - this.targetPremult[offset + 2];
        const da = this.canvas[offset + 3] - this.targetPremult[offset + 3];
        sse += dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;
      }
    }
    return sse;
  }

  private maskedSsePatch(patch: Float32Array, bbox: BBox): number {
    const [left, top, right, bottom] = bbox;
    const patchWidth = right - left;
    let sse = 0;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const pixel = y * this.width + x;
        if (!this.mask[pixel]) continue;
        const patchOffset = pixelOffset(patchWidth, x - left, y - top);
        const targetOffset = pixel * 4;
        const dr = patch[patchOffset] - this.targetPremult[targetOffset];
        const dg = patch[patchOffset + 1] - this.targetPremult[targetOffset + 1];
        const db = patch[patchOffset + 2] - this.targetPremult[targetOffset + 2];
        const da = patch[patchOffset + 3] - this.targetPremult[targetOffset + 3];
        sse += dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;
      }
    }
    return sse;
  }

  private copyPatchToCanvas(patch: Float32Array, bbox: BBox): void {
    const [left, top, right, bottom] = bbox;
    const patchWidth = right - left;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const patchOffset = pixelOffset(patchWidth, x - left, y - top);
        const canvasOffset = pixelOffset(this.width, x, y);
        this.canvas[canvasOffset] = patch[patchOffset];
        this.canvas[canvasOffset + 1] = patch[patchOffset + 1];
        this.canvas[canvasOffset + 2] = patch[patchOffset + 2];
        this.canvas[canvasOffset + 3] = patch[patchOffset + 3];
      }
    }
  }

  tryPruneOnce(): boolean {
    let active = this.activeIndices();
    if (!active.length) return false;
    const sampleSize = Math.max(1, Math.round(this.settings.pruneSampleSize));
    if (active.length > sampleSize) active = this.rng.shuffle(active).slice(0, sampleSize);
    active.sort((a, b) => this.tiles[a].gainMse - this.tiles[b].gainMse);

    for (const index of active) {
      const tile = this.tiles[index];
      const clipped = bboxClip(tile.bbox, this.width, this.height);
      if (!clipped) {
        tile.active = false;
        this.pruned += 1;
        return true;
      }
      const before = this.maskedSseFull(clipped);
      const afterPatch = this.renderPatchFromTiles(clipped, index);
      const after = this.maskedSsePatch(afterPatch, clipped);
      const deltaGlobal = (after - before) / Math.max(1, this.globalDen);
      if (deltaGlobal <= this.settings.tilePenaltyMse * this.settings.prunePenaltyFactor) {
        this.copyPatchToCanvas(afterPatch, clipped);
        tile.active = false;
        this.errors.updateBBox(clipped);
        this.pruned += 1;
        return true;
      }
    }
    return false;
  }

  tryPrune(roundsCount: number): number {
    let count = 0;
    for (let i = 0; i < Math.max(1, Math.round(roundsCount)); i += 1) {
      if (!this.tryPruneOnce()) break;
      count += 1;
    }
    return count;
  }

  tryReplaceOnce(step: number, totalSteps: number): boolean {
    const active = this.activeIndices();
    if (!active.length) return false;
    const tileIndex = active[this.rng.integer(0, active.length)];
    const old = this.tiles[tileIndex];
    const clipped = bboxClip(old.bbox, this.width, this.height);
    if (!clipped) return false;

    const target = this.focusGradientColor(old.centerX, old.centerY);
    const sourceIds = chooseSourceIds(
      this.sources,
      target.color,
      this.memory,
      this.rng,
      this.settings,
      target.std,
      Math.max(4, Math.floor(this.settings.colorTopk / 2)),
      Math.max(this.settings.exploration, 0.1)
    );
    if (!sourceIds.length) return false;

    const allScores = sourceChoiceScores(this.sources, target.color, this.memory, this.settings, target.std);
    const poolScores = sourceIds.map((sourceId) => Math.max(1.0e-12, allScores[sourceId]));
    const desiredPx = Math.max(4, old.bbox[2] - old.bbox[0], old.bbox[3] - old.bbox[1]);
    const progress = step / Math.max(1, totalSteps);
    let best: Candidate | null = null;
    let bestAfterSse = Number.POSITIVE_INFINITY;

    for (let i = 0; i < Math.max(1, Math.round(this.settings.replaceCandidateBatch)); i += 1) {
      const sourceId = sourceIds[this.rng.weightedIndex(poolScores)];
      const candidate = proposeCandidate(this.sources, sourceId, old.centerX, old.centerY, this.width, this.height, progress, this.rng, this.cache, this.settings, {
        desiredPx,
        maxRenderedPx: this.settings.maxRenderedPx,
        rotationProb: Math.min(0.5, this.settings.rotationProb + 0.1),
        flipProb: this.settings.flipProb,
        centerJitterPx: Math.max(1, this.settings.errorCellSize * 0.1)
      });
      if (!candidate) continue;
      const union = bboxClip([
        Math.min(old.bbox[0], candidate.bbox[0]),
        Math.min(old.bbox[1], candidate.bbox[1]),
        Math.max(old.bbox[2], candidate.bbox[2]),
        Math.max(old.bbox[3], candidate.bbox[3])
      ], this.width, this.height);
      if (!union) continue;
      const beforeUnion = this.maskedSseFull(union);
      const afterPatch = this.renderPatchFromTiles(union, undefined, tileIndex, candidate);
      const afterUnion = this.maskedSsePatch(afterPatch, union);
      if (afterUnion < bestAfterSse) {
        candidate.sseBefore = beforeUnion;
        candidate.sseAfter = afterUnion;
        candidate.globalGainMse = (beforeUnion - afterUnion) / Math.max(1, this.globalDen);
        candidate.score = candidate.globalGainMse;
        best = candidate;
        bestAfterSse = afterUnion;
      }
    }

    if (!best || best.globalGainMse <= this.settings.replaceMinGainMse) return false;

    const union = bboxClip([
      Math.min(old.bbox[0], best.bbox[0]),
      Math.min(old.bbox[1], best.bbox[1]),
      Math.max(old.bbox[2], best.bbox[2]),
      Math.max(old.bbox[3], best.bbox[3])
    ], this.width, this.height);
    if (!union) return false;
    const afterPatch = this.renderPatchFromTiles(union, undefined, tileIndex, best);
    this.copyPatchToCanvas(afterPatch, union);
    this.tiles[tileIndex] = this.recordFromCandidate(best);
    this.tiles[tileIndex].gainMse = best.globalGainMse;
    this.errors.updateBBox(union);
    this.replaced += 1;
    this.memory.noteTrial(this.sources[best.sourceId].code, target.color, true, best.globalGainMse);
    return true;
  }

  recomputeErrors(): void {
    this.errors.recomputeAll();
  }
}

function createProgress(collage: ColorLearningCollage, stage: AutoCreateTwroleProgressStage, step: number, total: number, message?: string): AutoCreateTwroleProgress {
  return {
    stage,
    step,
    total,
    mse: collage.currentMse(),
    active: collage.activeCount(),
    accepted: collage.accepted,
    rejected: collage.rejected,
    pruned: collage.pruned,
    replaced: collage.replaced,
    message
  };
}

export async function runAutoCreateTwrole({
  targetFile,
  decoOptions,
  settings: rawSettings,
  resumeSnapshot,
  signal,
  onProgress,
  onCheckpoint
}: RunAutoCreateTwroleOptions): Promise<AutoCreateTwroleResult> {
  const settings: AutoCreateTwroleSettings = { ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS, ...rawSettings };
  throwIfAborted(signal);

  const target = await loadTargetImage(targetFile, settings);
  throwIfAborted(signal);

  const sourceLoad = await loadSourceTiles(decoOptions, settings, signal, (done, total) => {
    onProgress?.({
      stage: 'sources',
      step: done,
      total,
      mse: 0,
      active: 0,
      accepted: 0,
      rejected: 0,
      pruned: 0,
      replaced: 0,
      message: 'sources ' + done + '/' + total
    });
  });

  if (!sourceLoad.sources.length) {
    throw new Error('No usable deco sources were found. Check the current deco palette and atlas PNG assets.');
  }

  const totalSteps = Math.max(1, Math.round(settings.tiles));
  const logEvery = Math.max(1, Math.round(settings.logEvery));
  const exportEvery = Math.round(settings.exportEvery);
  const sourceSignature = sourceLoad.sources.map((source) => source.assetId + ':' + source.code).join('|');
  const canResume = Boolean(
    resumeSnapshot &&
      resumeSnapshot.version === AUTO_CREATE_SNAPSHOT_VERSION &&
      resumeSnapshot.targetWidth === target.width &&
      resumeSnapshot.targetHeight === target.height &&
      resumeSnapshot.sourceWidth === target.sourceWidth &&
      resumeSnapshot.sourceHeight === target.sourceHeight &&
      resumeSnapshot.sourceCount === sourceLoad.sources.length &&
      resumeSnapshot.sourceSignature === sourceSignature &&
      resumeSnapshot.totalSteps === totalSteps &&
      resumeSnapshot.step >= 0 &&
      resumeSnapshot.step <= totalSteps
  );

  const fallbackSeed = settings.seed > 0 ? settings.seed : Math.floor(Date.now() % 2147483647);
  const seed = canResume && resumeSnapshot ? resumeSnapshot.seed : fallbackSeed;
  const rng = new SeededRandom(seed);
  if (canResume && resumeSnapshot) {
    rng.restore(resumeSnapshot.rngState, resumeSnapshot.rngSpareNormal);
  }

  const collage = new ColorLearningCollage(
    sourceLoad.sources,
    target.straight,
    target.premult,
    target.mask,
    target.width,
    target.height,
    rng,
    settings
  );

  if (canResume && resumeSnapshot) {
    collage.restoreFromSnapshot(resumeSnapshot);
  }

  const createResult = async (): Promise<AutoCreateTwroleResult> => {
    const decorations = collage.exportDecorations();
    return {
      decorations,
      exportJson: { deco: collage.exportLegacyDeco() },
      previewDataUrl: await collage.previewDataUrl(),
      targetWidth: target.width,
      targetHeight: target.height,
      sourceWidth: target.sourceWidth,
      sourceHeight: target.sourceHeight,
      sourceCount: sourceLoad.sources.length,
      insertScale: roleExportScaleForTarget(target.width, target.height),
      mse: collage.currentMse(),
      accepted: collage.accepted,
      rejected: collage.rejected,
      pruned: collage.pruned,
      replaced: collage.replaced,
      warnings: sourceLoad.warnings
    };
  };

  const publishCheckpoint = async (
    stage: AutoCreateTwroleProgressStage,
    progressStep: number,
    progressTotal: number,
    snapshotStep: number,
    message?: string
  ): Promise<AutoCreateTwroleCheckpoint> => {
    const progress = createProgress(collage, stage, progressStep, progressTotal, message);
    const result = await createResult();
    const checkpoint: AutoCreateTwroleCheckpoint = {
      progress,
      result,
      snapshot: collage.createSnapshot(snapshotStep, totalSteps, seed, target, sourceLoad.warnings)
    };
    onCheckpoint?.(checkpoint);
    return checkpoint;
  };

  let startStep = 1;
  if (canResume && resumeSnapshot) {
    const restoredStep = Math.min(totalSteps, Math.max(0, Math.round(resumeSnapshot.step)));
    startStep = Math.min(totalSteps + 1, restoredStep + 1);
    onProgress?.(createProgress(collage, 'run', restoredStep, totalSteps, 'resumed'));
  }

  for (let step = startStep; step <= totalSteps; step += 1) {
    if (signal?.aborted) {
      const stoppedStep = Math.max(0, step - 1);
      const checkpoint = await publishCheckpoint('run', stoppedStep, totalSteps, stoppedStep, 'stopped');
      throw new AutoCreateTwroleStoppedError({ result: checkpoint.result, checkpoint });
    }

    let didWork = false;
    const active = collage.activeCount();

    if (settings.tileBudget > 0 && active >= settings.tileBudget) {
      if (step % 2 === 0) didWork = collage.tryReplaceOnce(step, totalSteps);
      if (!didWork) didWork = collage.tryPruneOnce();
    } else {
      didWork = collage.tryAdd(step, totalSteps);
      if (step % Math.max(1, Math.round(settings.removeEvery)) === 0 && collage.activeCount() > 0) {
        collage.tryPrune(settings.pruneRounds);
      }
      if (step % Math.max(1, Math.round(settings.replaceEvery)) === 0 && collage.activeCount() > 0) {
        collage.tryReplaceOnce(step, totalSteps);
      }
    }

    if (step % Math.max(250, Math.round(settings.fullErrorRecomputeEvery)) === 0) {
      collage.recomputeErrors();
    }

    if (step === 1 || step % logEvery === 0 || step === totalSteps) {
      onProgress?.(createProgress(collage, 'run', step, totalSteps, didWork ? 'accepted/refined' : 'searched'));
      await nextFrame();
    }

    if (exportEvery > 0 && (step === 1 || step % exportEvery === 0 || step === totalSteps)) {
      collage.saveMemory();
      await publishCheckpoint('run', step, totalSteps, step, 'checkpoint');
      await nextFrame();
    }
  }

  const finalRounds = Math.max(0, Math.round(settings.finalPruneRounds));
  if (finalRounds > 0) {
    for (let i = 0; i < finalRounds; i += 1) {
      if (signal?.aborted) {
        const checkpoint = await publishCheckpoint('final', i + 1, finalRounds, totalSteps, 'stopped');
        throw new AutoCreateTwroleStoppedError({ result: checkpoint.result, checkpoint });
      }
      if (!collage.tryPruneOnce()) break;
      if (i % 10 === 0) {
        onProgress?.(createProgress(collage, 'final', i + 1, finalRounds, 'final prune'));
        await nextFrame();
        if (exportEvery > 0) {
          await publishCheckpoint('final', i + 1, finalRounds, totalSteps, 'final prune');
        }
      }
    }
  }

  collage.recomputeErrors();
  collage.saveMemory();
  onProgress?.(createProgress(collage, 'final', finalRounds, finalRounds || 1, 'done'));

  return createResult();
}

export function createAutoCreateTwroleExportBlob(result: Pick<AutoCreateTwroleResult, 'exportJson'>): Blob {
  return new Blob([JSON.stringify(result.exportJson, null, 2)], { type: 'application/json' });
}
