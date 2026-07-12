import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID, HEAD_ROW_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer } from '../../types/role';
import {
  applyLayerSelection,
  buildLayerRowModels,
  createLayerSelectionState
} from './layerListModels';
import { buildVirtualGeometry, type VirtualLayerRow } from './layerListVirtualization';

function layer(id: string): DecorationLayer {
  return {
    id,
    code: id,
    assetId: id,
    name: id,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

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

describe('layer list row models', () => {
  it('places the head row among free decoration rows', () => {
    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b')],
      groups: [],
      headLayerIndex: 1
    });

    expect(rows.map((row) => row.rowId)).toEqual(['item:a', HEAD_ROW_ID, 'item:b']);
    expect(applyLayerSelection(rows[1], createLayerSelectionState([HEAD_LAYER_ID])))
      .toMatchObject({ type: 'head', selected: true, grouped: false });
  });

  it('renders nested groups and grouped head members in layer order', () => {
    const child = group('child', [
      { type: 'layer', id: HEAD_LAYER_ID },
      { type: 'layer', id: 'b' }
    ]);
    const parent = group('parent', [
      { type: 'layer', id: 'a' },
      { type: 'group', id: 'child' }
    ]);

    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b')],
      groups: [child, parent],
      headLayerIndex: 1
    });

    expect(rows.map((row) => `${row.type}:${row.group?.id ?? row.rowId}:${row.depth}`)).toEqual([
      'group:parent:0',
      'item:parent:1',
      'group:child:1',
      'head:child:2',
      'item:child:2'
    ]);
    const selection = createLayerSelectionState(['a', HEAD_LAYER_ID, 'b']);
    expect(applyLayerSelection(rows[0], selection).selected).toBe(true);
    expect(applyLayerSelection(rows[2], selection).selected).toBe(true);
    expect(rows[0].descendantIds).toEqual(['a', HEAD_LAYER_ID, 'b']);
  });

  it('hides collapsed group children', () => {
    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b')],
      groups: [
        group('g1', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: 'b' }
      ], { collapsed: true })
      ],
      headLayerIndex: 2
    });

    expect(rows.map((row) => row.type)).toEqual(['group', 'head']);
  });

  it('applies empty, single, multiple, and very large selection semantics after structure building', () => {
    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b')],
      groups: [
        group('g1', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: 'b' }
        ])
      ],
      headLayerIndex: 2
    });

    const groupRow = rows.find((row) => row.type === 'group')!;
    const itemRows = rows.filter((row) => row.type === 'item');
    const headRow = rows.find((row) => row.type === 'head')!;

    expect(rows.map((row) => applyLayerSelection(row, createLayerSelectionState([])).selected))
      .toEqual(rows.map(() => false));
    expect(applyLayerSelection(itemRows[0], createLayerSelectionState(['a'])).selected).toBe(true);
    expect(applyLayerSelection(groupRow, createLayerSelectionState(['a'])).selected).toBe(false);
    expect(applyLayerSelection(groupRow, createLayerSelectionState(['a', 'b'])).selected).toBe(true);

    const largeSelection = createLayerSelectionState(
      Array.from({ length: 501 }, (_, index) => `id-${index}`)
    );
    expect(applyLayerSelection(groupRow, largeSelection).selected).toBe(true);
    expect(itemRows.every((row) => applyLayerSelection(row, largeSelection).selected)).toBe(true);
    expect(applyLayerSelection(headRow, largeSelection).selected).toBe(true);
  });

  it('keeps structural rows and virtual geometry independent from selection updates', () => {
    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b')],
      groups: [],
      headLayerIndex: 1
    });
    const virtualRows: VirtualLayerRow[] = [
      ...rows,
      { key: 'spacer', rowId: 'spacer', type: 'spacer', selected: false }
    ];
    const geometry = buildVirtualGeometry(virtualRows);
    const selectedRows = rows.map((row) => applyLayerSelection(
      row,
      createLayerSelectionState(['a', HEAD_LAYER_ID])
    ));

    expect(rows.map((row) => row.selected)).toEqual([false, false, false]);
    expect(selectedRows.map((row) => row.selected)).toEqual([true, true, false]);
    expect(buildVirtualGeometry(virtualRows)).toEqual(geometry);
  });
});
