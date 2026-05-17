import { describe, expect, it } from 'vitest';
import { GROUP_ROW_PREFIX, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup } from '../../types/role';
import type { LayerRowModel } from './layerListModels';
import {
  buildVirtualItems,
  canJoinGroupId,
  canJoinTargetGroup,
  closestDraggableRowId,
  dropStateForTarget,
  nextDraggableRowId,
  parseLayerNumberInput,
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
});
