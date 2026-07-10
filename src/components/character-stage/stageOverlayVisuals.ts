import { Container, Graphics } from 'pixi.js';
import type { BrushFillMask, BrushFillPoint } from '../../lib/conversion/brushFillToDeco';
import { createDecoSelectionGlowFilter } from '../../lib/stage/decoSelectionFilter';

let cachedControllerGlowFilter: ReturnType<typeof createDecoSelectionGlowFilter> | null = null;

export function getCachedControllerGlowFilter(): ReturnType<typeof createDecoSelectionGlowFilter> {
  if (!cachedControllerGlowFilter) cachedControllerGlowFilter = createDecoSelectionGlowFilter({ knockout: true });
  return cachedControllerGlowFilter;
}

interface BrushFillOverlayScene {
  brushFillOverlay: Container;
  brushFillCommittedGraphic: Graphics;
  brushFillDraftGraphic: Graphics;
}

function drawBrushPoints(graphic: Graphics, points: readonly BrushFillPoint[], clear = true): void {
  if (clear) graphic.clear();
  if (!points.length) return;

  graphic.beginFill(0x35d0ff, 0.18);
  graphic.lineStyle({ width: 1, color: 0x9cffb2, alpha: 0.36 });
  for (const point of points) {
    graphic.drawCircle(point.x, point.y, point.radius);
  }
  graphic.endFill();
}

/** Synchronize the persisted mask. This is intentionally a full redraw. */
export function drawBrushFillOverlay(scene: BrushFillOverlayScene, mask: BrushFillMask): void {
  drawBrushPoints(scene.brushFillCommittedGraphic, mask.points);
  scene.brushFillDraftGraphic.clear();
  scene.brushFillOverlay.visible = mask.points.length > 0;
  scene.brushFillOverlay.eventMode = 'none';
}

/**
 * Start a transient stroke. The committed graphic is synchronized when the
 * scene is built, when the mask prop changes, and when a stroke is committed,
 * so pointer-down only needs to reset the inexpensive draft layer.
 */
export function beginBrushFillDraft(
  scene: BrushFillOverlayScene,
  mask: BrushFillMask,
  points: readonly BrushFillPoint[]
): void {
  drawBrushPoints(scene.brushFillDraftGraphic, points);
  scene.brushFillOverlay.visible = mask.points.length > 0 || points.length > 0;
  scene.brushFillOverlay.eventMode = 'none';
}

/** Append only the newly interpolated points to the transient stroke graphic. */
export function appendBrushFillDraft(
  scene: BrushFillOverlayScene,
  points: readonly BrushFillPoint[]
): void {
  drawBrushPoints(scene.brushFillDraftGraphic, points, false);
  if (points.length) scene.brushFillOverlay.visible = true;
}

export function createLargeMultiDragPreview(width: number, height: number): Container {
  const container = new Container();
  const graphic = new Graphics();
  const halfWidth = Math.max(14, Math.min(width / 2 + 8, 220));
  const halfHeight = Math.max(14, Math.min(height / 2 + 8, 220));

  graphic.lineStyle({ width: 1.5, color: 0x38bdf8, alpha: 0.95 });
  graphic.drawRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
  graphic.lineStyle({ width: 2, color: 0xf8fafc, alpha: 0.95 });
  graphic.moveTo(-12, 0);
  graphic.lineTo(12, 0);
  graphic.moveTo(0, -12);
  graphic.lineTo(0, 12);
  graphic.beginFill(0x38bdf8, 0.18);
  graphic.drawCircle(0, 0, 16);
  graphic.endFill();

  container.addChild(graphic);
  container.eventMode = 'none';
  return container;
}
