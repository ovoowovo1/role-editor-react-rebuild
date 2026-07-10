import {
  useCallback,
  useRef,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from 'react';
import type { DecorationGroup } from '../../types/role';
import type { LayerReorderOptions } from '../../lib/editor/editorLayerDrag';
import {
  canJoinTargetGroup,
  closestDraggableTarget,
  dropStateForTarget,
  type DraggableTarget,
  type LayerDragState
} from './layerListVirtualization';
import {
  dragDropStateMatches,
  reorderOptionsForDragState
} from './layerListDragHelpers';

export function useLayerListPointerDrag({
  scrollRef,
  dragStateRef,
  setDragState,
  draggableTargets,
  groups,
  onReorder
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  dragStateRef: MutableRefObject<LayerDragState | null>;
  setDragState(next: LayerDragState | null): void;
  draggableTargets: DraggableTarget[];
  groups: DecorationGroup[];
  onReorder(activeId: string, overId: string, options?: LayerReorderOptions): void;
}) {
  const dragPointerIdRef = useRef<number | null>(null);
  const latestPointerYRef = useRef(0);
  const pointerMoveFrameRef = useRef<number | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);

  const updatePointerOver = useCallback(
    (clientY: number, viewportRect?: DOMRect) => {
      const scrollEl = scrollRef.current;
      const currentDrag = dragStateRef.current;
      if (!scrollEl || !currentDrag) return;

      const rect = viewportRect ?? scrollEl.getBoundingClientRect();
      const virtualY = clientY - rect.top + scrollEl.scrollTop;
      const target = closestDraggableTarget(draggableTargets, virtualY);
      if (!target) return;

      const dropState = dropStateForTarget(
        target,
        virtualY,
        'pointer',
        canJoinTargetGroup(currentDrag.activeRowId, target, groups),
        currentDrag.activeRowId,
        groups
      );
      if (dragDropStateMatches(currentDrag, dropState)) return;

      const next: LayerDragState = {
        ...currentDrag,
        overRowId: dropState.overRowId,
        intent: dropState.intent,
        placement: dropState.placement,
        joinGroupId: dropState.joinGroupId,
        parentGroupId: dropState.parentGroupId,
        anchorGroupId: dropState.anchorGroupId
      };
      dragStateRef.current = next;
      setDragState(next);
    },
    [dragStateRef, draggableTargets, groups, scrollRef, setDragState]
  );

  const stopPointerMoveFrame = useCallback(() => {
    if (pointerMoveFrameRef.current != null) {
      cancelAnimationFrame(pointerMoveFrameRef.current);
      pointerMoveFrameRef.current = null;
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current != null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current != null) return;

    const tick = () => {
      const scrollEl = scrollRef.current;
      if (!scrollEl || dragPointerIdRef.current == null) {
        autoScrollFrameRef.current = null;
        return;
      }

      const rect = scrollEl.getBoundingClientRect();
      const y = latestPointerYRef.current;
      const edgeSize = Math.min(64, rect.height / 3);
      const topDistance = y - rect.top;
      const bottomDistance = rect.bottom - y;
      let delta = 0;

      if (topDistance < edgeSize) {
        delta = -Math.ceil((edgeSize - topDistance) / 4);
      } else if (bottomDistance < edgeSize) {
        delta = Math.ceil((edgeSize - bottomDistance) / 4);
      }

      if (delta === 0) {
        autoScrollFrameRef.current = null;
        return;
      }

      const previousScrollTop = scrollEl.scrollTop;
      scrollEl.scrollTop += delta;
      if (scrollEl.scrollTop === previousScrollTop) {
        autoScrollFrameRef.current = null;
        return;
      }
      updatePointerOver(y, rect);
      autoScrollFrameRef.current = requestAnimationFrame(tick);
    };

    autoScrollFrameRef.current = requestAnimationFrame(tick);
  }, [scrollRef, updatePointerOver]);

  const flushPointerMove = useCallback(() => {
    stopPointerMoveFrame();
    if (dragPointerIdRef.current != null) {
      updatePointerOver(latestPointerYRef.current);
    }
  }, [stopPointerMoveFrame, updatePointerOver]);

  const schedulePointerMove = useCallback(() => {
    if (pointerMoveFrameRef.current != null) return;
    pointerMoveFrameRef.current = requestAnimationFrame(() => {
      pointerMoveFrameRef.current = null;
      if (dragPointerIdRef.current == null) return;
      updatePointerOver(latestPointerYRef.current);
      startAutoScroll();
    });
  }, [startAutoScroll, updatePointerOver]);

  const stopPointerDragEffects = useCallback(() => {
    stopPointerMoveFrame();
    stopAutoScroll();
  }, [stopAutoScroll, stopPointerMoveFrame]);

  const finishPointerDrag = useCallback(
    (commit: boolean) => {
      if (commit) flushPointerMove();
      stopPointerDragEffects();
      dragPointerIdRef.current = null;

      const current = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      if (commit && current && current.activeRowId !== current.overRowId) {
        onReorder(current.activeRowId, current.overRowId, reorderOptionsForDragState(current));
      }
    },
    [dragStateRef, flushPointerMove, onReorder, setDragState, stopPointerDragEffects]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      latestPointerYRef.current = event.clientY;
      schedulePointerMove();
    },
    [schedulePointerMove]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      latestPointerYRef.current = event.clientY;
      finishPointerDrag(true);
    },
    [finishPointerDrag]
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      finishPointerDrag(false);
    },
    [finishPointerDrag]
  );

  const startPointerDrag = useCallback(
    (rowId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      stopPointerDragEffects();
      dragPointerIdRef.current = event.pointerId;
      latestPointerYRef.current = event.clientY;
      const next: LayerDragState = {
        activeRowId: rowId,
        overRowId: rowId,
        mode: 'pointer',
        intent: 'sort'
      };
      dragStateRef.current = next;
      setDragState(next);
    },
    [dragStateRef, setDragState, stopPointerDragEffects]
  );

  return {
    startPointerDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    stopPointerDragEffects
  };
}
