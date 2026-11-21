import { describe, expect, it } from 'vitest';
import { GROUP_ROW_PREFIX, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup } from '../../types/role';
import type { LayerRowModel } from './layerListModels';
import { createLayerDragGroupQueries } from './layerDragGroupQueries';
import {
  buildVirtualGeometry,
  buildVirtualItems,
  canJoinGroupId,
  canJoinTargetGroup,
  closestDraggableRowId,
  dropStateForTarget,
  LayerNumberOutOfRangeError,
  nextDraggableRowId,
  parseLayerNumberInput,
  updateVirtualWindow,
  virtualItemsInWindow,
  type VirtualLayerRow
} from './layerListVirtualization';

function group(id: string, members: NonNullable<DecorationGroup['members']>, patch: Partial<DecorationGroup> = {}): DecorationGroup {
  return {
    id,
    name: id,
    itemIds: members.filter((member) => member.type === 'layer').map((member) => member.id),
    members,
    visible: true,
    collapsed: false,
    ...patch
  };
}

function itemRow(id: string, groupValue?: DecorationGroup): LayerRowModel {
  return {
    key: id,
    rowId: `${ITEM_ROW_PREFIX}${id}`,
    type: 'item',
    grouped: Boolean(groupValue),
    group: groupValue,
    depth: groupValue ? 1 : 0,
    selected: false
  };
}

function groupRow(groupValue: DecorationGroup): LayerRowModel {
  return {
    key: groupValue.id,
    rowId: `${GROUP_ROW_PREFIX}${groupValue.id}`,
    type: 'group',
    group: groupValue,
    grouped: false,
    depth: 0,
    selected: false
  };
}

describe('layer list virtualization helpers', () => {
  it('parses layer number lists and ranges with de-duplication', () => {
    expect(parseLayerNumberInput('1, 3-5, 3, 7-6')).toEqual([1, 3, 4, 5, 7, 6]);
    expect(parseLayerNumberInput('')).toEqual([]);
    expect(() => parseLayerNumberInput('1, nope')).toThrow('Invalid item number');
  });

  it('validates bounds before expanding ranges and does not step beyond a safe endpoint', () => {
    expect(parseLayerNumberInput('5-3, 3, 1', 5)).toEqual([5, 4, 3, 1]);
    expect(() => parseLayerNumberInput('1-9007199254740991', 5)).toThrow(LayerNumberOutOfRangeError);
    expect(() => parseLayerNumberInput('99999-5', 5)).toThrow(LayerNumberOutOfRangeError);
    expect(() => parseLayerNumberInput('9007199254740992-9007199254740993', 5)).toThrow('Invalid range');
    expect(() => parseLayerNumberInput('6', 5)).toThrow(LayerNumberOutOfRangeError);
    expect(parseLayerNumberInput('9007199254740990-9007199254740991')).toEqual([9007199254740990, 9007199254740991]);
  });

  it('builds visible virtual rows and draggable targets', () => {
    const rows: VirtualLayerRow[] = [
      itemRow('a'),
      itemRow('b'),
      { key: 'spacer', rowId: 'spacer', type: 'spacer' as const, selected: false }
    ];

    const layout = buildVirtualItems(rows, 70, 80, 0);

    expect(layout.totalHeight).toBe(252);
    expect(layout.visibleItems.map((item) => item.row.rowId)).toEqual([`${ITEM_ROW_PREFIX}a`, `${ITEM_ROW_PREFIX}b`]);
    expect(layout.draggableTargets.map((item) => item.rowId)).toEqual([`${ITEM_ROW_PREFIX}a`, `${ITEM_ROW_PREFIX}b`]);
    expect(closestDraggableRowId(layout.draggableTargets, 90)).toBe(`${ITEM_ROW_PREFIX}b`);
    expect(nextDraggableRowId(rows, 1, 1)).toBeNull();
  });

  it('reuses the virtual window for pixel scroll inside identical row bounds', () => {
    const rows = Array.from({ length: 100 }, (_, index) => itemRow(String(index)));
    const geometry = buildVirtualGeometry(rows);
    const first = updateVirtualWindow(undefined, geometry, 310, 180, 2);
    expect(updateVirtualWindow(first, geometry, 315, 180, 2)).toBe(first);

    const moved = updateVirtualWindow(first, geometry, 385, 180, 2);
    expect(moved).not.toBe(first);
    expect(moved.startIndex).toBe(first.startIndex);
    const movedPastBoundary = updateVirtualWindow(moved, geometry, 386, 180, 2);
    expect(movedPastBoundary.startIndex).toBe(first.startIndex + 1);

    const resized = updateVirtualWindow(movedPastBoundary, geometry, 386, 500, 2);
    expect(resized.endIndex).toBeGreaterThan(movedPastBoundary.endIndex);
    expect(virtualItemsInWindow(rows, geometry, resized))
      .toEqual(buildVirtualItems(rows, 386, 500, 2).visibleItems);
  });

  it('refreshes row bounds after a same-height group reorder and tolerates shrinking rows', () => {
    const root = group('g', [{ type: 'layer', id: 'a' }]);
    const before = [groupRow(root), itemRow('a'), itemRow('b')];
    const after = [itemRow('a'), groupRow(root), itemRow('b')];
    const beforeGeometry = buildVirtualGeometry(before);
    const afterGeometry = buildVirtualGeometry(after);
    expect(afterGeometry.totalHeight).toBe(beforeGeometry.totalHeight);

    const initial = updateVirtualWindow(undefined, beforeGeometry, 62, 10, 0);
    const reordered = updateVirtualWindow(initial, afterGeometry, 62, 10, 0);
    expect(virtualItemsInWindow(before, beforeGeometry, initial).map((item) => item.row.rowId)).toEqual(['item:a']);
    expect(virtualItemsInWindow(after, afterGeometry, reordered).map((item) => item.row.rowId)).toEqual(['item:a']);
    expect(reordered.startIndex).toBe(0);

    const nearBottom = updateVirtualWindow(undefined, afterGeometry, 140, 50, 0);
    const smaller = after.slice(0, 1);
    const smallerGeometry = buildVirtualGeometry(smaller);
    expect(virtualItemsInWindow(smaller, smallerGeometry, nearBottom)).toEqual([]);
    const clamped = updateVirtualWindow(undefined, smallerGeometry, 27, 50, 0);
    expect(virtualItemsInWindow(smaller, smallerGeometry, clamped).map((item) => item.row.rowId)).toEqual(['item:a']);
  });

  it('detects join targets and pointer drop states', () => {
    const targetGroup = group('g1', [
      { type: 'layer', id: 'b' },
      { type: 'layer', id: 'c' }
    ]);
    const target = {
      rowId: `${ITEM_ROW_PREFIX}b`,
      index: 1,
      center: 115.5,
      top: 77,
      bottom: 154,
      row: itemRow('b', targetGroup)
    };

    expect(canJoinTargetGroup(`${ITEM_ROW_PREFIX}a`, target, [targetGroup])).toBe(true);
    expect(canJoinTargetGroup(`${ITEM_ROW_PREFIX}b`, target, [targetGroup])).toBe(false);
    expect(canJoinGroupId(`${ITEM_ROW_PREFIX}a`, 'g1', [targetGroup])).toBe(true);

    expect(dropStateForTarget(target, 80, 'pointer', true, `${ITEM_ROW_PREFIX}a`, [targetGroup])).toEqual({
      overRowId: `${ITEM_ROW_PREFIX}b`,
      intent: 'join-group',
      placement: 'before',
      joinGroupId: 'g1'
    });
  });

  it('uses sort intent for keyboard targets and group headers outside the join band', () => {
    const targetGroup = group('g1', [
      { type: 'layer', id: 'a' },
      { type: 'layer', id: 'b' }
    ]);
    const target = {
      rowId: `${GROUP_ROW_PREFIX}g1`,
      index: 0,
      center: 30,
      top: 0,
      bottom: 60,
      row: groupRow(targetGroup)
    };

    expect(dropStateForTarget(target, 2, 'pointer', true, `${ITEM_ROW_PREFIX}c`, [targetGroup])).toEqual({
      overRowId: `${GROUP_ROW_PREFIX}g1`,
      intent: 'sort',
      placement: 'before'
    });
    expect(dropStateForTarget(target, 30, 'keyboard', true, HEAD_ROW_ID, [targetGroup])).toEqual({
      overRowId: `${GROUP_ROW_PREFIX}g1`,
      intent: 'sort'
    });
  });

  it('keeps indexed drag decisions equivalent across nested groups and keyboard targets', () => {
    const root = group('root', [
      { type: 'group', id: 'child' },
      { type: 'layer', id: 'root-member' }
    ]);
    const child = group('child', [
      { type: 'group', id: 'grandchild' },
      { type: 'layer', id: 'child-member' }
    ]);
    const grandchild = group('grandchild', [{ type: 'layer', id: 'leaf' }]);
    const closed = group('closed', [{ type: 'layer', id: 'hidden' }], { collapsed: true });
    const groups = [root, child, grandchild, closed];
    const queries = createLayerDragGroupQueries(groups);
    const layout = buildVirtualItems([
      groupRow(root),
      { ...groupRow(child), grouped: true, depth: 1 },
      { ...groupRow(grandchild), grouped: true, depth: 2 },
      itemRow('leaf', grandchild),
      groupRow(closed),
      itemRow('outside')
    ], 0, 999, 0);

    for (const active of ['group:root', 'group:child', 'group:grandchild', 'item:outside', 'item:leaf', 'reference-image:ref']) {
      for (const target of layout.draggableTargets) {
        const expectedJoin = canJoinTargetGroup(active, target, groups);
        expect(canJoinTargetGroup(active, target, groups, queries)).toBe(expectedJoin);
        for (const y of [target.top + 1, target.center, target.bottom - 1]) {
          for (const mode of ['pointer', 'keyboard'] as const) {
            expect(dropStateForTarget(target, y, mode, expectedJoin, active, groups, queries))
              .toEqual(dropStateForTarget(target, y, mode, expectedJoin, active, groups));
          }
        }
      }
    }

    expect(queries.isDescendant('root', 'grandchild')).toBe(true);
    expect(queries.isDescendant('grandchild', 'root')).toBe(false);
    expect(queries.parentGroup('grandchild')).toBe(child);
    expect(queries.containsLayer(grandchild, 'leaf')).toBe(true);
    const changed = createLayerDragGroupQueries([root, { ...child, members: [] }, grandchild, closed]);
    expect(changed.isDescendant('root', 'grandchild')).toBe(false);
    expect(changed.parentGroup('grandchild')).toBeUndefined();
  });

  it('terminates ancestry checks without duplicating members even in a malformed cycle', () => {
    const a = group('a', [{ type: 'group', id: 'b' }]);
    const b = group('b', [{ type: 'group', id: 'a' }, { type: 'group', id: 'c' }]);
    const queries = createLayerDragGroupQueries([a, b]);
    expect(queries.isDescendant('a', 'b')).toBe(true);
    expect(queries.isDescendant('a', 'c')).toBe(true);
    expect(queries.isDescendant('a', 'unrelated')).toBe(false);
  });

  it('allows reference images to sort before or after role rows without joining groups', () => {
    const target = {
      rowId: `${ITEM_ROW_PREFIX}a`,
      index: 0,
      center: 38.5,
      top: 0,
      bottom: 77,
      row: itemRow('a')
    };
    expect(canJoinTargetGroup('reference-image:ref', target, [])).toBe(false);
    expect(dropStateForTarget(target, 10, 'pointer', false, 'reference-image:ref', [])).toMatchObject({
      intent: 'sort', placement: 'before'
    });
    expect(dropStateForTarget(target, 70, 'pointer', false, 'reference-image:ref', [])).toMatchObject({
      intent: 'sort', placement: 'after'
    });
  });
});
