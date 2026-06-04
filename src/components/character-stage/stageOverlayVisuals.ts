import { Container, Graphics } from 'pixi.js';
import type { BrushFillMask, BrushFillPoint } from '../../lib/conversion/brushFillToDeco';
import { brushFillPoints } from '../../lib/stage/characterStageHelpers';
import { createDecoSelectionGlowFilter } from '../../lib/stage/decoSelectionFilter';

let cachedGlowFilter: ReturnType<typeof createDecoSelectionGlowFilter> | null = null;
let cachedControllerGlowFilter: ReturnType<typeof createDecoSelectionGlowFilter> | null = null;

export function getCachedGlowFilter(): ReturnType<typeof createDecoSelectionGlowFilter> {
  if (!cachedGlowFilter) cachedGlowFilter = createDecoSelectionGlowFilter();
  return cachedGlowFilter;
}

export function getCachedControllerGlowFilter(): ReturnType<typeof createDecoSelectionGlowFilter> {
  if (!cachedControllerGlowFilter) cachedControllerGlowFilter = createDecoSelectionGlowFilter({ knockout: true });
  return cachedControllerGlowFilter;
}

export function drawBrushFillOverlay(
  scene: { brushFillGraphic: Graphics; brushFillOverlay: Container },
  mask: BrushFillMask,
  draftPoints: BrushFillPoint[] = []
): void {
  const points = brushFillPoints(mask, draftPoints);
  scene.brushFillGraphic.clear();
  scene.brushFillOverlay.visible = points.length > 0;
  scene.brushFillOverlay.eventMode = 'none';

  if (!points.length) return;

  scene.brushFillGraphic.beginFill(0x35d0ff, 0.18);
  scene.brushFillGraphic.lineStyle({ width: 1, color: 0x9cffb2, alpha: 0.36 });
  for (const point of points) {
    scene.brushFillGraphic.drawCircle(point.x, point.y, point.radius);
  }
  scene.brushFillGraphic.endFill();
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
