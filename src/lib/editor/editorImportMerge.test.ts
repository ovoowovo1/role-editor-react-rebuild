import { describe, expect, it } from 'vitest';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../../types/role';
import { DEFAULT_INSERT_SETTINGS } from './editorInsertSettings';
import { insertDecorationBatchIntoRole, insertGroupedDecorationBatchIntoRole, mergeImportedDecorationsIntoRole } from './editorImportMerge';

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
    expect(result?.role.groups).toHaveLength(1);
    expect(result?.role.groups[0].id).not.toBe('oldGroup');
    expect(result?.role.groups[0].itemIds).toEqual(result?.copiedIds);
  });

  it('inserts a decoration batch and creates a group for multi-item batches', () => {
    const result = insertDecorationBatchIntoRole(role(), [layer('a'), layer('b')], 'Batch', DEFAULT_INSERT_SETTINGS);

    expect(result?.copiedIds).toHaveLength(2);
    expect(result?.role.groups[0]).toMatchObject({
      name: 'Batch',
      itemIds: result?.copiedIds
    });
  });

  it('inserts grouped decoration batches and remaps every group member id', () => {
    const result = insertGroupedDecorationBatchIntoRole(
      role(),
      [layer('a'), layer('b'), layer('c'), layer('d'), layer('e')],
      [
        { name: 'Block 1', itemIds: ['a', 'b'] },
        { name: 'Block 2', itemIds: ['c', 'd', 'e'] }
      ],
      'AutoCreate',
      DEFAULT_INSERT_SETTINGS
    );

    expect(result?.copiedIds).toHaveLength(5);
    expect(result?.role.groups).toHaveLength(2);
    expect(result?.role.groups[0]).toMatchObject({
      name: 'Block 1',
      itemIds: result?.copiedIds.slice(0, 2),
      members: result?.copiedIds.slice(0, 2).map((id) => ({ type: 'layer', id }))
    });
    expect(result?.role.groups[1]).toMatchObject({
      name: 'Block 2',
      itemIds: result?.copiedIds.slice(2, 5),
      members: result?.copiedIds.slice(2, 5).map((id) => ({ type: 'layer', id }))
    });
    expect(result?.role.groups[0].itemIds).not.toContain('a');
  });

  it('skips grouped decoration drafts with fewer than two valid copied layers', () => {
    const result = insertGroupedDecorationBatchIntoRole(
      role(),
      [layer('a'), layer('b')],
      [
        { name: 'Single', itemIds: ['a'] },
        { name: 'Missing', itemIds: ['b', 'missing'] }
      ],
      'AutoCreate',
      DEFAULT_INSERT_SETTINGS
    );

    expect(result?.copiedIds).toHaveLength(2);
    expect(result?.role.groups).toEqual([]);
  });
});
