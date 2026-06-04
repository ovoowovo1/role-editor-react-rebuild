import type { LayerReorderOptions } from '../../lib/editor/editorLayerDrag';
import type { LayerDragState } from './layerListVirtualization';

type DragDropFields = Pick<
  LayerDragState,
  'overRowId' | 'intent' | 'placement' | 'joinGroupId' | 'parentGroupId' | 'anchorGroupId'
>;

export function reorderOptionsForDragState(state: LayerDragState): LayerReorderOptions {
  return {
    intent: state.intent,
    placement: state.placement,
    parentGroupId: state.parentGroupId,
    anchorGroupId: state.anchorGroupId
  };
}

export function dragDropStateMatches(current: LayerDragState | null, next: DragDropFields): boolean {
  return !!current &&
    current.overRowId === next.overRowId &&
    current.intent === next.intent &&
    current.placement === next.placement &&
    current.joinGroupId === next.joinGroupId &&
    current.parentGroupId === next.parentGroupId &&
    current.anchorGroupId === next.anchorGroupId;
}

export function insertionIndicatorTopForDrag({
  dragState,
  rowIndexById,
  offsets,
  heights
}: {
  dragState: LayerDragState | null;
  rowIndexById: Map<string, number>;
  offsets: number[];
  heights: number[];
}): number | null {
  if (!dragState) return null;
  const activeIndex = rowIndexById.get(dragState.activeRowId) ?? -1;
  const overIndex = rowIndexById.get(dragState.overRowId) ?? -1;
  if (overIndex < 0) return null;
  const overTop = offsets[overIndex];
  const overBottom = overTop + heights[overIndex];
  if (dragState.intent === 'join-group' && !dragState.placement) return null;
  if (dragState.placement === 'before') return overTop;
  if (dragState.placement === 'after') return overBottom;
  return activeIndex >= 0 && activeIndex < overIndex ? overBottom : overTop;
}

export function joinTargetGroupIdForDrag(dragState: LayerDragState | null): string | undefined {
  return dragState?.intent === 'join-group' && !dragState.placement ? dragState.joinGroupId : undefined;
}
