import { describe, expect, it } from 'vitest';
import { GROUP_ROW_PREFIX, HEAD_LAYER_ID, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../../types/role';
import {
  createGroupFromLayerSelection,
  groupContainsHeadLayer,
  reorderIncludingHead,
  setGroupVisibilityIncludingHead,
  toggleHeadVisibility,
  toggleLayerSelection,
  ungroupIncludingHead
} from './headLayerMutations';

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

describe('head layer mutations', () => {
  it('reorders the head layer among decoration rows', () => {
    const next = reorderIncludingHead(role(), HEAD_ROW_ID, `${ITEM_ROW_PREFIX}c`, [], { placement: 'after' });

    expect(next?.decorations.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(next?.headLayerIndex).toBe(3);
  });

  it('creates a group from selected non-head layers', () => {
    const next = createGroupFromLayerSelection(role(), ['b', 'a']);

    expect(next?.groups).toHaveLength(1);
    expect(next?.groups[0].itemIds).toEqual(['a', 'b']);
    expect(next?.groups[0].members).toEqual([
      { type: 'layer', id: 'a' },
      { type: 'layer', id: 'b' }
    ]);
  });

  it('updates group and head visibility together', () => {
    const current = role({
      groups: [
        group('withHead', [
          { type: 'layer', id: HEAD_LAYER_ID },
          { type: 'layer', id: 'a' }
        ])
      ]
    });

    const next = setGroupVisibilityIncludingHead(current, 'withHead', false);

    expect(next.headLayer.visible).toBe(false);
    expect(next.decorations[0].visible).toBe(false);
    expect(next.groups[0].visible).toBe(false);
    expect(groupContainsHeadLayer(next, 'withHead')).toBe(true);
  });

  it('ungroups head-containing groups and restores visibility', () => {
    const current = role({
      headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: false, opacity: 1 },
      decorations: [layer('a'), layer('b')],
      groups: [
        group('withHead', [
          { type: 'layer', id: HEAD_LAYER_ID },
          { type: 'layer', id: 'a' }
        ])
      ]
    });

    const next = ungroupIncludingHead(current, 'withHead');

    expect(next.groups).toEqual([]);
    expect(next.headLayer.visible).toBe(true);
    expect(next.decorations[0].visible).toBe(true);
  });

  it('toggles head and additive layer selection', () => {
    expect(toggleHeadVisibility(role()).headLayer.visible).toBe(false);
    expect(toggleLayerSelection(['a'], ['a', 'b'], true)).toEqual(['a', 'b']);
    expect(toggleLayerSelection(['a', 'b'], ['a', 'b'], true)).toEqual([]);
    expect(toggleLayerSelection(['a'], [`${GROUP_ROW_PREFIX}x`], false)).toEqual([`${GROUP_ROW_PREFIX}x`]);
  });
});
