import type { FederatedPointerEvent } from 'pixi.js';
import {
  appendBrushFillPoint,
  beginBrushFillDraw,
  commitBrushFillDraw
} from './brushFillInteractions';
import {
  beginDecorationDrag,
  commitDecorationDrag,
  updateDecorationDrag
} from './dragInteractions';
import { hitTestDecorationAt, hitTestDecorationsInRect } from './decorationHitIndex';
import { ensureDecorationHitIndex, syncSelectionControllerForIds } from './sceneSync';
import type { StagePointerPosition, StageRuntimeRefs } from './types';

export { beginDecorationDrag } from './dragInteractions';

const CLICK_MOVE_TOLERANCE_SQUARED = 4 ** 2;

function pointerPosition(event: FederatedPointerEvent): StagePointerPosition {
  return { x: event.global.x, y: event.global.y };
}

export function createStagePointerHandlers(
  refs: StageRuntimeRefs,
  onRenderRequest?: () => void
) {
  let pointerDown: { x: number; y: number; emptyStageTarget: boolean } | null = null;
  let pendingMove: StagePointerPosition | null = null;
  let moveRafId = 0;
  let marquee: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    additive: boolean;
    moved: boolean;
  } | null = null;

  const drawMarqueeBox = () => {
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
  };

  const pointerMovedFromDown = (event: FederatedPointerEvent): boolean => {
    if (!pointerDown) return false;
    const dx = event.global.x - pointerDown.x;
    const dy = event.global.y - pointerDown.y;
    return dx * dx + dy * dy > CLICK_MOVE_TOLERANCE_SQUARED;
  };

  const hasActivePointerOperation = (): boolean => Boolean(
    refs.brushDrawRef.current || refs.dragRef.current || marquee
  );

  const applyPointerMove = (position: StagePointerPosition): boolean => {
    if (marquee) {
      const scene = refs.sceneRef.current;
      if (!scene) return false;
      const local = scene.disguiseRoot.toLocal(position);
      marquee.currentX = local.x;
      marquee.currentY = local.y;
      if (!marquee.moved) {
        const dx = local.x - marquee.startX;
        const dy = local.y - marquee.startY;
        if (dx * dx + dy * dy > CLICK_MOVE_TOLERANCE_SQUARED) {
          marquee.moved = true;
        }
      }
      drawMarqueeBox();
      onRenderRequest?.();
      return true;
    }
    const updated = refs.brushDrawRef.current
      ? appendBrushFillPoint(position, refs)
      : updateDecorationDrag(position, refs);
    if (updated) onRenderRequest?.();
    return updated;
  };

  const cancelScheduledMove = () => {
    if (moveRafId) cancelAnimationFrame(moveRafId);
    moveRafId = 0;
    pendingMove = null;
  };

  const flushScheduledMove = (latestPosition?: StagePointerPosition): boolean => {
    if (latestPosition) pendingMove = latestPosition;
    if (moveRafId) cancelAnimationFrame(moveRafId);
    moveRafId = 0;

    const position = pendingMove;
    pendingMove = null;
    return position ? applyPointerMove(position) : false;
  };

  const schedulePointerMove = (event: FederatedPointerEvent): boolean => {
    if (!hasActivePointerOperation()) return false;
    pendingMove = pointerPosition(event);
    if (!moveRafId) {
      moveRafId = requestAnimationFrame(() => {
        moveRafId = 0;
        const position = pendingMove;
        pendingMove = null;
        if (position) applyPointerMove(position);
      });
    }
    return true;
  };

  let pendingSelectRafId = 0;

  const scheduleSelectDecoration = (id: string, additive: boolean) => {
    if (pendingSelectRafId) cancelAnimationFrame(pendingSelectRafId);
    pendingSelectRafId = requestAnimationFrame(() => {
      pendingSelectRafId = 0;
      refs.callbacksRef.current.onSelectDecoration?.(id, additive);
    });
  };

  const handlePointerDown = (event: FederatedPointerEvent) => {
    pointerDown = {
      x: event.global.x,
      y: event.global.y,
      emptyStageTarget: event.target === event.currentTarget
    };

    if (refs.brushFillRef.current.active) {
      beginBrushFillDraw(pointerPosition(event), refs);
      onRenderRequest?.();
      return;
    }

    const scene = refs.sceneRef.current;
    if (!scene || !scene.decorationInteractionEnabled) return;

    const additive = Boolean(event.shiftKey || event.ctrlKey || event.metaKey);
    const canHitTestTarget =
      event.target === event.currentTarget ||
      (additive && event.target === scene.selectionDragController);
    if (refs.dragRef.current || !canHitTestTarget) return;

    const local = scene.disguiseRoot.toLocal(event.global);
    const hitId = hitTestDecorationAt(
      ensureDecorationHitIndex(scene, refs.roleRef.current),
      local.x,
      local.y
    );
    if (!hitId) {
      if (event.target === event.currentTarget) {
        marquee = {
          startX: local.x,
          startY: local.y,
          currentX: local.x,
          currentY: local.y,
          additive,
          moved: false
        };
      }
      return;
    }

    pointerDown.emptyStageTarget = false;
    const currentSelected = refs.selectedIdsRef.current;

    if (additive) {
      const nextSelected = currentSelected.includes(hitId)
        ? currentSelected.filter((id) => id !== hitId)
        : [...currentSelected, hitId];
      refs.selectedIdsRef.current = nextSelected;
      scheduleSelectDecoration(hitId, true);
      if (nextSelected.includes(hitId)) {
        beginDecorationDrag(hitId, pointerPosition(event), scene.disguiseRoot, refs, nextSelected);
      }
      return;
    }

    if (currentSelected.includes(hitId)) {
      beginDecorationDrag(hitId, pointerPosition(event), scene.disguiseRoot, refs);
      return;
    }

    refs.selectedIdsRef.current = [hitId];
    beginDecorationDrag(hitId, pointerPosition(event), scene.disguiseRoot, refs, [hitId]);
    scheduleSelectDecoration(hitId, false);
  };

  const handleMove = (event: FederatedPointerEvent) => {
    if (pointerDown && pointerMovedFromDown(event)) {
      pointerDown.emptyStageTarget = false;
    }

    if (schedulePointerMove(event) && pointerDown) {
      pointerDown.emptyStageTarget = false;
    }
  };

  const commitMarqueeSelection = (): boolean => {
    const activeMarquee = marquee;
    marquee = null;
    drawMarqueeBox();
    if (!activeMarquee || !activeMarquee.moved) return false;

    const scene = refs.sceneRef.current;
    if (!scene) return false;
    const boxedIds = hitTestDecorationsInRect(
      ensureDecorationHitIndex(scene, refs.roleRef.current),
      activeMarquee.startX,
      activeMarquee.startY,
      activeMarquee.currentX,
      activeMarquee.currentY
    );
    const nextIds = activeMarquee.additive
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
    onRenderRequest?.();
    return true;
  };

  const finishPointerOperation = (event: FederatedPointerEvent): boolean => {
    if (hasActivePointerOperation()) {
      flushScheduledMove(pointerPosition(event));
    }
    if (commitMarqueeSelection()) {
      return true;
    }
    if (commitBrushFillDraw(refs)) {
      onRenderRequest?.();
      return true;
    }
    if (commitDecorationDrag(refs)) {
      onRenderRequest?.();
      return true;
    }
    return false;
  };

  const handleUp = (event: FederatedPointerEvent) => {
    const shouldClearSelection = Boolean(
      pointerDown?.emptyStageTarget &&
      event.target === event.currentTarget &&
      true
    );
    pointerDown = null;

    if (finishPointerOperation(event)) return;

    if (shouldClearSelection) {
      refs.callbacksRef.current.onClearSelection();
    }
  };

  const handleUpOutside = (event: FederatedPointerEvent) => {
    pointerDown = null;
    finishPointerOperation(event);
  };

  const dispose = () => {
    pointerDown = null;
    marquee = null;
    drawMarqueeBox();
    if (pendingSelectRafId) cancelAnimationFrame(pendingSelectRafId);
    pendingSelectRafId = 0;
    cancelScheduledMove();
  };

  return {
    handlePointerDown,
    handleMove,
    handleUp,
    handleUpOutside,
    dispose
  };
}
