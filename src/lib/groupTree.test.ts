import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import {
  descendantLayerIdsForGroup,
  isGroupDescendant,
  normalizeGroupsForRole,
  topLevelMembersForRole
} from './groupTree';

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

function role(groups: DecorationGroup[]): RoleDocument {
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
    groups,
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

describe('group tree utils', () => {
  it('collects descendant layer ids through nested groups', () => {
    const groups = [
      group('child', [
        { type: 'layer', id: 'a' },
        { type: 'layer', id: 'b' }
      ]),
      group('parent', [
        { type: 'group', id: 'child' },
        { type: 'layer', id: 'c' }
      ])
    ];

    expect(descendantLayerIdsForGroup(groups, 'parent')).toEqual(['a', 'b', 'c']);
    expect(isGroupDescendant(groups, 'parent', 'child')).toBe(true);
    expect(isGroupDescendant(groups, 'child', 'parent')).toBe(false);
  });

  it('normalizes invalid, duplicate, and cyclic group members away', () => {
    const groups = [
      group('valid', [
        { type: 'layer', id: 'a' },
        { type: 'layer', id: 'b' },
        { type: 'layer', id: 'missing' },
        { type: 'layer', id: 'a' }
      ]),
      group('tooSmall', [{ type: 'layer', id: 'c' }]),
      group('cycleA', [
        { type: 'group', id: 'cycleB' },
        { type: 'layer', id: 'c' }
      ]),
      group('cycleB', [
        { type: 'group', id: 'cycleA' },
        { type: 'layer', id: HEAD_LAYER_ID }
      ])
    ];

    const normalized = normalizeGroupsForRole(role(groups));

    expect(normalized.map((item) => item.id)).toEqual(['valid']);
    expect(normalized[0].itemIds).toEqual(['a', 'b']);
    expect(normalized[0].members).toEqual([
      { type: 'layer', id: 'a' },
      { type: 'layer', id: 'b' }
    ]);
  });

  it('returns top-level members in role layer order', () => {
    const groups = [
      group('pair', [
        { type: 'layer', id: 'a' },
        { type: 'layer', id: 'b' }
      ])
    ];

    expect(topLevelMembersForRole(role(groups))).toEqual([
      { type: 'group', id: 'pair' },
      { type: 'layer', id: HEAD_LAYER_ID },
      { type: 'layer', id: 'c' }
    ]);
  });
});
