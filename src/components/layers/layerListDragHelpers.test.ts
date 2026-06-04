import { describe, expect, it } from 'vitest';
import {
  dragDropStateMatches,
  insertionIndicatorTopForDrag,
  joinTargetGroupIdForDrag,
  reorderOptionsForDragState
} from './layerListDragHelpers';
import type { LayerDragState } from './layerListVirtualization';

function dragState(overrides: Partial<LayerDragState> = {}): LayerDragState {
  return {
    activeRowId: 'a',
    overRowId: 'b',
    mode: 'pointer',
    intent: 'sort',
    ...overrides
  };
}

describe('layerListDragHelpers', () => {
  it('derives reorder options from the current drag state', () => {
    expect(reorderOptionsForDragState(dragState({
      placement: 'after',
      parentGroupId: 'group-1',
      anchorGroupId: 'group-2'
    }))).toEqual({
      intent: 'sort',
      placement: 'after',
      parentGroupId: 'group-1',
      anchorGroupId: 'group-2'
    });
  });

  it('compares drop state fields that affect the drag preview', () => {
    const current = dragState({ placement: 'before', parentGroupId: 'parent' });
    expect(dragDropStateMatches(current, dragState({ placement: 'before', parentGroupId: 'parent' }))).toBe(true);
    expect(dragDropStateMatches(current, dragState({ placement: 'after', parentGroupId: 'parent' }))).toBe(false);
    expect(dragDropStateMatches(null, current)).toBe(false);
  });

  it('places the insertion indicator before or after the target row', () => {
    const rowIndexById = new Map([
      ['a', 0],
      ['b', 1],
      ['c', 2]
    ]);
    const offsets = [0, 20, 50];
    const heights = [20, 30, 40];

    expect(insertionIndicatorTopForDrag({
      dragState: dragState({ overRowId: 'b', placement: 'before' }),
      rowIndexById,
      offsets,
      heights
    })).toBe(20);

    expect(insertionIndicatorTopForDrag({
      dragState: dragState({ overRowId: 'b', placement: 'after' }),
      rowIndexById,
      offsets,
      heights
    })).toBe(50);
  });

  it('uses active and over order when placement is implicit', () => {
    const rowIndexById = new Map([
      ['a', 0],
      ['b', 1],
      ['c', 2]
    ]);
    const offsets = [0, 20, 50];
    const heights = [20, 30, 40];

    expect(insertionIndicatorTopForDrag({
      dragState: dragState({ activeRowId: 'a', overRowId: 'b' }),
      rowIndexById,
      offsets,
      heights
    })).toBe(50);

    expect(insertionIndicatorTopForDrag({
      dragState: dragState({ activeRowId: 'c', overRowId: 'b' }),
      rowIndexById,
      offsets,
      heights
    })).toBe(20);
  });

  it('hides the insertion indicator and exposes the group target for direct joins', () => {
    const current = dragState({ intent: 'join-group', joinGroupId: 'group-a' });
    expect(insertionIndicatorTopForDrag({
      dragState: current,
      rowIndexById: new Map([['b', 0]]),
      offsets: [0],
      heights: [20]
    })).toBeNull();
    expect(joinTargetGroupIdForDrag(current)).toBe('group-a');
    expect(joinTargetGroupIdForDrag(dragState({ intent: 'join-group', joinGroupId: 'group-a', placement: 'after' }))).toBeUndefined();
  });
});
