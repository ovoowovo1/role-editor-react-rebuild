import type { BrushFillPoint } from '../../lib/conversion/brushFillToDeco';
import {
  committedBrushFillMask,
  interpolatedBrushPoints
} from '../../lib/stage/characterStageHelpers';
import {
  appendBrushFillDraft,
  beginBrushFillDraft,
  drawBrushFillOverlay
} from './stageOverlayVisuals';
import {
  setDecorationInteractionEnabled
} from './sceneSync';
import type { StagePointerPosition, StageRuntimeRefs } from './types';

export function beginBrushFillDraw(global: StagePointerPosition, refs: StageRuntimeRefs): boolean {
  if (!refs.brushFillRef.current.active) return false;
  const currentScene = refs.sceneRef.current;
  if (!currentScene) return true;
  if (refs.dragRef.current || refs.brushDrawRef.current) return true;

  setDecorationInteractionEnabled(currentScene, false);
  const local = currentScene.disguiseRoot.toLocal(global);
  const point: BrushFillPoint = {
    x: local.x,
    y: local.y,
    radius: Math.max(1, refs.brushFillRef.current.brushSize / 2)
  };
  refs.brushDrawRef.current = { points: [point] };

  beginBrushFillDraft(currentScene, refs.brushFillRef.current.mask, [point]);
  return true;
}

export function appendBrushFillPoint(global: StagePointerPosition, refs: StageRuntimeRefs): boolean {
  const currentScene = refs.sceneRef.current;
  const drawing = refs.brushDrawRef.current;
  if (!currentScene || !drawing || !refs.brushFillRef.current.active) return false;

  const local = currentScene.disguiseRoot.toLocal(global);
  const nextPoint: BrushFillPoint = {
    x: local.x,
    y: local.y,
    radius: Math.max(1, refs.brushFillRef.current.brushSize / 2)
  };
  const additions = interpolatedBrushPoints(
    drawing.points[drawing.points.length - 1],
    nextPoint
  );
  if (!additions.length) return true;

  for (const point of additions) drawing.points.push(point);
  appendBrushFillDraft(currentScene, additions);
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
  }
  refs.callbacksRef.current.onBrushFillMaskChange?.(nextMask);
  return true;
}
