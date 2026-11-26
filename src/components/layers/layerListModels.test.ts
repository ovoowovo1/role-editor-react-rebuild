import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID, HEAD_ROW_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer } from '../../types/role';
import {
  applyLayerSelection,
  buildLayerRowModels,
  collapsedAncestorGroupIdsForLayer,
  createLayerSelectionState,
  mergeReferenceImageRows,
  orderedSelectionTargetsForScroll
} from './layerListModels';
import type { ReferenceImageLayer } from '../../types/referenceImage';
import { buildVirtualGeometry, type VirtualLayerRow } from './layerListVirtualization';
import { sameDecorationRow, sameLayerId, sameLayerListInput, sameReferenceImageRow } from './useStableLayerListInput';

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

function referenceImage(id: string): ReferenceImageLayer {
  return {
    id,
    name: `${id}.png`,
    src: `blob:${id}`,
    width: 10,
    height: 10,
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    visible: true
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

    const largeSelection = createLayerSelectionState([
      'a',
      ...Array.from({ length: 500 }, (_, index) => `id-${index}`)
    ]);
    expect(applyLayerSelection(groupRow, largeSelection).selected).toBe(false);
    expect(applyLayerSelection(itemRows[0], largeSelection).selected).toBe(true);
    expect(applyLayerSelection(itemRows[1], largeSelection).selected).toBe(false);
    expect(applyLayerSelection(headRow, largeSelection).selected).toBe(false);

    const allLayers = createLayerSelectionState([
      'a',
      'b',
      HEAD_LAYER_ID,
      ...Array.from({ length: 498 }, (_, index) => `extra-${index}`)
    ]);
    expect(applyLayerSelection(groupRow, allLayers).selected).toBe(true);
    expect(itemRows.every((row) => applyLayerSelection(row, allLayers).selected)).toBe(true);
    expect(applyLayerSelection(headRow, allLayers).selected).toBe(true);
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

  it('keeps list inputs stable for transform edits but not row changes or reorder', () => {
    const a = layer('a');
    const b = layer('b');
    const input = [a, b];

    expect(sameLayerListInput(input, [{ ...a, x: 3, y: 4, rotation: 15, scaleX: 2, opacity: 0.5 }, b], sameDecorationRow)).toBe(true);
    expect(sameLayerListInput(input, [{ ...a, assetId: 'new' }, b], sameDecorationRow)).toBe(false);
    expect(sameLayerListInput(input, [{ ...a, visible: false }, b], sameDecorationRow)).toBe(false);
    expect(sameLayerListInput(input, [b, a], sameDecorationRow)).toBe(false);
    expect(sameLayerListInput(input, [a], sameDecorationRow)).toBe(false);
    expect(sameLayerListInput(input, [{ ...a, visible: false }, b], sameLayerId)).toBe(true);
    expect(sameLayerListInput(input, [b, a], sameLayerId)).toBe(false);
  });

  it('refreshes image rows for a changed name, thumbnail or visibility but not a transform', () => {
    const image = referenceImage('ref');
    expect(sameReferenceImageRow(image, { ...image, x: 7, y: 8, scale: 3, opacity: 0.5 })).toBe(true);
    expect(sameReferenceImageRow(image, { ...image, name: 'new.png' })).toBe(false);
    expect(sameReferenceImageRow(image, { ...image, src: 'blob:new' })).toBe(false);
    expect(sameReferenceImageRow(image, { ...image, visible: false })).toBe(false);
  });

  it('keeps adjacent reference images in order around a collapsed group and at stack edges', () => {
    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b'), layer('c')],
      groups: [group('g', [{ type: 'layer', id: 'b' }], { collapsed: true })],
      headLayerIndex: 3
    });
    const images = ['top', 'one', 'two', 'bottom'].map(referenceImage);
    const merged = mergeReferenceImageRows(rows, images, [
      'reference-image:bottom', HEAD_LAYER_ID, 'c', 'reference-image:two', 'b',
      'reference-image:one', 'a', 'reference-image:top'
    ]);
    expect(merged.map((row) => row.rowId)).toEqual([
      'reference-image:top', 'item:a', 'reference-image:one', 'reference-image:two',
      'group:g', 'item:c', HEAD_ROW_ID, 'reference-image:bottom'
    ]);

    expect(mergeReferenceImageRows(rows, images.slice(1, 3), []).map((row) => row.rowId)).toEqual([
      'reference-image:two', 'reference-image:one', 'item:a', 'group:g', 'item:c', HEAD_ROW_ID
    ]);
  });

  it('places reference images between role rows using canonical bottom-to-top order', () => {
    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b')],
      groups: [],
      headLayerIndex: 1
    });
    const merged = mergeReferenceImageRows(rows, [referenceImage('ref')], [
      'b', HEAD_LAYER_ID, 'reference-image:ref', 'a'
    ]);
    expect(merged.map((row) => row.rowId)).toEqual([
      'item:a', 'reference-image:ref', HEAD_ROW_ID, 'item:b'
    ]);
  });

  it('keeps images outside group blocks when an order token falls in a group', () => {
    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b')],
      groups: [group('g', [{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }])],
      headLayerIndex: 2
    });
    const merged = mergeReferenceImageRows(rows, [referenceImage('ref')], [
      'b', 'reference-image:ref', 'a', HEAD_LAYER_ID
    ]);
    expect(merged.map((row) => row.rowId)).toEqual([
      'reference-image:ref', 'group:g', 'item:a', 'item:b', HEAD_ROW_ID
    ]);
  });

  it('orders multi-selected targets across 5,500 decorations and finds collapsed ancestor groups', () => {
    const decorations = Array.from({ length: 5500 }, (_, i) => layer(`d-${i + 1}`));
    const g1 = { ...group('g1', [{ type: 'layer', id: 'd-2' }, { type: 'layer', id: 'd-3' }]), collapsed: false };
    const g2Inner = { ...group('g2-inner', [{ type: 'layer', id: 'd-5400' }]), collapsed: true };
    const g2Outer = { ...group('g2-outer', [{ type: 'group', id: 'g2-inner' }]), collapsed: true };

    const targets = orderedSelectionTargetsForScroll({
      decorations,
      headLayerIndex: 1,
      selectedIds: ['d-5400', HEAD_LAYER_ID, 'd-2'],
      selectedReferenceImageId: null
    });

    expect(targets).toEqual([
      { targetId: HEAD_LAYER_ID, rowId: HEAD_ROW_ID },
      { targetId: 'd-2', rowId: 'item:d-2' },
      { targetId: 'd-5400', rowId: 'item:d-5400' }
    ]);

    expect(collapsedAncestorGroupIdsForLayer([g1, g2Inner, g2Outer], 'd-2')).toEqual([]);
    expect(collapsedAncestorGroupIdsForLayer([g1, g2Inner, g2Outer], 'd-5400')).toEqual(['g2-inner', 'g2-outer']);
  });
});
