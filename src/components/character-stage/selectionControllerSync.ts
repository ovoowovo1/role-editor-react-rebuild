import { Container, Rectangle } from 'pixi.js';
import type { DecorationLayer, RoleDocument } from '../../types/role';
import { clamp } from '../../lib/math';
import {
  mergeBounds,
  pointBounds,
  selectionControllerPosition,
  selectionDragHitRect,
  selectionDragVisualKey,
  shouldUsePointBoundsForSelection,
  type LocalBounds
} from '../../lib/stage/characterStageHelpers';
import {
  createDecorationVisual
} from './pixiVisuals';
import { getCachedControllerGlowFilter } from './stageOverlayVisuals';
import type { StageSceneState } from './types';
import { getDisplayRootPosition } from './sceneGeometry';

function containerBoundsInRoot(container: Container, root: Container): LocalBounds {
  const localBounds = container.getLocalBounds();
  if (!Number.isFinite(localBounds.width) || !Number.isFinite(localBounds.height) || localBounds.width <= 0 || localBounds.height <= 0) {
    const position = getDisplayRootPosition(container, root);
    return pointBounds(position.x, position.y);
  }

  let bounds: LocalBounds | null = null;
  const corners = [
    { x: localBounds.x, y: localBounds.y },
    { x: localBounds.x + localBounds.width, y: localBounds.y },
    { x: localBounds.x + localBounds.width, y: localBounds.y + localBounds.height },
    { x: localBounds.x, y: localBounds.y + localBounds.height }
  ];
  for (const corner of corners) {
    const global = container.toGlobal(corner);
    const local = root.toLocal(global);
    bounds = mergeBounds(bounds, { minX: local.x, minY: local.y, maxX: local.x, maxY: local.y });
  }
  return bounds ?? pointBounds(container.x, container.y);
}

export function hideSelectionDragController(scene: StageSceneState): void {
  scene.selectionDragTargetId = null;
  scene.selectionDragVisualKey = '';
  scene.selectionDragVisualsById.clear();
  scene.selectionDragController.visible = false;
  scene.selectionDragController.eventMode = 'none';
  scene.selectionDragController.hitArea = null;
  scene.selectionDragController.filters = null;
  scene.selectionDragControllerGraphic.clear();
  scene.selectionDragControllerVisuals.removeChildren().forEach((child) => {
    if (!child.destroyed) child.destroy({ children: true });
  });
}

function syncSelectionDragControllerVisuals(
  scene: StageSceneState,
  selectedDecorations: DecorationLayer[],
  centerX: number,
  centerY: number
): void {
  const nextKey = selectionDragVisualKey(selectedDecorations, centerX, centerY);
  if (scene.selectionDragVisualKey === nextKey) return;

  scene.selectionDragVisualKey = nextKey;
  scene.selectionDragVisualsById.clear();
  scene.selectionDragControllerVisuals.removeChildren().forEach((child) => {
    if (!child.destroyed) child.destroy({ children: true });
  });

  for (const deco of selectedDecorations) {
    const visual = createDecorationVisual(deco, scene.failedTextures);
    if (!visual) continue;
    visual.eventMode = 'none';
    visual.cursor = 'default';
    visual.position.set(deco.x - centerX, deco.y - centerY);
    scene.selectionDragControllerVisuals.addChild(visual);
    scene.selectionDragVisualsById.set(deco.id, visual);
  }
}

function syncSelectionDragControllerVisualTransforms(
  scene: StageSceneState,
  selectedDecorations: DecorationLayer[],
  centerX: number,
  centerY: number
): void {
  for (const deco of selectedDecorations) {
    const visual = scene.selectionDragVisualsById.get(deco.id);
    if (!visual) continue;
    visual.position.set(deco.x - centerX, deco.y - centerY);
    visual.rotation = (deco.rotation * Math.PI) / 180;
    visual.scale.set(deco.scaleX, deco.scaleY);
    visual.alpha = clamp(deco.opacity, 0, 1);
    visual.visible = deco.visible !== false;
  }
}

function selectionDragHitArea(bounds: LocalBounds, centerX: number, centerY: number): Rectangle {
  const rect = selectionDragHitRect(bounds, centerX, centerY);
  return new Rectangle(rect.x, rect.y, rect.width, rect.height);
}

export function syncSelectionDragController(
  scene: StageSceneState,
  role: RoleDocument,
  selectedIds: string[],
  hasActiveOverlay: boolean
): void {
  if (hasActiveOverlay) {
    hideSelectionDragController(scene);
    return;
  }

  const selectedSet = new Set(selectedIds);
  const selectedDecorations = role.decorations.filter((deco) => selectedSet.has(deco.id) && deco.visible !== false);
  const target = selectedDecorations[0];
  if (!target) {
    hideSelectionDragController(scene);
    return;
  }

  let bounds: LocalBounds | null = null;
  if (shouldUsePointBoundsForSelection(selectedDecorations.length)) {
    for (const deco of selectedDecorations) {
      bounds = mergeBounds(bounds, pointBounds(deco.x, deco.y));
    }
  } else {
    for (const deco of selectedDecorations) {
      const record = scene.decoDisplays.get(deco.id);
      if (!record) continue;
      bounds = mergeBounds(bounds, containerBoundsInRoot(record.container, scene.disguiseRoot));
    }
  }

  if (!bounds) {
    hideSelectionDragController(scene);
    return;
  }

  const center = selectionControllerPosition(selectedDecorations);
  const centerX = center.x;
  const centerY = center.y;
  const hitArea = selectionDragHitArea(bounds, centerX, centerY);

  scene.selectionDragTargetId = target.id;
  scene.selectionDragController.position.set(centerX, centerY);
  scene.selectionDragController.visible = true;
  scene.selectionDragController.eventMode = 'static';
  scene.selectionDragController.cursor = 'pointer';
  scene.selectionDragController.hitArea = hitArea;
  scene.selectionDragController.filters = [getCachedControllerGlowFilter()];
  syncSelectionDragControllerVisuals(scene, selectedDecorations, centerX, centerY);
  syncSelectionDragControllerVisualTransforms(scene, selectedDecorations, centerX, centerY);
  scene.selectionDragControllerGraphic.clear();
  scene.selectionDragControllerGraphic.beginFill(0x000000, 0.001);
  scene.selectionDragControllerGraphic.drawRect(hitArea.x, hitArea.y, hitArea.width, hitArea.height);
  scene.selectionDragControllerGraphic.endFill();
}
