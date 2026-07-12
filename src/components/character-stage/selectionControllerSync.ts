import { Container, Rectangle } from 'pixi.js';
import type { DecorationLayer } from '../../types/role';
import { clamp } from '../../lib/math';
import {
  decorationDisplayKey,
  mergeBounds,
  pointBounds,
  selectionControllerPosition,
  selectionDragHitRect,
  selectionDragVisualKey,
  shouldUsePointBoundsForSelection,
  type LocalBounds
} from '../../lib/stage/characterStageHelpers';
import { createDecorationVisual } from './pixiVisuals';
import { getCachedControllerGlowFilter } from './stageOverlayVisuals';
import type { StageSceneState } from './types';
import { getDisplayRootPosition } from './sceneGeometry';

function containerBoundsInRoot(container: Container, root: Container): LocalBounds {
  const localBounds = container.getLocalBounds();
  if (
    !Number.isFinite(localBounds.width) ||
    !Number.isFinite(localBounds.height) ||
    localBounds.width <= 0 ||
    localBounds.height <= 0
  ) {
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
    bounds = mergeBounds(bounds, {
      minX: local.x,
      minY: local.y,
      maxX: local.x,
      maxY: local.y
    });
  }

  return bounds ?? pointBounds(container.x, container.y);
}

export function hideSelectionDragController(scene: StageSceneState): void {
  scene.selectionDragTargetId = null;
  scene.selectionDragVisualKey = '';
  scene.selectionDragVisualsById.clear();
  scene.selectionDragVisualDisplayKeysById.clear();
  scene.selectionDragController.visible = false;
  scene.selectionDragController.eventMode = 'none';
  scene.selectionDragController.hitArea = null;
  scene.selectionDragController.filters = null;
  scene.selectionDragControllerGraphic.clear();
  scene.selectionDragControllerVisuals.removeChildren().forEach((child) => {
    if (!child.destroyed) child.destroy({ children: true });
  });
}

function selectionBounds(scene: StageSceneState, selectedDecorations: DecorationLayer[]): LocalBounds | null {
  let bounds: LocalBounds | null = null;

  if (shouldUsePointBoundsForSelection(selectedDecorations.length)) {
    for (const deco of selectedDecorations) {
      bounds = mergeBounds(bounds, pointBounds(deco.x, deco.y));
    }
    return bounds;
  }

  for (const deco of selectedDecorations) {
    const record = scene.decoDisplays.get(deco.id);
    if (!record) continue;
    bounds = mergeBounds(bounds, containerBoundsInRoot(record.container, scene.disguiseRoot));
  }

  return bounds;
}

function replaceControllerVisualOrder(root: Container, visuals: Container[]): void {
  const current = root.children;
  if (
    current.length === visuals.length &&
    current.every((child, index) => child === visuals[index])
  ) {
    return;
  }

  root.removeChildren();
  const chunkSize = 1000;
  for (let index = 0; index < visuals.length; index += chunkSize) {
    root.addChild(...visuals.slice(index, index + chunkSize));
  }
}

export function syncSelectionDragControllerVisuals(
  scene: StageSceneState,
  selectedDecorations: DecorationLayer[],
  centerX: number,
  centerY: number
): void {
  const nextKey = selectionDragVisualKey(selectedDecorations);
  if (scene.selectionDragVisualKey !== nextKey) {
    const nextDecorationsById = new Map(selectedDecorations.map((deco) => [deco.id, deco]));

    for (const [id, visual] of scene.selectionDragVisualsById) {
      const deco = nextDecorationsById.get(id);
      const displayKey = deco ? decorationDisplayKey(deco) : null;
      if (displayKey && scene.selectionDragVisualDisplayKeysById.get(id) === displayKey) continue;
      if (visual.parent === scene.selectionDragControllerVisuals) {
        scene.selectionDragControllerVisuals.removeChild(visual);
      }
      if (!visual.destroyed) visual.destroy({ children: true });
      scene.selectionDragVisualsById.delete(id);
      scene.selectionDragVisualDisplayKeysById.delete(id);
    }

    for (const deco of selectedDecorations) {
      if (scene.selectionDragVisualsById.has(deco.id)) continue;
      const visual = createDecorationVisual(deco, scene.failedTextures);
      if (!visual) continue;
      visual.eventMode = 'none';
      visual.cursor = 'default';
      scene.selectionDragVisualsById.set(deco.id, visual);
      scene.selectionDragVisualDisplayKeysById.set(deco.id, decorationDisplayKey(deco));
    }

    replaceControllerVisualOrder(
      scene.selectionDragControllerVisuals,
      selectedDecorations
        .map((deco) => scene.selectionDragVisualsById.get(deco.id))
        .filter((visual): visual is Container => Boolean(visual))
    );
    scene.selectionDragVisualKey = nextKey;
  }

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

export function syncSelectionDragController(
  scene: StageSceneState,
  selectedDecorations: DecorationLayer[],
  hasActiveDrag: boolean
): void {
  if (hasActiveDrag) {
    hideSelectionDragController(scene);
    return;
  }

  const visibleSelections = selectedDecorations.filter((deco) => deco.visible !== false);
  const target = visibleSelections[0];
  if (!target) {
    hideSelectionDragController(scene);
    return;
  }

  const bounds = selectionBounds(scene, visibleSelections);
  if (!bounds) {
    hideSelectionDragController(scene);
    return;
  }

  const center = selectionControllerPosition(visibleSelections);
  const hitRect = selectionDragHitRect(bounds, center.x, center.y);
  const hitArea = new Rectangle(hitRect.x, hitRect.y, hitRect.width, hitRect.height);

  scene.selectionDragTargetId = target.id;
  scene.selectionDragController.position.set(center.x, center.y);
  scene.selectionDragController.visible = true;
  scene.selectionDragController.eventMode = 'static';
  scene.selectionDragController.cursor = 'pointer';
  scene.selectionDragController.hitArea = hitArea;
  scene.selectionDragController.filters = [getCachedControllerGlowFilter()];
  syncSelectionDragControllerVisuals(scene, visibleSelections, center.x, center.y);
  scene.selectionDragControllerGraphic.clear();
  scene.selectionDragControllerGraphic.beginFill(0x000000, 0.001);
  scene.selectionDragControllerGraphic.drawRect(hitArea.x, hitArea.y, hitArea.width, hitArea.height);
  scene.selectionDragControllerGraphic.endFill();
}
