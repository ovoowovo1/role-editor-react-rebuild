import { Texture } from 'pixi.js';
import { optionById } from '../../mock/options';
import { gafSources } from '../../mock/gafManifest';
import { resolveGafTimelineId } from '../runtime/gafMovieClip';
import { resolveGafFrameOneDisplayList, type GafTextureDisplayItem } from '../runtime/gafFrameDisplayList';
import { decorationRuntimeManifest } from '../runtime/gafRuntimeManifest';
import type { PinOutlineMaterialMetrics } from './pinOutlineGeometry';
import type { Point } from './pinOutlineGeometry';

interface AlphaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextureState {
  baseTexture: ReturnType<typeof Texture.from>['baseTexture'];
  ready: boolean;
}

const textureStates = new Map<string, TextureState>();
const alphaBoundsCache = new Map<string, AlphaBounds | null>();

export function alphaBoundsFromPixels(
  width: number,
  height: number,
  pixels: ArrayLike<number>,
  alphaThreshold = 0
): AlphaBounds | null {
  const safeWidth = Math.max(0, Math.floor(width));
  const safeHeight = Math.max(0, Math.floor(height));
  if (safeWidth === 0 || safeHeight === 0) return null;
  let minX = safeWidth;
  let minY = safeHeight;
  let maxX = -1;
  let maxY = -1;
  const threshold = Math.max(0, Math.min(255, alphaThreshold));
  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      if ((pixels[(y * safeWidth + x) * 4 + 3] ?? 0) <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 1);
      maxY = Math.max(maxY, y + 1);
    }
  }
  return maxX >= minX && maxY >= minY
    ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    : null;
}

function textureState(url: string): TextureState | null {
  if (!url) return null;
  const cached = textureStates.get(url);
  if (cached) return cached;
  try {
    const baseTexture = Texture.from(url).baseTexture;
    const state = { baseTexture, ready: baseTexture.valid };
    textureStates.set(url, state);
    return state;
  } catch {
    return null;
  }
}

function imageSourceFor(baseTexture: TextureState['baseTexture']): CanvasImageSource | null {
  const resource = baseTexture.resource as unknown as {
    source?: CanvasImageSource;
    bitmap?: CanvasImageSource;
  } | undefined;
  return resource?.source ?? resource?.bitmap ?? null;
}

/**
 * Finds the non-transparent pixels inside an atlas region. This intentionally
 * stays runtime-only: the result is used for pin placement and never enters
 * a RoleDocument or an exported file.
 */
function alphaBoundsForRegion(url: string, region: { x: number; y: number; width: number; height: number }): AlphaBounds | null {
  const key = `${url}:${region.x}:${region.y}:${region.width}:${region.height}`;
  if (alphaBoundsCache.has(key)) return alphaBoundsCache.get(key) ?? null;
  if (typeof document === 'undefined') return null;
  const state = textureState(url);
  const source = state ? imageSourceFor(state.baseTexture) : null;
  if (!source || !state?.baseTexture.valid) return null;
  const width = Math.max(1, Math.ceil(region.width));
  const height = Math.max(1, Math.ceil(region.height));
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.clearRect(0, 0, width, height);
    context.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    // Include anti-aliased edge pixels so the native black outline is not
    // left inside the path by an arbitrary alpha threshold.
    const result = alphaBoundsFromPixels(width, height, pixels);
    alphaBoundsCache.set(key, result);
    return result;
  } catch {
    // A cross-origin or otherwise unreadable texture falls back to manifest
    // bounds; placement remains safe and will be retried after texture load.
    return null;
  }
}

function transformPoint(matrix: GafTextureDisplayItem['matrix'], point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.tx,
    y: matrix.b * point.x + matrix.d * point.y + matrix.ty
  };
}

function unionTransformedBounds(items: readonly GafTextureDisplayItem[], url: string): { bounds: AlphaBounds | null; ready: boolean } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let ready = true;
  let included = false;
  for (const item of items) {
    const state = textureState(url);
    if (!state?.baseTexture.valid) ready = false;
    const alpha = alphaBoundsForRegion(url, item.region);
    const bounds = alpha ?? { x: 0, y: 0, width: item.region.width, height: item.region.height };
    if (!alpha) ready = false;
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height }
    ].map((point) => transformPoint(item.matrix, point));
    for (const corner of corners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }
    included = true;
  }
  return {
    bounds: included && Number.isFinite(minX) && Number.isFinite(minY)
      ? { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
      : null,
    ready
  };
}

function fallbackMetrics(assetId: string): PinOutlineMaterialMetrics {
  const atlas = optionById[assetId]?.atlas;
  const width = Math.max(1, atlas?.runtimeDisplayWidth ?? atlas?.width ?? 64);
  const height = Math.max(1, atlas?.runtimeDisplayHeight ?? atlas?.height ?? 64);
  return {
    x: -(atlas?.runtimePivotX ?? atlas?.pivotX ?? width / 2),
    y: -(atlas?.runtimePivotY ?? atlas?.pivotY ?? height / 2),
    width,
    height
  };
}

export interface PinOutlineAssetMetricResult {
  metrics: PinOutlineMaterialMetrics;
  ready: boolean;
  textureUrl: string | null;
}

/** Resolves alpha-trimmed local bounds for one decoration asset. */
export function resolvePinOutlineAssetMetrics(assetId: string): PinOutlineAssetMetricResult {
  const option = optionById[assetId];
  const linkage = option?.code ?? assetId;
  const textureUrl = gafSources.decorationsTexture;
  if (decorationRuntimeManifest) {
    const timelineId = resolveGafTimelineId(decorationRuntimeManifest, linkage);
    const timeline = timelineId ? decorationRuntimeManifest.timelinesById[timelineId] : null;
    if (timeline) {
      const items = resolveGafFrameOneDisplayList(decorationRuntimeManifest, linkage, {
        timelineScale: decorationRuntimeManifest.timelineScale
      });
      const resolved = unionTransformedBounds(items, textureUrl);
      if (resolved.bounds) return { metrics: resolved.bounds, ready: resolved.ready, textureUrl };
      if (timeline.bounds.width > 0 && timeline.bounds.height > 0) {
        return { metrics: { ...timeline.bounds }, ready: false, textureUrl };
      }
    }
  }

  const atlas = option?.atlas;
  if (atlas) {
    const alpha = alphaBoundsForRegion(atlas.texture, atlas);
    const frameScaleX = (atlas.runtimeDisplayWidth ?? atlas.width) / Math.max(1, atlas.width) * (atlas.scale || 1);
    const frameScaleY = (atlas.runtimeDisplayHeight ?? atlas.height) / Math.max(1, atlas.height) * (atlas.scale || 1);
    const pivotX = atlas.runtimePivotX ?? atlas.pivotX ?? atlas.width / 2;
    const pivotY = atlas.runtimePivotY ?? atlas.pivotY ?? atlas.height / 2;
    const bounds = alpha ?? { x: 0, y: 0, width: atlas.width, height: atlas.height };
    return {
      metrics: {
        x: bounds.x * frameScaleX - pivotX,
        y: bounds.y * frameScaleY - pivotY,
        width: Math.max(1, bounds.width * frameScaleX),
        height: Math.max(1, bounds.height * frameScaleY)
      },
      ready: !!alpha,
      textureUrl: atlas.texture
    };
  }
  return { metrics: fallbackMetrics(assetId), ready: true, textureUrl: null };
}

/**
 * Invokes the callback once when one of the requested decoration textures
 * finishes loading. The caller owns the returned cleanup function.
 */
export function watchPinOutlineAssetTextures(textureUrls: readonly (string | null)[], onReady: () => void): () => void {
  const cleanups: Array<() => void> = [];
  let active = true;
  for (const url of [...new Set(textureUrls.filter((value): value is string => !!value))]) {
    const state = textureState(url);
    if (!state || state.baseTexture.valid) continue;
    const handler = () => {
      if (active) onReady();
    };
    state.baseTexture.once('loaded', handler);
    cleanups.push(() => state.baseTexture.off('loaded', handler));
  }
  return () => {
    active = false;
    cleanups.forEach((cleanup) => cleanup());
  };
}
