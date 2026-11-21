import { describe, expect, it } from 'vitest';
import { referenceImageLayerToken } from '../../types/referenceImage';
import { sameRole } from './editorHistoryTypes';
import { applyRoleHistoryPatch, createHistoryIdPool, makeBaseRoleHistoryEntry } from './editorRoleHistoryPatch';
import { cloneRole, syncGroups, touch } from './editorRoleUtils';
import { layerIdsForRole } from './layerOrdering';
import { reconcileReferenceImageLayerOrder } from './referenceImageModel';
import { makeDecorationGroup, makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import {
  applyGroupMetadataUpdate,
  createGroupFromSelection,
  groupMembershipSignature,
  hasUngroupedSelected,
  makeGroupMap,
  renameGroupInRole,
  setGroupVisibleInRole,
  toggleGroupCollapsedInRole,
  ungroupInRole,
  ungroupedSelectedIds,
  type GroupMetadataUpdate
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

  it('shares decorations in sequential group metadata edits, preserving normalized output and the base history codec', () => {
    const before = syncGroups(groupedRole());
    const collapse: GroupMetadataUpdate = { type: 'toggle-collapsed', groupId: 'parent' };
    const rename: GroupMetadataUpdate = { type: 'rename', groupId: 'child', name: '  Details  ' };
    const collapsed = applyGroupMetadataUpdate(before, collapse);
    const renamed = applyGroupMetadataUpdate(collapsed, rename);
    expect(renamed.groups[0].collapsed).toBe(true);
    expect(renamed.groups[1].name).toBe('Details');

    for (const [current, next, operation] of [[before, collapsed, collapse], [collapsed, renamed, rename]] as const) {
      const oldDraft = cloneRole(current);
      if (operation.type === 'toggle-collapsed') toggleGroupCollapsedInRole(oldDraft, operation.groupId);
      else renameGroupInRole(oldDraft, operation.groupId, operation.name);
      const old = { ...syncGroups(touch(oldDraft)), updatedAt: next.updatedAt };
      expect(next).toEqual(old);
      expect(next.decorations).toBe(current.decorations);
      expect(next.headLayer).toBe(current.headLayer);
      expect(next.parts).toBe(current.parts);
      expect(next.partFrames).toBe(current.partFrames);

      const baselineEntry = makeBaseRoleHistoryEntry(current, old, createHistoryIdPool());
      const entry = makeBaseRoleHistoryEntry(current, next, createHistoryIdPool());
      expect(entry).toEqual(baselineEntry);
      if (!entry) throw new Error('Expected a base history entry.');
      expect(entry.patch.decorations.order).toBeNull();
      expect(entry.patch.decorations.fields).toHaveLength(0);
      const undone = applyRoleHistoryPatch(next, entry.patch, 'before');
      const redone = applyRoleHistoryPatch(undone, entry.patch, 'after');
      expect(undone).toEqual(current);
      expect(redone).toEqual(next);

      const roleOrder = layerIdsForRole(current).reverse();
      const ref = referenceImageLayerToken('ref');
      const imageStack = [roleOrder[0], ref, ...roleOrder.slice(1)];
      for (const snapshot of [next, undone, redone]) {
        expect(reconcileReferenceImageLayerOrder(imageStack, layerIdsForRole(snapshot).reverse(), new Set(['ref'])))
          .toEqual(imageStack);
      }
    }
  });

  it('preserves the history no-op boundary and legacy group normalization', () => {
    const before = syncGroups(groupedRole());
    for (const update of [
      { type: 'rename', groupId: 'child', name: '  ' },
      { type: 'rename', groupId: 'child', name: 'child' },
      { type: 'toggle-collapsed', groupId: 'missing' }
    ] as const) {
      const after = applyGroupMetadataUpdate(before, update);
      expect(sameRole(before, after)).toBe(true);
      expect(makeBaseRoleHistoryEntry(before, after, createHistoryIdPool())).toBeNull();
    }

    const legacy = makeRoleDocument({
      decorations: ['', 'a', 'b'].map((id) => makeDecorationLayer(id)),
      groups: [makeDecorationGroup('legacy', { members: undefined, itemIds: ['', 'a', 'b'] })]
    });
    const oldDraft = cloneRole(legacy);
    renameGroupInRole(oldDraft, 'legacy', 'Legacy');
    const afterLegacy = applyGroupMetadataUpdate(legacy, { type: 'rename', groupId: 'legacy', name: 'Legacy' });
    expect(afterLegacy).toEqual({ ...syncGroups(touch(oldDraft)), updatedAt: afterLegacy.updatedAt });
    expect(afterLegacy.groups[0].itemIds).toEqual(['a', 'b']);
    expect(afterLegacy.groups[0].members).toEqual([{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }]);
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
