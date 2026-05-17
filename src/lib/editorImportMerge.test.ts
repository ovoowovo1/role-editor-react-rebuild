import { describe, expect, it } from 'vitest';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
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
});
