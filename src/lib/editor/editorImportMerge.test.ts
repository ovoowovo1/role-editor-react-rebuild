import { describe, expect, it } from 'vitest';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../../types/role';
import { DEFAULT_INSERT_SETTINGS } from './editorInsertSettings';
import { insertDecorationBatchIntoRole, mergeImportedDecorationsIntoRole } from './editorImportMerge';

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
    headLayerIndex: 0,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [],
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('editor import merge helpers', () => {
  it('copies imported decorations and remaps imported groups', () => {
    const incoming = role({
      name: 'Imported Role',
      decorations: [layer('a'), layer('b')],
      groups: [
        group('oldGroup', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: 'b' }
        ])
      ]
    });

    const result = mergeImportedDecorationsIntoRole(role(), incoming, DEFAULT_INSERT_SETTINGS);

    expect(result?.copiedIds).toHaveLength(2);
    expect(result?.role.decorations.map((item) => item.id)).toEqual(result?.copiedIds);
    expect(result?.role.groups).toHaveLength(2);
    expect(result?.role.groups[0]).toMatchObject({
      name: 'Imported Role',
      itemIds: result?.copiedIds,
      visible: true,
      collapsed: true,
      members: [{ type: 'group' }]
    });
    expect(result?.role.groups[1].id).not.toBe('oldGroup');
    expect(result?.role.groups[1].itemIds).toEqual(result?.copiedIds);
  });

  it('wraps ungrouped imported decorations in a collapsed group', () => {
    const incoming = role({
      name: 'Imported Set',
      decorations: [layer('a'), layer('b'), layer('c')]
    });

    const result = mergeImportedDecorationsIntoRole(role(), incoming, DEFAULT_INSERT_SETTINGS);

    expect(result?.role.groups).toHaveLength(1);
    expect(result?.role.groups[0]).toMatchObject({
      name: 'Imported Set',
      collapsed: true,
      itemIds: result?.copiedIds,
      members: result?.copiedIds.map((id) => ({ type: 'layer', id }))
    });
  });

  it('wraps nested and ungrouped imported content in source layer order', () => {
    const incoming = role({
      name: 'Nested Import',
      decorations: [layer('a'), layer('b'), layer('c'), layer('d')],
      groups: [
        group('child', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: 'b' }
        ]),
        group('parent', [
          { type: 'group', id: 'child' },
          { type: 'layer', id: 'c' }
        ])
      ]
    });

    const result = mergeImportedDecorationsIntoRole(role(), incoming, DEFAULT_INSERT_SETTINGS);
    const outer = result?.role.groups[0];

    expect(outer?.name).toBe('Nested Import');
    expect(outer?.collapsed).toBe(true);
    expect(outer?.itemIds).toEqual(result?.copiedIds);
    expect(outer?.members).toHaveLength(2);
    expect(outer?.members?.[0].type).toBe('group');
    expect(outer?.members?.[1]).toEqual({
      type: 'layer',
      id: result?.copiedIds[3]
    });
    expect(result?.role.groups).toHaveLength(3);
    expect(result?.role.groups.slice(1).map((item) => item.name)).toEqual(['child', 'parent']);
  });

  it('falls back to the next group name and keeps a single imported deco ungrouped', () => {
    const existing = role({
      decorations: [layer('existing-layer'), layer('other-layer')],
      groups: [group('existing', [{ type: 'layer', id: 'existing-layer' }, { type: 'layer', id: 'other-layer' }])]
    });
    const named = mergeImportedDecorationsIntoRole(
      existing,
      role({ name: '   ', decorations: [layer('a'), layer('b')] }),
      DEFAULT_INSERT_SETTINGS
    );
    expect(named?.role.groups.find((item) => item.name === 'Group 2')).toBeDefined();

    const single = mergeImportedDecorationsIntoRole(role(), role({ decorations: [layer('a')] }), DEFAULT_INSERT_SETTINGS);
    expect(single?.role.groups).toEqual([]);
  });

  it('does not mutate either role while merging', () => {
    const current = role({ decorations: [layer('current')] });
    const incoming = role({ name: 'Imported', decorations: [layer('a'), layer('b')] });
    const currentBefore = structuredClone(current);
    const incomingBefore = structuredClone(incoming);

    mergeImportedDecorationsIntoRole(current, incoming, DEFAULT_INSERT_SETTINGS);

    expect(current).toEqual(currentBefore);
    expect(incoming).toEqual(incomingBefore);
  });

  it('inserts a decoration batch and creates a group for multi-item batches', () => {
    const result = insertDecorationBatchIntoRole(role(), [layer('a'), layer('b')], 'Batch', DEFAULT_INSERT_SETTINGS);

    expect(result?.copiedIds).toHaveLength(2);
    expect(result?.role.groups[0]).toMatchObject({
      name: 'Batch',
      itemIds: result?.copiedIds
    });
  });
});
