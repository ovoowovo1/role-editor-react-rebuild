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
import { hitTestDecorationAt } from './decorationHitIndex';
import {
  beginMarqueeSelection,
  commitMarqueeSelection,
  drawMarqueeSelectionBox,
  updateMarqueeSelection,
  type MarqueeSelectionState
} from './marqueeInteractions';
import { ensureDecorationHitIndex } from './sceneSync';
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
  let pendingSelectRafId = 0;
  let marquee: MarqueeSelectionState | null = null;

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
      const updated = updateMarqueeSelection(marquee, position, refs, CLICK_MOVE_TOLERANCE_SQUARED);
      if (updated) onRenderRequest?.();
      return updated;
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
        marquee = beginMarqueeSelection(local.x, local.y, additive);
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

  const finishPointerOperation = (event: FederatedPointerEvent): boolean => {
    if (hasActivePointerOperation()) {
      flushScheduledMove(pointerPosition(event));
    }
    const activeMarquee = marquee;
    marquee = null;
    if (commitMarqueeSelection(activeMarquee, refs)) {
      onRenderRequest?.();
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
    drawMarqueeSelectionBox(refs, null);
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
