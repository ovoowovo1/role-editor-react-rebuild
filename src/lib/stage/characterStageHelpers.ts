import type { DecorationLayer, HeadLayerTransform, RoleDocument } from '../../types/role';
import { DEFAULT_POSITION_RANGE, MAX_POSITION_RANGE } from '../../constants/editor';
import { LARGE_MULTI_DRAG_THRESHOLD, SCROLL_SURFACE_PADDING } from '../../constants/stage';
import type { BrushFillPoint } from '../conversion/brushFillToDeco';
import { clamp } from '../math';

const SELECTION_DRAG_HIT_SIZE = 50;
const SELECTION_DRAG_HIT_PADDING = 4;
const BRUSH_FILL_POINT_SPACING_FACTOR = 0.35;

export interface LocalBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageSurfaceMetrics {
  viewportSize: { width: number; height: number };
  surfaceSize: { width: number; height: number };
}

export interface DisplayTransformPatch {
  x: number;
  y: number;
  rotationRadians: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  visible: boolean;
}

export interface MultiDragPosition {
  id: string;
  x: number;
  y: number;
}

export interface MultiDragPositionSummary {
  count: number;
  centerX: number;
  centerY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type MultiDragStartMode = 'single-fallback' | 'overlay' | 'preview';

export function stageSurfaceMetrics(
  viewportWidth: number,
  viewportHeight: number,
  stageScale: number
): StageSurfaceMetrics {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const zoom = Math.max(1, stageScale);
  const needsScrollSurface = zoom > 1;
  return {
    viewportSize: { width, height },
    surfaceSize: {
      width: Math.ceil(width * zoom + (needsScrollSurface ? SCROLL_SURFACE_PADDING * 2 : 0)),
      height: Math.ceil(height * zoom + (needsScrollSurface ? SCROLL_SURFACE_PADDING * 2 : 0))
    }
  };
}

export function shouldUsePointBoundsForSelection(selectedCount: number): boolean {
  return selectedCount >= LARGE_MULTI_DRAG_THRESHOLD;
}

export function summarizeMultiDragPositions(positions: readonly MultiDragPosition[]): MultiDragPositionSummary | null {
  if (!positions.length) return null;
  let centerX = 0;
  let centerY = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const position of positions) {
    centerX += position.x;
    centerY += position.y;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x);
    maxY = Math.max(maxY, position.y);
  }

  return {
    count: positions.length,
    centerX: centerX / positions.length,
    centerY: centerY / positions.length,
    minX,
    minY,
    maxX,
    maxY
  };
}

export function multiDragStartMode(selectedDecorationCount: number, overlayItemCount: number): MultiDragStartMode {
  if (selectedDecorationCount < 2) return 'single-fallback';
  if (selectedDecorationCount >= LARGE_MULTI_DRAG_THRESHOLD) return 'preview';
  return overlayItemCount >= 2 ? 'overlay' : 'single-fallback';
}

export function actorSceneKey(role: RoleDocument, bodyAnimationLabel: string): string {
  return JSON.stringify({
    camp: role.camp,
    gender: role.gender,
    parts: role.parts,
    partFrames: role.partFrames,
    partScales: role.partScales,
    bodyAnimationLabel
  });
}

export function decorationDisplayKey(deco: DecorationLayer): string {
  return `${deco.assetId}\u0000${deco.code}`;
}

export function decorationTransformKey(deco: DecorationLayer): string {
  return [
    deco.x,
    deco.y,
    deco.rotation,
    deco.scaleX,
    deco.scaleY,
    deco.opacity,
    deco.visible !== false
  ].join('\u0000');
}

export function positionRange(role: RoleDocument): number {
  const raw = role.positionRange;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_POSITION_RANGE) : DEFAULT_POSITION_RANGE;
}

export function clampedHeadLayerIndex(role: RoleDocument): number {
  const raw = role.headLayerIndex;
  const n = typeof raw === 'number' ? raw : Number(raw);
  const index = Number.isFinite(n) ? Math.round(n) : role.decorations.length;
  return Math.max(0, Math.min(role.decorations.length, index));
}

export function sameChildOrder<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

export function displayTransformPatchForDecoration(deco: DecorationLayer): DisplayTransformPatch {
  return {
    x: deco.x,
    y: deco.y,
    rotationRadians: (deco.rotation * Math.PI) / 180,
    scaleX: deco.scaleX,
    scaleY: deco.scaleY,
    alpha: clamp(deco.opacity, 0, 1),
    visible: deco.visible !== false
  };
}

export function displayTransformPatchForHeadLayer(
  headLayer: HeadLayerTransform,
  emptyFrame: boolean
): DisplayTransformPatch {
  return {
    x: headLayer.x,
    y: headLayer.y,
    rotationRadians: (headLayer.rotation * Math.PI) / 180,
    scaleX: headLayer.scaleX,
    scaleY: headLayer.scaleY,
    alpha: clamp(headLayer.opacity, 0, 1),
    visible: headLayer.visible !== false && !emptyFrame
  };
}

export function appendBrushPoint(points: BrushFillPoint[], next: BrushFillPoint): BrushFillPoint[] {
  const last = points[points.length - 1];
  if (!last) return [next];

  const dx = next.x - last.x;
  const dy = next.y - last.y;
  const distance = Math.hypot(dx, dy);
  const spacing = Math.max(1, next.radius * BRUSH_FILL_POINT_SPACING_FACTOR);
  if (distance <= spacing) return points;

  const additions: BrushFillPoint[] = [];
  const steps = Math.max(1, Math.floor(distance / spacing));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    additions.push({
      x: last.x + dx * t,
      y: last.y + dy * t,
      radius: next.radius
    });
  }
  return [...points, ...additions];
}

export function mergeBounds(a: LocalBounds | null, b: LocalBounds): LocalBounds {
  if (!a) return b;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  };
}

export function pointBounds(x: number, y: number): LocalBounds {
  const half = SELECTION_DRAG_HIT_SIZE / 2;
  return { minX: x - half, minY: y - half, maxX: x + half, maxY: y + half };
}

export function selectionControllerPosition(selectedDecorations: DecorationLayer[]): { x: number; y: number } {
  if (selectedDecorations.length === 1) {
    const deco = selectedDecorations[0];
    return { x: deco.x, y: deco.y };
  }
  const sum = selectedDecorations.reduce(
    (acc, deco) => ({ x: acc.x + deco.x, y: acc.y + deco.y }),
    { x: 0, y: 0 }
  );
  return {
    x: sum.x / selectedDecorations.length,
    y: sum.y / selectedDecorations.length
  };
}

export function selectionDragHitRect(bounds: LocalBounds, centerX: number, centerY: number): RectLike {
  const half = SELECTION_DRAG_HIT_SIZE / 2;
  const minX = Math.min(-half, bounds.minX - centerX - SELECTION_DRAG_HIT_PADDING);
  const minY = Math.min(-half, bounds.minY - centerY - SELECTION_DRAG_HIT_PADDING);
  const maxX = Math.max(half, bounds.maxX - centerX + SELECTION_DRAG_HIT_PADDING);
  const maxY = Math.max(half, bounds.maxY - centerY + SELECTION_DRAG_HIT_PADDING);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
