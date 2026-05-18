import { describe, expect, it } from 'vitest';
import { GROUP_ROW_PREFIX, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../../types/role';
import { reorderBaseEditorLayersImmutable } from './editorLayerDrag';

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
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('editor layer drag', () => {
  it('moves a selected ungrouped block before a target item', () => {
    const next = reorderBaseEditorLayersImmutable(
      role(),
      `${ITEM_ROW_PREFIX}b`,
      `${ITEM_ROW_PREFIX}d`,
      ['b', 'c'],
      { placement: 'before' }
    );

    expect(next?.decorations.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);

    const after = reorderBaseEditorLayersImmutable(
      role(),
      `${ITEM_ROW_PREFIX}b`,
      `${ITEM_ROW_PREFIX}d`,
      ['b', 'c'],
      { placement: 'after' }
    );

    expect(after?.decorations.map((item) => item.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('joins an ungrouped item into a target group', () => {
    const current = role({
      groups: [
        group('g1', [
          { type: 'layer', id: 'b' },
          { type: 'layer', id: 'c' }
        ])
      ]
    });

    const next = reorderBaseEditorLayersImmutable(
      current,
      `${ITEM_ROW_PREFIX}a`,
      `${ITEM_ROW_PREFIX}b`,
      ['a'],
      { intent: 'join-group', placement: 'before' }
    );

    expect(next?.groups[0].members).toEqual([
      { type: 'layer', id: 'a' },
      { type: 'layer', id: 'b' },
      { type: 'layer', id: 'c' }
    ]);
    expect(next?.groups[0].itemIds).toEqual(['a', 'b', 'c']);
  });

  it('moves a group header without flattening its members', () => {
    const current = role({
      groups: [
        group('g1', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: 'b' }
        ]),
        group('g2', [
          { type: 'layer', id: 'c' },
          { type: 'layer', id: 'd' }
        ])
      ]
    });

    const next = reorderBaseEditorLayersImmutable(
      current,
      `${GROUP_ROW_PREFIX}g1`,
      `${GROUP_ROW_PREFIX}g2`,
      [],
      { placement: 'after' }
    );

    expect(next?.decorations.map((item) => item.id)).toEqual(['c', 'd', 'a', 'b']);
    expect(next?.groups.map((item) => item.itemIds)).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ]);
  });

  it('returns null for no-op drag targets', () => {
    expect(reorderBaseEditorLayersImmutable(role(), `${ITEM_ROW_PREFIX}a`, `${ITEM_ROW_PREFIX}a`, [], {})).toBeNull();
  });
});
