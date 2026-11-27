import { hitTestDecorationsInRect } from './decorationHitIndex';
import { ensureDecorationHitIndex, syncSelectionControllerForIds } from './sceneSync';
import type { StagePointerPosition, StageRuntimeRefs } from './types';

export interface MarqueeSelectionState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
  moved: boolean;
}

export function drawMarqueeSelectionBox(
  refs: StageRuntimeRefs,
  marquee: MarqueeSelectionState | null
): void {
  const graphic = refs.sceneRef.current?.marqueeSelectionGraphic;
  if (!graphic) return;
  if (!marquee || !marquee.moved) {
    graphic.clear();
    graphic.visible = false;
    return;
  }
  const left = Math.min(marquee.startX, marquee.currentX);
  const top = Math.min(marquee.startY, marquee.currentY);
  const width = Math.abs(marquee.currentX - marquee.startX);
  const height = Math.abs(marquee.currentY - marquee.startY);
  graphic.clear();
  graphic.lineStyle(1.5, 0x38bdf8, 0.95);
  graphic.beginFill(0x38bdf8, 0.14);
  graphic.drawRect(left, top, width, height);
  graphic.endFill();
  graphic.visible = true;
}

export function beginMarqueeSelection(
  localX: number,
  localY: number,
  additive: boolean
): MarqueeSelectionState {
  return {
    startX: localX,
    startY: localY,
    currentX: localX,
    currentY: localY,
    additive,
    moved: false
  };
}

export function updateMarqueeSelection(
  marquee: MarqueeSelectionState,
  global: StagePointerPosition,
  refs: StageRuntimeRefs,
  moveToleranceSquared: number
): boolean {
  const scene = refs.sceneRef.current;
  if (!scene) return false;
  const local = scene.disguiseRoot.toLocal(global);
  marquee.currentX = local.x;
  marquee.currentY = local.y;
  if (!marquee.moved) {
    const dx = local.x - marquee.startX;
    const dy = local.y - marquee.startY;
    if (dx * dx + dy * dy > moveToleranceSquared) {
      marquee.moved = true;
    }
  }
  drawMarqueeSelectionBox(refs, marquee);
  return true;
}

export function commitMarqueeSelection(
  marquee: MarqueeSelectionState | null,
  refs: StageRuntimeRefs
): boolean {
  drawMarqueeSelectionBox(refs, null);
  if (!marquee || !marquee.moved) return false;

  const scene = refs.sceneRef.current;
  if (!scene) return false;

  const boxedIds = hitTestDecorationsInRect(
    ensureDecorationHitIndex(scene, refs.roleRef.current),
    marquee.startX,
    marquee.startY,
    marquee.currentX,
    marquee.currentY
  );
  const nextIds = marquee.additive
    ? Array.from(new Set([...refs.selectedIdsRef.current, ...boxedIds]))
    : boxedIds;
  refs.selectedIdsRef.current = nextIds;
  syncSelectionControllerForIds(
    scene,
    nextIds,
    false,
    refs.headGlowAlwaysOnRef?.current ?? false
  );
  refs.callbacksRef.current.onSelectMultipleDecorations?.(nextIds);
  return true;
}
