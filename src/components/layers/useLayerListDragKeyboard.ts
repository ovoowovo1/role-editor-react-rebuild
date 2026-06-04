import { useCallback, type MutableRefObject } from 'react';
import type { LayerReorderOptions } from '../../lib/editor/editorLayerDrag';
import {
  nextDraggableRowId,
  type LayerDragState,
  type VirtualLayerRow
} from './layerListVirtualization';
import { reorderOptionsForDragState } from './layerListDragHelpers';

export function useLayerListDragKeyboard({
  dragStateRef,
  setDragState,
  virtualRows,
  rowIndexById,
  scrollRowIntoView,
  onReorder
}: {
  dragStateRef: MutableRefObject<LayerDragState | null>;
  setDragState(next: LayerDragState | null): void;
  virtualRows: VirtualLayerRow[];
  rowIndexById: Map<string, number>;
  scrollRowIntoView(rowId: string): void;
  onReorder(activeId: string, overId: string, options?: LayerReorderOptions): void;
}) {
  const startKeyboardDrag = useCallback((rowId: string) => {
    const next = { activeRowId: rowId, overRowId: rowId, mode: 'keyboard' as const, intent: 'sort' as const };
    dragStateRef.current = next;
    setDragState(next);
    scrollRowIntoView(rowId);
  }, [dragStateRef, scrollRowIntoView, setDragState]);

  const cancelKeyboardDrag = useCallback(() => {
    dragStateRef.current = null;
    setDragState(null);
  }, [dragStateRef, setDragState]);

  const commitKeyboardDrag = useCallback(() => {
    const current = dragStateRef.current;
    dragStateRef.current = null;
    setDragState(null);
    if (current && current.activeRowId !== current.overRowId) {
      onReorder(current.activeRowId, current.overRowId, reorderOptionsForDragState(current));
    }
  }, [dragStateRef, onReorder, setDragState]);

  const moveKeyboardTarget = useCallback(
    (direction: 1 | -1) => {
      const current = dragStateRef.current;
      if (!current) return;
      const currentIndex = rowIndexById.get(current.overRowId) ?? -1;
      const nextRowId = nextDraggableRowId(virtualRows, currentIndex, direction);
      if (!nextRowId) return;
      const next = {
        ...current,
        overRowId: nextRowId,
        intent: 'sort' as const,
        placement: undefined,
        joinGroupId: undefined,
        parentGroupId: undefined,
        anchorGroupId: undefined
      };
      dragStateRef.current = next;
      setDragState(next);
      scrollRowIntoView(nextRowId);
    },
    [dragStateRef, rowIndexById, scrollRowIntoView, setDragState, virtualRows]
  );

  return {
    startKeyboardDrag,
    cancelKeyboardDrag,
    commitKeyboardDrag,
    moveKeyboardTarget
  };
}
