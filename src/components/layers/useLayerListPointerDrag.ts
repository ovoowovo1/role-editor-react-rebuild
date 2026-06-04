import { useCallback, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
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
  setDragState(next: LayerDragState | null | ((current: LayerDragState | null) => LayerDragState | null)): void;
  draggableTargets: DraggableTarget[];
  groups: DecorationGroup[];
  onReorder(activeId: string, overId: string, options?: LayerReorderOptions): void;
}) {
  const dragPointerIdRef = useRef<number | null>(null);
  const latestPointerYRef = useRef(0);
  const autoScrollFrameRef = useRef<number | null>(null);

  const updatePointerOver = useCallback(
    (clientY: number) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const rect = scrollEl.getBoundingClientRect();
      const virtualY = clientY - rect.top + scrollEl.scrollTop;
      const target = closestDraggableTarget(draggableTargets, virtualY);
      if (!target) return;
      const currentDrag = dragStateRef.current;
      const dropState = dropStateForTarget(
        target,
        virtualY,
        'pointer',
        currentDrag ? canJoinTargetGroup(currentDrag.activeRowId, target, groups) : false,
        currentDrag?.activeRowId,
        groups
      );
      setDragState((current) => {
        if (!current || dragDropStateMatches(current, dropState)) {
          return current;
        }
        const next = {
          ...current,
          overRowId: dropState.overRowId,
          intent: dropState.intent,
          placement: dropState.placement,
          joinGroupId: dropState.joinGroupId,
          parentGroupId: dropState.parentGroupId,
          anchorGroupId: dropState.anchorGroupId
        };
        dragStateRef.current = next;
        return next;
      });
    },
    [dragStateRef, draggableTargets, groups, scrollRef, setDragState]
  );

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

      if (delta !== 0) {
        scrollEl.scrollTop += delta;
        updatePointerOver(y);
        autoScrollFrameRef.current = requestAnimationFrame(tick);
      } else {
        autoScrollFrameRef.current = null;
      }
    };

    autoScrollFrameRef.current = requestAnimationFrame(tick);
  }, [scrollRef, updatePointerOver]);

  const finishPointerDrag = useCallback(
    (commit: boolean) => {
      stopAutoScroll();
      dragPointerIdRef.current = null;
      const current = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      if (commit && current && current.activeRowId !== current.overRowId) {
        onReorder(current.activeRowId, current.overRowId, reorderOptionsForDragState(current));
      }
    },
    [dragStateRef, onReorder, setDragState, stopAutoScroll]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      latestPointerYRef.current = event.clientY;
      updatePointerOver(event.clientY);
      startAutoScroll();
    },
    [startAutoScroll, updatePointerOver]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
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
      dragPointerIdRef.current = event.pointerId;
      latestPointerYRef.current = event.clientY;
      const next = { activeRowId: rowId, overRowId: rowId, mode: 'pointer' as const, intent: 'sort' as const };
      dragStateRef.current = next;
      setDragState(next);
    },
    [dragStateRef, setDragState]
  );

  return {
    startPointerDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    stopAutoScroll
  };
}
