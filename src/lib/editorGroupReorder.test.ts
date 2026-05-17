import { describe, expect, it } from 'vitest';
import { GROUP_ROW_PREFIX, HEAD_ROW_ID } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import { reorderGroupWithoutUngrouping } from './editorGroupReorder';

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
    headLayerIndex: 4,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b'), layer('c'), layer('d')],
    groups: [
      group('g1', [
        { type: 'layer', id: 'a' },
        { type: 'layer', id: 'b' }
      ]),
      group('g2', [
        { type: 'layer', id: 'c' },
        { type: 'layer', id: 'd' }
      ])
    ],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('editor group reorder', () => {
  it('moves a group as a contiguous decoration block', () => {
    const next = reorderGroupWithoutUngrouping(
      role(),
      `${GROUP_ROW_PREFIX}g1`,
      `${GROUP_ROW_PREFIX}g2`,
      { placement: 'after' }
    );

    expect(next?.decorations.map((item) => item.id)).toEqual(['c', 'd', 'a', 'b']);
    expect(next?.groups.map((item) => item.itemIds)).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ]);
  });

  it('can move a group across the head row and updates the head index', () => {
    const next = reorderGroupWithoutUngrouping(
      role({ headLayerIndex: 2 }),
      `${GROUP_ROW_PREFIX}g2`,
      HEAD_ROW_ID,
      { placement: 'before' }
    );

    expect(next?.decorations.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(next?.headLayerIndex).toBe(4);

    const after = reorderGroupWithoutUngrouping(
      role({ headLayerIndex: 2 }),
      `${GROUP_ROW_PREFIX}g1`,
      HEAD_ROW_ID,
      { placement: 'after' }
    );

    expect(after?.decorations.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(after?.headLayerIndex).toBe(0);
  });

  it('returns null for join-group intent or invalid active rows', () => {
    expect(reorderGroupWithoutUngrouping(role(), `${GROUP_ROW_PREFIX}g1`, `${GROUP_ROW_PREFIX}g2`, { intent: 'join-group' })).toBeNull();
    expect(reorderGroupWithoutUngrouping(role(), 'a', `${GROUP_ROW_PREFIX}g2`)).toBeNull();
  });
});
