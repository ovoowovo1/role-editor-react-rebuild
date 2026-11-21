import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { makeDecorationGroup, makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import type { DecorationGroup, RoleDocument } from '../../types/role';
import { referenceImageLayerToken } from '../../types/referenceImage';
import { applyBaseGroupVisibilityUpdate, setGroupVisibleInRole } from './editorGroupMutations';
import { applyRoleHistoryPatch, createHistoryIdPool, makeBaseRoleHistoryEntry, makeRoleHistoryEntry } from './editorRoleHistoryPatch';
import { cloneRole, syncGroups, touch } from './editorRoleUtils';
import { descendantLayerIdsForGroup, membersForGroup } from './groupTree';
import { setGroupVisibilityIncludingHead } from './headLayerMutations';
import { layerIdsForRole } from './layerOrdering';
import { reconcileReferenceImageLayerOrder } from './referenceImageModel';

function oldVisibilityInDraft(draft: RoleDocument, groupId: string, visible: boolean): ReadonlySet<string> | null {
  const groups = draft.groups ?? [];
  const group = groups.find((item) => item.id === groupId);
  if (!group) return null;
  const layerIds = new Set(descendantLayerIdsForGroup(groups, groupId));
  const groupIds = new Set([groupId]);
  const collect = (id: string) => {
    const current = groups.find((item) => item.id === id);
    if (!current) return;
    for (const member of membersForGroup(current)) {
      if (member.type === 'group' && !groupIds.has(member.id)) {
        groupIds.add(member.id);
        collect(member.id);
      }
    }
  };
  collect(groupId);
  draft.groups = groups.map((item) => (groupIds.has(item.id) ? { ...item, visible } : item));
  draft.decorations = draft.decorations.map((item) => (layerIds.has(item.id) ? { ...item, visible } : item));
  return layerIds;
}

function oldBaseVisibility(role: RoleDocument, groupId: string, visible: boolean) {
  const draft = cloneRole(role);
  oldVisibilityInDraft(draft, groupId, visible);
  return syncGroups(touch(draft));
}

function oldHeadVisibility(role: RoleDocument, groupId: string, visible: boolean) {
  const draft = { ...role };
  const layerIds = oldVisibilityInDraft(draft, groupId, visible);
  if (!layerIds) return role;
  if (layerIds.has(HEAD_LAYER_ID)) draft.headLayer = { ...role.headLayer, visible };
  return touch(draft);
}

function nested(includeHead: boolean): RoleDocument {
  const childMembers: NonNullable<DecorationGroup['members']> = ['a', 'b'].map((id) => ({ type: 'layer', id }));
  if (includeHead) childMembers.push({ type: 'layer', id: HEAD_LAYER_ID });
  return syncGroups(makeRoleDocument({
    decorations: ['a', 'b', 'outside'].map((id) => makeDecorationLayer(id)),
    groups: [
      makeDecorationGroup('root', { members: [{ type: 'group', id: 'child' }] }),
      makeDecorationGroup('child', { members: childMembers })
    ]
  }));
}

describe('nested group visibility', () => {
  it('preserves distinct first/last duplicate lookups and cycles', () => {
    const role = makeRoleDocument({
      decorations: ['a', 'b', 'b', 'c'].map((id) => makeDecorationLayer(id)),
      groups: [
        makeDecorationGroup('root', { members: [{ type: 'group', id: 'first' }] }),
        makeDecorationGroup('first', { members: [{ type: 'group', id: 'root' }, { type: 'layer', id: 'a' }] }),
        makeDecorationGroup('root', { members: [{ type: 'group', id: 'last' }] }),
        makeDecorationGroup('last', { members: [
          { type: 'group', id: 'root' }, { type: 'layer', id: 'b' }, { type: 'layer', id: HEAD_LAYER_ID }
        ] })
      ]
    });
    const oldDraft = { ...role };
    oldVisibilityInDraft(oldDraft, 'root', false);
    const newDraft = { ...role };
    setGroupVisibleInRole(newDraft, 'root', false);
    expect(newDraft).toEqual(oldDraft);
    expect(newDraft.groups.map((group) => group.visible)).toEqual([false, false, false, true]);
    expect(newDraft.decorations.map((layer) => layer.visible)).toEqual([true, false, false, true]);
    expect(newDraft.decorations[0]).toBe(role.decorations[0]);

    const head = setGroupVisibilityIncludingHead(role, 'root', false);
    expect(head).toEqual({ ...oldHeadVisibility(role, 'root', false), updatedAt: head.updatedAt });
    expect(head.headLayer.visible).toBe(false);
    const base = applyBaseGroupVisibilityUpdate(role, 'root', false);
    expect(base).toEqual({ ...oldBaseVisibility(role, 'root', false), updatedAt: base.updatedAt });
    expect(base.headLayer).toBe(role.headLayer);
  });

  it('preserves legacy itemIds-only normalization and valid no-ops', () => {
    const role = makeRoleDocument({
      decorations: ['', 'a', 'b'].map((id) => makeDecorationLayer(id)),
      groups: [makeDecorationGroup('legacy', { members: undefined, itemIds: ['', 'a', 'b'] })]
    });
    const base = applyBaseGroupVisibilityUpdate(role, 'legacy', false);
    expect(base).toEqual({ ...oldBaseVisibility(role, 'legacy', false), updatedAt: base.updatedAt });
    expect(base.decorations[0]).toBe(role.decorations[0]);
    expect(base.groups[0].itemIds).toEqual(['a', 'b']);

    const ordinary = nested(false);
    const unchanged = applyBaseGroupVisibilityUpdate(ordinary, 'root', true);
    expect(makeBaseRoleHistoryEntry(ordinary, unchanged, createHistoryIdPool())).toBeNull();
    expect(setGroupVisibilityIncludingHead(ordinary, 'missing', false)).toBe(ordinary);
  });

  it('keeps separate ordinary and HEAD history semantics and preserves reference order', () => {
    for (const includeHead of [false, true]) {
      const before = nested(includeHead);
      const after = includeHead
        ? setGroupVisibilityIncludingHead(before, 'root', false)
        : applyBaseGroupVisibilityUpdate(before, 'root', false);
      const baseline = includeHead ? oldHeadVisibility(before, 'root', false) : oldBaseVisibility(before, 'root', false);
      expect(after).toEqual({ ...baseline, updatedAt: after.updatedAt });
      expect(after.headLayer.visible).toBe(!includeHead);
      expect(after.decorations[2]).toBe(before.decorations[2]);

      const entry = includeHead
        ? makeRoleHistoryEntry(before, after, ['a', HEAD_LAYER_ID], ['a', HEAD_LAYER_ID])
        : makeBaseRoleHistoryEntry(before, after, createHistoryIdPool());
      if (entry?.kind !== 'patch') throw new Error('Expected a visibility history patch.');
      if ('selectionIds' in entry) expect(entry.selectionIds).toEqual(['a', HEAD_LAYER_ID]);
      const undone = applyRoleHistoryPatch(after, entry.patch, 'before');
      expect(undone).toEqual(before);
      const redone = applyRoleHistoryPatch(undone, entry.patch, 'after');
      expect(redone).toEqual(after);

      const image = referenceImageLayerToken('ref');
      const beforeOrder = layerIdsForRole(before).reverse();
      const stack = [beforeOrder[0], image, ...beforeOrder.slice(1)];
      for (const role of [after, undone, redone]) {
        expect(reconcileReferenceImageLayerOrder(stack, layerIdsForRole(role).reverse(), new Set(['ref']))).toEqual(stack);
      }
    }
  });
});
