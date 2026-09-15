import { Container, Graphics } from 'pixi.js';
import { optionById } from '../../mock/options';
import { createDecorationVisual } from '../../lib/stage/decorationVisual';
import {
  alignLocalBoundsToBoundary,
  buildPinOutlinePlacements,
  closePinPath,
  localBoundsInsidePolygon,
  type Point
} from '../../lib/editor/pinOutlineGeometry';
import { resolvePinOutlineAssetMetrics, watchPinOutlineAssetTextures } from '../../lib/editor/pinOutlineAssetMetrics';
import type { PinOutlinePoint, PinOutlineState } from '../../types/pinOutline';
import type { PinOutlineOptions, StageSceneState } from './types';

const PATH_SAMPLES = 160;

function drawPath(graphic: Graphics, points: readonly Point[], closed: boolean): void {
  graphic.clear();
  if (!points.length) return;
  graphic.lineStyle({ width: 1.5, color: 0x9cffb2, alpha: 0.85 });
  graphic.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) graphic.lineTo(point.x, point.y);
  if (closed) graphic.lineTo(points[0].x, points[0].y);
}

function drawPin(graphic: Graphics, pin: PinOutlinePoint, index: number): void {
  graphic.clear();
  graphic.beginFill(0xff5b7f, 0.95);
  graphic.lineStyle({ width: 1.5, color: 0xffffff, alpha: 0.95 });
  graphic.drawCircle(pin.x, pin.y, 7);
  graphic.endFill();
  graphic.lineStyle({ width: 1.5, color: 0x111827, alpha: 0.95 });
  graphic.moveTo(pin.x - 3, pin.y);
  graphic.lineTo(pin.x + 3, pin.y);
  graphic.moveTo(pin.x, pin.y - 3);
  graphic.lineTo(pin.x, pin.y + 3);
  graphic.name = `pin-${index + 1}`;
}

function clearMaterialDisplays(scene: StageSceneState): void {
  for (const displays of scene.pinOutlineMaterialDisplays.values()) {
    for (const display of displays) {
      display.parent?.removeChild(display);
      if (!display.destroyed) display.destroy({ children: true });
    }
  }
  scene.pinOutlineMaterialDisplays.clear();
}

function syncPinGraphics(scene: StageSceneState, pins: readonly PinOutlinePoint[], options: PinOutlineOptions): void {
  const byId = new Map(pins.map((pin) => [pin.id, pin]));
  for (const [id, graphic] of scene.pinOutlinePins) {
    if (byId.has(id)) continue;
    graphic.parent?.removeChild(graphic);
    if (!graphic.destroyed) graphic.destroy();
    scene.pinOutlinePins.delete(id);
  }
  pins.forEach((pin, index) => {
    let graphic = scene.pinOutlinePins.get(pin.id);
    if (!graphic) {
      graphic = new Graphics();
      graphic.eventMode = 'static';
      graphic.cursor = 'grab';
      graphic.on('pointerdown', (event: { global: { x: number; y: number }; stopPropagation?: () => void }) => {
        event.stopPropagation?.();
        options.onPointerDown(pin.id, event.global, scene.disguiseRoot);
      });
      scene.pinOutlinePins.set(pin.id, graphic);
      scene.pinOutlineOverlay.addChild(graphic);
    }
    drawPin(graphic, pin, index);
  });
}

function addMaterialDisplays(scene: StageSceneState, state: PinOutlineState, polygon: readonly Point[], options: PinOutlineOptions): void {
  if (state.pins.length < 3 || !state.materials.length || polygon.length < 3) return;
  const metricResults = [...new Set(state.materials.map((material) => material.assetId))]
    .map((assetId) => [assetId, resolvePinOutlineAssetMetrics(assetId)] as const);
  const metricsByAssetId = Object.fromEntries(metricResults.map(([assetId, result]) => [assetId, result.metrics]));
  const textureUrls = metricResults.map(([, result]) => result.textureUrl);
  const placements = buildPinOutlinePlacements(
    state.pins,
    state.segments,
    state.materials,
    metricsByAssetId,
    { samplesPerSegment: 32 }
  );
  const displaysByMaterial = new Map<string, Container[]>();
  for (const [placementIndex, placement] of placements.entries()) {
    const option = optionById[placement.assetId];
    const decoration = {
      id: `pin-outline:${placement.materialId}:${placementIndex}`,
      code: option?.code ?? placement.assetId,
      assetId: placement.assetId,
      name: 'Pin outline preview',
      x: placement.x,
      y: placement.y,
      scaleX: placement.scaleX,
      scaleY: placement.scaleY,
      rotation: placement.rotation,
      visible: true,
      opacity: 1
    };
    const display = createDecorationVisual(decoration, scene.failedTextures);
    if (!display) continue;
    // Keep the real Pixi visual in the placement pipeline. Its geometric
    // bounds are used as a sanity check, while alpha-trimmed bounds remain
    // the source of boundary alignment so atlas padding cannot create a gap.
    const localBounds = display.getLocalBounds();
    if (localBounds.width > 0 && localBounds.height > 0) {
      const angle = placement.rotation * Math.PI / 180;
      // Align the alpha-trimmed bounds used by the geometry builder. Pixi's
      // getLocalBounds() often includes transparent atlas padding; using it
      // for alignment would visibly pull the native black edge away from the
      // pin path again.
      const visibleBounds = placement.visibleBounds;
      let scale = placement.scaleX;
      let fits = false;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const origin = alignLocalBoundsToBoundary(
          placement.boundaryPoint,
          placement.inwardNormal,
          visibleBounds,
          angle,
          scale
        );
        display.position.set(origin.x, origin.y);
        display.rotation = angle;
        display.scale.set(scale, scale);
        if (localBoundsInsidePolygon(origin, visibleBounds, angle, scale, polygon)) {
          fits = true;
          break;
        }
        scale *= 0.88;
      }
      if (!fits) {
        if (!display.destroyed) display.destroy({ children: true });
        continue;
      }
    }
    display.eventMode = 'none';
    scene.pinOutlineOverlay.addChild(display);
    const list = displaysByMaterial.get(placement.materialId) ?? [];
    list.push(display);
    displaysByMaterial.set(placement.materialId, list);
  }
  scene.pinOutlineMaterialDisplays = displaysByMaterial;
  scene.pinOutlineMetricsCleanup = watchPinOutlineAssetTextures(textureUrls, () => {
    syncPinOutlineOverlay(scene, scene.pinOutlineState, options, true);
  });
}

export function syncPinOutlineOverlay(
  scene: StageSceneState,
  state: PinOutlineState,
  options: PinOutlineOptions,
  force = false
): void {
  if (!force && scene.pinOutlineState === state) return;
  scene.pinOutlineMetricsCleanup?.();
  scene.pinOutlineMetricsCleanup = null;
  clearMaterialDisplays(scene);
  scene.pinOutlineState = state;
  scene.pinOutlineOverlay.visible = state.active && state.pins.length > 0;
  scene.pinOutlineOverlay.eventMode = state.active ? 'static' : 'none';
  syncPinGraphics(scene, state.pins, options);
  const path = closePinPath(state.pins, state.segments, PATH_SAMPLES);
  drawPath(scene.pinOutlinePathGraphic, path, state.pins.length >= 3);
  scene.pinOutlinePathGraphic.eventMode = 'none';
  if (!state.active || state.pins.length < 3) return;
  const polygon = path.length > 1 && Math.hypot(path[0].x - path[path.length - 1].x, path[0].y - path[path.length - 1].y) < 0.0001
    ? path.slice(0, -1)
    : path;
  addMaterialDisplays(scene, state, polygon, options);
}
