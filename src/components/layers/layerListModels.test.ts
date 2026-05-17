import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID, HEAD_ROW_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer } from '../../types/role';
import { buildLayerRowModels } from './layerListModels';

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
      headLayerIndex: 1,
      selectedIds: [HEAD_LAYER_ID]
    });

    expect(rows.map((row) => row.rowId)).toEqual(['item:a', HEAD_ROW_ID, 'item:b']);
    expect(rows[1]).toMatchObject({ type: 'head', selected: true, grouped: false });
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
      headLayerIndex: 1,
      selectedIds: ['a', HEAD_LAYER_ID, 'b']
    });

    expect(rows.map((row) => `${row.type}:${row.group?.id ?? row.rowId}:${row.depth}`)).toEqual([
      'group:parent:0',
      'item:parent:1',
      'group:child:1',
      'head:child:2',
      'item:child:2'
    ]);
    expect(rows[0].selected).toBe(true);
    expect(rows[2].selected).toBe(true);
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
      headLayerIndex: 2,
      selectedIds: []
    });

    expect(rows.map((row) => row.type)).toEqual(['group', 'head']);
  });

  it('marks groups selected for very large selections without building a giant set', () => {
    const selectedIds = Array.from({ length: 501 }, (_, index) => `id-${index}`);
    const rows = buildLayerRowModels({
      decorations: [layer('a'), layer('b')],
      groups: [
        group('g1', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: 'b' }
        ])
      ],
      headLayerIndex: 2,
      selectedIds
    });

    expect(rows[0]).toMatchObject({ type: 'group', selected: true });
  });
});
