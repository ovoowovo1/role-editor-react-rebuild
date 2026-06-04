import { FederatedPointerEvent } from 'pixi.js';
import type { BrushFillPoint } from '../../lib/conversion/brushFillToDeco';
import {
  appendBrushPoint,
  committedBrushFillMask
} from '../../lib/stage/characterStageHelpers';
import {
  drawBrushFillOverlay
} from './stageOverlayVisuals';
import {
  syncDisguiseChildOrder
} from './sceneSync';
import type { StageRuntimeRefs } from './types';

export function beginBrushFillDraw(event: FederatedPointerEvent, refs: StageRuntimeRefs): boolean {
  if (!refs.brushFillRef.current.active) return false;
  const currentScene = refs.sceneRef.current;
  if (!currentScene) return true;

  refs.dragRef.current = null;
  const local = currentScene.disguiseRoot.toLocal(event.global);
  refs.brushDrawRef.current = {
    points: [{
      x: local.x,
      y: local.y,
      radius: Math.max(1, refs.brushFillRef.current.brushSize / 2)
    }]
  };
  drawBrushFillOverlay(currentScene, refs.brushFillRef.current.mask, refs.brushDrawRef.current.points);
  syncDisguiseChildOrder(currentScene, refs.roleRef.current);
  return true;
}

export function appendBrushFillPoint(event: FederatedPointerEvent, refs: StageRuntimeRefs): boolean {
  const currentScene = refs.sceneRef.current;
  const drawing = refs.brushDrawRef.current;
  if (!currentScene || !drawing || !refs.brushFillRef.current.active) return false;

  const local = currentScene.disguiseRoot.toLocal(event.global);
  const nextPoint: BrushFillPoint = {
    x: local.x,
    y: local.y,
    radius: Math.max(1, refs.brushFillRef.current.brushSize / 2)
  };
  const nextPoints = appendBrushPoint(drawing.points, nextPoint);
  if (nextPoints === drawing.points) return true;

  drawing.points = nextPoints;
  drawBrushFillOverlay(currentScene, refs.brushFillRef.current.mask, drawing.points);
  syncDisguiseChildOrder(currentScene, refs.roleRef.current);
  return true;
}

export function commitBrushFillDraw(refs: StageRuntimeRefs): boolean {
  const drawing = refs.brushDrawRef.current;
  if (!drawing) return false;

  const currentScene = refs.sceneRef.current;
  const nextMask = committedBrushFillMask(refs.brushFillRef.current.mask, drawing.points);
  refs.brushDrawRef.current = null;
  refs.brushFillRef.current = { ...refs.brushFillRef.current, mask: nextMask };
  if (currentScene) {
    drawBrushFillOverlay(currentScene, nextMask);
    syncDisguiseChildOrder(currentScene, refs.roleRef.current);
  }
  refs.callbacksRef.current.onBrushFillMaskChange?.(nextMask);
  return true;
}
