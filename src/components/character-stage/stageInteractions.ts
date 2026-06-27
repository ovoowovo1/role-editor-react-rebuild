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
import type { StageRuntimeRefs } from './types';

export { beginDecorationDrag } from './dragInteractions';

const CLICK_MOVE_TOLERANCE = 4;

export function createStagePointerHandlers(refs: StageRuntimeRefs) {
  let pointerDown: { x: number; y: number; emptyStageTarget: boolean } | null = null;

  const pointerMovedFromDown = (event: FederatedPointerEvent): boolean => {
    if (!pointerDown) return false;
    const dx = event.global.x - pointerDown.x;
    const dy = event.global.y - pointerDown.y;
    return Math.hypot(dx, dy) > CLICK_MOVE_TOLERANCE;
  };

  const handleBrushDown = (event: FederatedPointerEvent) => {
    pointerDown = {
      x: event.global.x,
      y: event.global.y,
      emptyStageTarget: event.target === event.currentTarget
    };

    if (refs.brushFillRef.current.active) {
      beginBrushFillDraw(event, refs);
    }
  };

  const handleMove = (event: FederatedPointerEvent) => {
    if (pointerDown && pointerMovedFromDown(event)) {
      pointerDown.emptyStageTarget = false;
    }

    if (refs.brushDrawRef.current) {
      appendBrushFillPoint(event, refs);
      return;
    }

    if (updateDecorationDrag(event, refs) && pointerDown) {
      pointerDown.emptyStageTarget = false;
    }
  };

  const handleUp = (event: FederatedPointerEvent) => {
    const shouldClearSelection = Boolean(
      pointerDown?.emptyStageTarget &&
      event.target === event.currentTarget &&
      refs.selectedIdsRef.current.length
    );
    pointerDown = null;

    if (commitBrushFillDraw(refs)) {
      return;
    }

    if (commitDecorationDrag(refs)) {
      return;
    }

    if (shouldClearSelection) {
      refs.callbacksRef.current.onClearSelection();
    }
  };

  const handleUpOutside = () => {
    pointerDown = null;
    if (commitBrushFillDraw(refs)) {
      return;
    }

    commitDecorationDrag(refs);
  };

  return {
    handleBrushDown,
    handleMove,
    handleUp,
    handleUpOutside
  };
}
