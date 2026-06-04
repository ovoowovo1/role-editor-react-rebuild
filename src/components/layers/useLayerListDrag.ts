import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from 'react';
import type { DecorationGroup } from '../../types/role';
import type { LayerReorderOptions } from '../../lib/editor/editorLayerDrag';
import {
  type DraggableTarget,
  type LayerDragState,
  type VirtualLayerRow
} from './layerListVirtualization';
import {
  insertionIndicatorTopForDrag,
  joinTargetGroupIdForDrag
} from './layerListDragHelpers';
import { useLayerListPointerDrag } from './useLayerListPointerDrag';
import { useLayerListDragKeyboard } from './useLayerListDragKeyboard';

interface UseLayerListDragOptions {
  scrollRef: RefObject<HTMLDivElement | null>;
  virtualRows: VirtualLayerRow[];
  offsets: number[];
  heights: number[];
  rowIndexById: Map<string, number>;
  draggableTargets: DraggableTarget[];
  groups: DecorationGroup[];
  onReorder(activeId: string, overId: string, options?: LayerReorderOptions): void;
}

export function useLayerListDrag({
  scrollRef,
  virtualRows,
  offsets,
  heights,
  rowIndexById,
  draggableTargets,
  groups,
  onReorder
}: UseLayerListDragOptions) {
  const [dragState, setDragState] = useState<LayerDragState | null>(null);
  const dragStateRef = useRef<LayerDragState | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const scrollRowIntoView = useCallback(
    (rowId: string) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const index = rowIndexById.get(rowId) ?? -1;
      if (index < 0) return;
      const top = offsets[index];
      const bottom = top + heights[index];
      if (top < scrollEl.scrollTop) {
        scrollEl.scrollTop = top;
      } else if (bottom > scrollEl.scrollTop + scrollEl.clientHeight) {
        scrollEl.scrollTop = bottom - scrollEl.clientHeight;
      }
    },
    [heights, offsets, rowIndexById, scrollRef]
  );

  const {
    startPointerDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    stopAutoScroll
  } = useLayerListPointerDrag({
    scrollRef,
    dragStateRef,
    setDragState,
    draggableTargets,
    groups,
    onReorder
  });

  const {
    startKeyboardDrag,
    cancelKeyboardDrag,
    commitKeyboardDrag,
    moveKeyboardTarget
  } = useLayerListDragKeyboard({
    dragStateRef,
    setDragState,
    virtualRows,
    rowIndexById,
    scrollRowIntoView,
    onReorder
  });

  const dragHandlePropsForRow = useCallback(
    (rowId: string) => ({
      'aria-pressed': dragState?.activeRowId === rowId,
      tabIndex: 0,
      onClick: (event: ReactMouseEvent<HTMLButtonElement>) => event.stopPropagation(),
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => startPointerDrag(rowId, event),
      onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (!dragState) {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            startKeyboardDrag(rowId);
          }
          return;
        }

        if (dragState.activeRowId !== rowId) return;
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveKeyboardTarget(-1);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveKeyboardTarget(1);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          commitKeyboardDrag();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancelKeyboardDrag();
        }
      }
    }),
    [cancelKeyboardDrag, commitKeyboardDrag, dragState, moveKeyboardTarget, startKeyboardDrag, startPointerDrag]
  );

  const insertionIndicatorTop = useMemo(() => {
    return insertionIndicatorTopForDrag({ dragState, rowIndexById, offsets, heights });
  }, [dragState, heights, offsets, rowIndexById]);

  const joinTargetGroupId = joinTargetGroupIdForDrag(dragState);

  useEffect(() => {
    if (dragState?.mode !== 'pointer') return;
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [dragState?.mode, handlePointerCancel, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

  return {
    dragState,
    insertionIndicatorTop,
    joinTargetGroupId,
    dragHandlePropsForRow
  };
}
