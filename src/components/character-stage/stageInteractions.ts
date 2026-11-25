import type { FederatedPointerEvent } from 'pixi.js';
import {
  appendBrushFillPoint,
  beginBrushFillDraw,
  commitBrushFillDraw
} from './brushFillInteractions';
import {
  commitDecorationDrag,
  updateDecorationDrag
} from './dragInteractions';
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

  const pointerMovedFromDown = (event: FederatedPointerEvent): boolean => {
    if (!pointerDown) return false;
    const dx = event.global.x - pointerDown.x;
    const dy = event.global.y - pointerDown.y;
    return dx * dx + dy * dy > CLICK_MOVE_TOLERANCE_SQUARED;
  };

  const hasActivePointerOperation = (): boolean => Boolean(
    refs.brushDrawRef.current || refs.dragRef.current
  );

  const applyPointerMove = (position: StagePointerPosition): boolean => {
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

  const handlePointerDown = (event: FederatedPointerEvent) => {
    pointerDown = {
      x: event.global.x,
      y: event.global.y,
      emptyStageTarget: event.target === event.currentTarget
    };

    if (refs.brushFillRef.current.active) {
      beginBrushFillDraw(pointerPosition(event), refs);
      onRenderRequest?.();
    }
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
