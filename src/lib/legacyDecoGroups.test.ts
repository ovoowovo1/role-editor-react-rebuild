import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import { exportLegacyDecoGroups, normalizeLegacyDecoGroups } from './legacyDecoGroups';

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

describe('legacy deco groups', () => {
  it('normalizes legacy itemIndexes using bottom-to-top virtual layer order', () => {
    const normalized = normalizeLegacyDecoGroups(
      [
        { id: 'g1', name: 'Legacy', itemIndexes: [0, 2] }
      ],
      role()
    );

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      id: 'g1',
      name: 'Legacy',
      itemIds: ['c', HEAD_LAYER_ID]
    });
  });

  it('normalizes member itemIndex fallbacks including the head layer', () => {
    const normalized = normalizeLegacyDecoGroups(
      [
        {
          id: 'g1',
          members: [
            { type: 'layer', itemIndex: 1 },
            { type: 'layer', id: 'a' }
          ]
        }
      ],
      role()
    );

    expect(normalized[0].members).toEqual([
      { type: 'layer', id: 'b' },
      { type: 'layer', id: 'a' }
    ]);
  });

  it('exports legacy groups with sorted bottom-to-top item indexes', () => {
    const current = role({
      groups: [
        group('g1', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: HEAD_LAYER_ID },
          { type: 'layer', id: 'c' }
        ])
      ]
    });

    const exported = exportLegacyDecoGroups(current);

    expect(exported[0].itemIndexes).toEqual([0, 2, 3]);
    expect(exported[0].members).toEqual([
      { type: 'layer', id: 'a', itemIndex: 3 },
      { type: 'layer', id: HEAD_LAYER_ID, itemIndex: 2 },
      { type: 'layer', id: 'c', itemIndex: 0 }
    ]);
  });
});
