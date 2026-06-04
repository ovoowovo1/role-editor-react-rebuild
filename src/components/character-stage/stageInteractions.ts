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

export function createStagePointerHandlers(refs: StageRuntimeRefs) {
  const handleBrushDown = (event: FederatedPointerEvent) => {
    beginBrushFillDraw(event, refs);
  };

  const handleMove = (event: FederatedPointerEvent) => {
    if (refs.brushDrawRef.current) {
      appendBrushFillPoint(event, refs);
      return;
    }

    updateDecorationDrag(event, refs);
  };

  const handleUp = () => {
    if (commitBrushFillDraw(refs)) {
      return;
    }

    commitDecorationDrag(refs);
  };

  return {
    handleBrushDown,
    handleMove,
    handleUp
  };
}
