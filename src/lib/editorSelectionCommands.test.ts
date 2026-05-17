import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import { patchDecorationForSelectionDrag, selectedLayerIdsForGroup } from './editorSelectionCommands';

function layer(id: string, patch: Partial<DecorationLayer> = {}): DecorationLayer {
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
    opacity: 1,
    ...patch
  };
}

function group(id: string, members: NonNullable<DecorationGroup['members']>): DecorationGroup {
  return {
    id,
    name: id,
    itemIds: members.filter((member) => member.type === 'layer').map((member) => member.id),
    members,
    visible: true,
    collapsed: false
  };
}

function role(patch: Partial<RoleDocument> = {}): RoleDocument {
  return {
    schemaVersion: 1,
    name: 'role',
    camp: 'x',
    gender: 'male',
    parts: { head: 'head', hand: 'hand', foot: 'foot', cape: 'cape' },
    partFrames: { head: 0, hand: 0, foot: 0, cape: 0 },
    partScales: { head: 1, hand: 1, foot: 1, cape: 1 },
    headLayerIndex: 1,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b'), layer('c')],
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('editor selection commands', () => {
  it('derives selected layer ids for a group using current layer order', () => {
    const current = role({
      groups: [
        group('g1', [
          { type: 'layer', id: HEAD_LAYER_ID },
          { type: 'layer', id: 'c' }
        ])
      ]
    });

    expect(selectedLayerIdsForGroup(current, 'g1')).toEqual(['c', HEAD_LAYER_ID]);
    expect(selectedLayerIdsForGroup(current, 'missing')).toEqual([]);
  });

  it('patches a single decoration without moving the selection', () => {
    const next = patchDecorationForSelectionDrag(role(), 'b', { x: 5 }, ['b']);

    expect(next.decorations.map((item) => item.x)).toEqual([0, 5, 0]);
  });

  it('moves the rest of a multi-selection by the dragged decoration delta', () => {
    const current = role({ decorations: [layer('a', { x: 1 }), layer('b', { x: 3 }), layer('c', { x: 9 })] });
    const next = patchDecorationForSelectionDrag(current, 'a', { x: 2.234 }, ['a', 'b', HEAD_LAYER_ID]);

    expect(next.decorations[0].x).toBe(2.234);
    expect(next.decorations[1].x).toBe(4.23);
    expect(next.decorations[2].x).toBe(9);
  });
});
