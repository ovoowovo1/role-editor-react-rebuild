import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../../types/role';
import {
  createGroupTreeIndex,
  descendantLayerIdsForGroup,
  isGroupDescendant,
  normalizeGroupsForRole,
  removeMembersFromAllGroups,
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

    const index = createGroupTreeIndex(groups);
    expect(index.topLevelGroupIds).toEqual(new Set(['parent']));
    expect(index.descendantLayerIds('parent')).toBe(index.descendantLayerIds('parent'));
    expect(index.descendantLayerIds('parent')).toEqual(['a', 'b', 'c']);
  });

  it('keeps cycle-safe descendant order when the reusable index cannot cache the graph', () => {
    const groups = [
      group('a', [
        { type: 'group', id: 'b' },
        { type: 'layer', id: 'a-layer' }
      ]),
      group('b', [
        { type: 'group', id: 'a' },
        { type: 'layer', id: 'b-layer' }
      ])
    ];

    const index = createGroupTreeIndex(groups);
    expect(index.descendantLayerIds('a')).toEqual(['b-layer', 'a-layer']);
    expect(index.descendantLayerIds('b')).toEqual(['a-layer', 'b-layer']);
  });

  it('does not parse unrelated group members for a single descendant lookup', () => {
    let unrelatedMemberReads = 0;
    const target = group('target', [{ type: 'layer', id: 'target-layer' }]);
    const unrelated = group('unrelated', [{ type: 'layer', id: 'unrelated-layer' }]);
    Object.defineProperty(unrelated, 'members', {
      configurable: true,
      get() {
        unrelatedMemberReads += 1;
        return [{ type: 'layer', id: 'unrelated-layer' }];
      }
    });

    expect(descendantLayerIdsForGroup([target, unrelated], 'target')).toEqual(['target-layer']);
    expect(unrelatedMemberReads).toBe(0);
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

  it('preserves mixed child/HEAD layer order and repeated child references without aliasing input', () => {
    const child = { ...group('child', []), members: undefined, itemIds: ['b', 'a'] };
    const parent = group('parent', [
      { type: 'layer', id: 'c' },
      { type: 'group', id: 'child' },
      { type: 'layer', id: HEAD_LAYER_ID },
      { type: 'group', id: 'child' },
      { type: 'layer', id: 'c' }
    ]);
    const [nextParent, nextChild] = normalizeGroupsForRole(role([parent, child]));

    expect(nextParent.itemIds).toEqual(['c', 'b', 'a', HEAD_LAYER_ID, 'b', 'a']);
    expect(nextParent.members).toEqual(parent.members!.slice(0, 4));
    expect(nextChild.itemIds).toEqual(['b', 'a']);
    expect(nextChild.members).toEqual([{ type: 'layer', id: 'b' }, { type: 'layer', id: 'a' }]);
    expect(nextParent.members).not.toBe(parent.members);
    expect(nextParent.members![0]).not.toBe(parent.members![0]);
    expect(nextParent.members![1]).not.toBe(nextParent.members![3]);
    expect(nextChild.itemIds).not.toBe(child.itemIds);
    nextParent.members![0].id = 'changed';
    expect(parent.members![0].id).toBe('c');
  });

  it('keeps a descendant overlap when the parent direct layer was accepted first', () => {
    const child = group('child', [{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }]);
    const parent = group('parent', [{ type: 'layer', id: 'a' }, { type: 'group', id: 'child' }]);
    const [parentFirst] = normalizeGroupsForRole(role([parent, child]));
    expect(parentFirst.itemIds).toEqual(['a', 'a', 'b']);
    expect(parentFirst.members).toEqual(parent.members);

    const [, childFirstParent] = normalizeGroupsForRole(role([child, parent]));
    expect(childFirstParent.itemIds).toEqual(['a', 'b']);
    expect(childFirstParent.members).toEqual([{ type: 'group', id: 'child' }]);
  });

  it('retains the sparse decoration ID-set semantics for malformed legacy data', () => {
    const decorations = new Array<DecorationLayer>(3);
    decorations[0] = layer('a');
    decorations[2] = layer('b');
    const legacy = { ...group('legacy', []), members: undefined, itemIds: ['a', undefined as unknown as string, 'b'] };
    const result = normalizeGroupsForRole({ ...role([legacy]), decorations });

    // The old map+Set passed a hole through as undefined, so an unsanitized
    // legacy itemIds entry can match it. Do not silently change that fallback.
    expect(result[0].itemIds).toEqual(legacy.itemIds);
  });

  it('removes bulk membership by both type and ID and updates nested legacy order', () => {
    const groups = [
      group('child', [{ type: 'layer', id: 'a' }, { type: 'layer', id: HEAD_LAYER_ID }]),
      group('parent', [{ type: 'group', id: 'child' }, { type: 'layer', id: 'child' }, { type: 'layer', id: 'b' }]),
      group('kept', [{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }])
    ];
    const next = removeMembersFromAllGroups(groups, [
      { type: 'layer', id: 'a' },
      { type: 'layer', id: 'a' },
      { type: 'layer', id: 'child' },
      { type: 'group', id: 'missing' }
    ], new Set(['kept']));
    expect(next.map((value) => value.itemIds)).toEqual([[HEAD_LAYER_ID], [HEAD_LAYER_ID, 'b'], ['a', 'b']]);
    expect(next[1].members).toEqual([{ type: 'group', id: 'child' }, { type: 'layer', id: 'b' }]);
    expect(groups[0].itemIds).toEqual(['a', HEAD_LAYER_ID]);
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

it('does not walk all decoration IDs for a document with no groups', () => {
  const emptyGroups = role([]);
  Object.defineProperty(emptyGroups, 'decorations', {
    get() { throw new Error('No decoration lookup is needed.'); }
  });
  const first = normalizeGroupsForRole(emptyGroups);
  expect(first).toEqual([]);
  expect(normalizeGroupsForRole(emptyGroups)).not.toBe(first);
});
