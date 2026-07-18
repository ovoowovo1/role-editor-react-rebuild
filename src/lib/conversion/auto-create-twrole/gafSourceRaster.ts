import type { PartOption } from '../../../types/role';
import { resolveGafFrameOneDisplayList, type GafTextureDisplayItem } from '../../runtime/gafFrameDisplayList';
import { autoCreateDecorationRuntimeManifest } from '../../runtime/autoCreateGafRuntimeManifest';
import type { AutoCreateCanvas, AutoCreateImage } from './internalTypes';
import { createCanvas, get2d } from './platform';

export interface ExactSourceRaster {
  canvas: AutoCreateCanvas;
  width: number;
  height: number;
  /** Runtime-local coordinate represented by the center of the raster. */
  localCenterX: number;
  localCenterY: number;
}

function resolvedDecorationItems(option: PartOption): GafTextureDisplayItem[] | null {
  if (option.category !== 'deco' || option.source !== 'gaf') return null;
  const timelineId = autoCreateDecorationRuntimeManifest.timelinesByLinkage[option.code];
  if (!timelineId) {
    throw new Error(`No GAF runtime timeline found for decoration ${option.code}.`);
  }
  const items = resolveGafFrameOneDisplayList(autoCreateDecorationRuntimeManifest, timelineId);
  if (!items.length) {
    throw new Error(`No exact GAF frame-one display list could be resolved for decoration ${option.code}.`);
  }
  return items;
}

/** Stable source-policy input used by v3 checkpoint validation. */
export function gafFrameOneDisplayListSignature(option: PartOption): string {
  const items = resolvedDecorationItems(option);
  if (!items) {
    const atlas = option.atlas;
    return atlas
      ? `atlas:${atlas.texture}:${atlas.x},${atlas.y},${atlas.width},${atlas.height}:${atlas.pivotX},${atlas.pivotY}`
      : `image:${option.icon}`;
  }
  return items.map((item) => {
    const matrix = item.matrix;
    return [
      item.objectIdPath.join('/'),
      item.elementId,
      `${item.region.x},${item.region.y},${item.region.width},${item.region.height}`,
      item.alpha.toFixed(6),
      [matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty]
        .map((value) => value.toFixed(6))
        .join(',')
    ].join(':');
  }).join(';');
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function transformedPoint(item: GafTextureDisplayItem, x: number, y: number): { x: number; y: number } {
  const matrix = item.matrix;
  return {
    x: matrix.a * x + matrix.c * y + matrix.tx,
    y: matrix.b * x + matrix.d * y + matrix.ty
  };
}

function displayListBounds(items: readonly GafTextureDisplayItem[]): Bounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    if (!(item.alpha > 0) || item.region.width <= 0 || item.region.height <= 0) continue;
    const corners = [
      transformedPoint(item, 0, 0),
      transformedPoint(item, item.region.width, 0),
      transformedPoint(item, 0, item.region.height),
      transformedPoint(item, item.region.width, item.region.height)
    ];
    for (const point of corners) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  return Number.isFinite(minX) && Number.isFinite(minY) && maxX > minX && maxY > minY
    ? { minX, minY, maxX, maxY }
    : null;
}

/**
 * Renders the same complete GAF frame-one display list used by the editor into
 * a native-resolution Canvas raster. A null return means the editor itself is
 * using the atlas fallback because no runtime manifest is available.
 */
export function rasterizeDecorationFrameOne(
  option: PartOption,
  atlasImage: AutoCreateImage
): ExactSourceRaster | null {
  const items = resolvedDecorationItems(option);
  if (!items) return null;
  const bounds = displayListBounds(items);
  if (!items.length || !bounds) {
    throw new Error(`No exact GAF frame-one raster could be resolved for decoration ${option.code}.`);
  }

  const originX = Math.floor(bounds.minX);
  const originY = Math.floor(bounds.minY);
  const width = Math.max(1, Math.ceil(bounds.maxX) - originX);
  const height = Math.max(1, Math.ceil(bounds.maxY) - originY);
  const canvas = createCanvas(width, height);
  const context = get2d(canvas);
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;

  for (const item of items) {
    if (!(item.alpha > 0)) continue;
    const matrix = item.matrix;
    context.save();
    context.globalAlpha = item.alpha;
    context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx - originX, matrix.ty - originY);
    context.drawImage(
      atlasImage as CanvasImageSource,
      item.region.x,
      item.region.y,
      item.region.width,
      item.region.height,
      0,
      0,
      item.region.width,
      item.region.height
    );
    context.restore();
  }

  return {
    canvas,
    width,
    height,
    localCenterX: originX + width / 2,
    localCenterY: originY + height / 2
  };
}
