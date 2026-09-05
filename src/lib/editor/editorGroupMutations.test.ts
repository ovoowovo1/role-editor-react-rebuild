import { describe, expect, it } from 'vitest';
import { makeDecorationGroup, makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import {
  createGroupFromSelection,
  groupMembershipSignature,
  hasUngroupedSelected,
  makeGroupMap,
  renameGroupInRole,
  setGroupVisibleInRole,
  toggleGroupCollapsedInRole,
  ungroupInRole,
  ungroupedSelectedIds
} from './editorGroupMutations';

function groupedRole() {
  const child = makeDecorationGroup('child', {
    itemIds: ['a', 'b'],
    members: [{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }]
  });
  const parent = makeDecorationGroup('parent', {
    itemIds: ['a', 'b'],
    members: [{ type: 'group', id: 'child' }]
  });
  return makeRoleDocument({
    decorations: ['a', 'b', 'c'].map((id) => makeDecorationLayer(id)),
    groups: [parent, child]
  });
}

describe('editor group mutations', () => {
  it('keeps membership signatures stable for non-topology changes', () => {
    const current = groupedRole();
    const transformed = {
      ...current,
      decorations: current.decorations.map((item) => ({ ...item, x: item.x + 10 }))
    };
    const renamed = {
      ...current,
      groups: current.groups.map((group) => ({ ...group, name: `${group.name} renamed` }))
    };

    expect(groupMembershipSignature(transformed.groups)).toBe(groupMembershipSignature(current.groups));
    expect(groupMembershipSignature(renamed.groups)).toBe(groupMembershipSignature(current.groups));
  });

  it('changes membership signatures when group topology changes', () => {
    const current = groupedRole();
    const changed = {
      ...current,
      groups: current.groups.map((group) => group.id === 'child'
        ? {
            ...group,
            itemIds: ['a', 'b', 'c'],
            members: [
              { type: 'layer' as const, id: 'a' },
              { type: 'layer' as const, id: 'b' },
              { type: 'layer' as const, id: 'c' }
            ]
          }
        : group)
    };

    expect(groupMembershipSignature(changed.groups)).not.toBe(groupMembershipSignature(current.groups));
  });

  it('maps nested group members and returns only ungrouped selected layers', () => {
    const role = groupedRole();

    expect(makeGroupMap(role.groups).get('a')?.id).toBe('child');
    expect(ungroupedSelectedIds(role, ['a', 'c'])).toEqual(['c']);
    expect(hasUngroupedSelected(role, ['a', 'c'])).toBe(false);
    expect(hasUngroupedSelected(role, ['a', 'b', 'c'])).toBe(false);
  });

  it('detects two ungrouped selected layers and creates a group for them', () => {
    const role = makeRoleDocument({ decorations: ['a', 'b', 'c'].map((id) => makeDecorationLayer(id)) });

    expect(hasUngroupedSelected(role, ['a', 'b'])).toBe(true);
    createGroupFromSelection(role, ['b', 'a']);

    expect(role.groups).toHaveLength(1);
    expect(role.groups[0]).toMatchObject({ name: 'Group 1', itemIds: ['a', 'b'], visible: true, collapsed: false });
  });

  it('does not create a group when fewer than two valid ungrouped layers are selected', () => {
    const role = groupedRole();

    createGroupFromSelection(role, ['a', 'missing']);

    expect(role.groups).toHaveLength(2);
  });

  it('toggles collapse and renames only with non-empty trimmed names', () => {
    const role = groupedRole();

    toggleGroupCollapsedInRole(role, 'child');
    renameGroupInRole(role, 'child', '  Details  ');
    renameGroupInRole(role, 'parent', '   ');

    expect(role.groups.find((group) => group.id === 'child')).toMatchObject({ collapsed: true, name: 'Details' });
    expect(role.groups.find((group) => group.id === 'parent')?.name).toBe('parent');
  });

  it('updates visibility recursively for nested groups and their layers', () => {
    const role = groupedRole();

    setGroupVisibleInRole(role, 'parent', false);

    expect(role.groups.every((group) => group.visible === false)).toBe(true);
    expect(role.decorations.find((item) => item.id === 'a')?.visible).toBe(false);
    expect(role.decorations.find((item) => item.id === 'b')?.visible).toBe(false);
    expect(role.decorations.find((item) => item.id === 'c')?.visible).toBe(true);
  });

  it('leaves a role unchanged when the requested group does not exist', () => {
    const role = groupedRole();
    const before = JSON.stringify(role);

    setGroupVisibleInRole(role, 'missing', false);

    expect(JSON.stringify(role)).toBe(before);
  });

  it('ungroups nested children, reparents their members, and restores item visibility', () => {
    const role = groupedRole();
    role.decorations[0].visible = false;
    role.decorations[1].visible = false;

    ungroupInRole(role, 'child');

    expect(role.groups.map((group) => group.id)).toEqual(['parent']);
    expect(role.groups[0].members).toEqual([{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }]);
    expect(role.decorations.slice(0, 2).every((item) => item.visible)).toBe(true);
  });
});
