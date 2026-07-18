import type { DecorationLayer, PartOption } from '../../../types/role';
import type { AutoCreateTwroleLegacyDecoEntry } from './contracts';

export type Vec3 = [number, number, number];
export type AutoCreateCanvas = HTMLCanvasElement | OffscreenCanvas;
export type AutoCreateCanvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type AutoCreateImage = HTMLImageElement | ImageBitmap;

export interface TargetImageData {
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  straight: Uint8ClampedArray;
  premult: Float32Array;
  /** Scoring/search mask using the configured alpha threshold. */
  mask: Uint8Array;
  maskCount: number;
  /** Strict placement mask: every target pixel with alpha > 0. */
  containmentMask: Uint8Array;
  containmentCount: number;
  /** One-pixel interior guard for Pixi/Canvas linear-sampling fringe. */
  placementMask: Uint8Array;
}

export interface SourceTile {
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

export interface TransformedImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  /** Inclusive/exclusive local bounds containing every alpha > 0 pixel. */
  alphaBounds: BBox;
  // Inclusive/exclusive non-transparent bounds for every row. Empty rows use
  // start >= end. These let the hot loops skip transparent rotation padding.
  alphaRowStart: Int32Array;
  alphaRowEnd: Int32Array;
  // Sum of alpha bytes (0..255), cached because it is invariant per variant.
  alphaSum: number;
}

export interface DecoDraft {
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

export type BBox = [left: number, top: number, right: number, bottom: number];

export interface Candidate {
  sourceId: number;
  sxInternal: number;
  syInternal: number;
  rDeg: number;
  centerX: number;
  centerY: number;
  rgba: TransformedImage;
  bbox: BBox;
  sseBefore: number;
  sseAfter: number;
  globalGainMse: number;
  score: number;
}

export interface TileRecord {
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

export interface MemoryStat {
  trials: number;
  accepted: number;
  gain_sum: number;
  ema_gain: number;
}

export interface MemoryPayload {
  version: number;
  updated_at?: number;
  source_stats: Record<string, MemoryStat>;
  color_stats: Record<string, MemoryStat>;
}
