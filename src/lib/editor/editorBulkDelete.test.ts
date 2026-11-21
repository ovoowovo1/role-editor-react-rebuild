import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { makeDecorationGroup, makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import type { RoleDocument } from '../../types/role';
import { referenceImageLayerToken } from '../../types/referenceImage';
import { applyRoleHistoryPatch, makeRoleHistoryEntry } from './editorRoleHistoryPatch';
import { removeSelectedDecos } from './editorTransformUtils';
import { membersForGroup, withGroupMembers } from './groupTree';
import { getHeadLayerIndex, layerIdsForRole } from './layerOrdering';
import { reconcileReferenceImageLayerOrder } from './referenceImageModel';

/** Pre-optimization implementation for exact structural and duplicate-ID comparison. */
function removeSelectedBefore(role: RoleDocument, selectedIds: string[]): RoleDocument | null {
  const selected = new Set(selectedIds.filter((id) => id !== HEAD_LAYER_ID));
  if (!selected.size) return null;
  const oldHeadIndex = getHeadLayerIndex(role);
  const deletedIndexes: number[] = [];
  const decorations = role.decorations.filter((deco, index) => {
    const remove = selected.has(deco.id);
    if (remove) deletedIndexes.push(index);
    return !remove;
  });
  if (decorations.length === role.decorations.length) return null;
  const removedAboveHead = deletedIndexes.filter((index) => index < oldHeadIndex).length;
  const validIds = new Set(decorations.map((deco) => deco.id));
  validIds.add(HEAD_LAYER_ID);
  const groups = (role.groups ?? [])
    .map((group) => withGroupMembers(
      group,
      membersForGroup(group).filter((member) => member.type === 'group' || (validIds.has(member.id) && !selected.has(member.id))),
      role.groups ?? []
    ))
    .filter((group) => group.itemIds.length >= 2);
  return {
    ...role,
    decorations,
    groups,
    headLayerIndex: Math.max(0, Math.min(decorations.length, oldHeadIndex - removedAboveHead)),
    updatedAt: new Date().toISOString()
  };
}

describe('keyboard bulk decoration deletion', () => {
  it('keeps the old nested expansion, counts every duplicate above head, and preserves head', () => {
    const role = makeRoleDocument({
      decorations: ['dup', 'a', 'dup', 'b', 'dup', 'c'].map((id) => makeDecorationLayer(id)),
      headLayerIndex: 4,
      groups: [
        makeDecorationGroup('parent', { members: [
          { type: 'group', id: 'child' }, { type: 'layer', id: 'a' }, { type: 'layer', id: 'missing' }
        ] }),
        makeDecorationGroup('child', { members: [
          { type: 'layer', id: 'dup' }, { type: 'layer', id: 'b' }, { type: 'layer', id: 'c' }
        ] })
      ]
    });
    const selected = ['dup', 'dup', 'missing', HEAD_LAYER_ID];
    const before = removeSelectedBefore(role, selected);
    const after = removeSelectedDecos(role, selected);
    expect(after).not.toBeNull();
    expect(after).toEqual({ ...before, updatedAt: after?.updatedAt });
    expect(after?.decorations.map((layer) => layer.id)).toEqual(['a', 'b', 'c']);
    expect(after?.headLayerIndex).toBe(2);
    expect(after?.headLayer).toBe(role.headLayer);
    expect(after?.groups.map((group) => group.itemIds)).toEqual([['dup', 'b', 'c', 'a'], ['b', 'c']]);
    expect(removeSelectedDecos(role, [HEAD_LAYER_ID, 'missing'])).toBeNull();
  });

  it('matches the old group walk for a cyclic legacy graph', () => {
    const role = makeRoleDocument({
      decorations: ['a', 'b', 'c', 'd'].map((id) => makeDecorationLayer(id)),
      groups: [
        makeDecorationGroup('g1', { members: [{ type: 'group', id: 'g2' }, { type: 'layer', id: 'a' }] }),
        makeDecorationGroup('g2', { members: [{ type: 'group', id: 'g1' }, { type: 'layer', id: 'b' }] }),
        makeDecorationGroup('g3', { members: [{ type: 'group', id: 'g2' }, { type: 'layer', id: 'missing' }] })
      ]
    });
    const selected = ['b', 'd'];
    const before = removeSelectedBefore(role, selected);
    const after = removeSelectedDecos(role, selected);
    expect(after).not.toBeNull();
    expect(after).toEqual({ ...before, updatedAt: after?.updatedAt });
  });

  it('keeps selection history and image order through bulk delete, undo and redo', () => {
    const before = makeRoleDocument({
      decorations: ['a', 'b', 'c', 'd', 'e'].map((id) => makeDecorationLayer(id)),
      headLayerIndex: 3
    });
    const selection = ['b', 'd', HEAD_LAYER_ID];
    const after = removeSelectedDecos(before, selection);
    if (!after) throw new Error('Expected a deletion.');
    const history = makeRoleHistoryEntry(before, after, selection, []);
    if (history?.kind !== 'patch') throw new Error('Expected a history patch.');
    expect(history.selectionIds).toEqual(selection);
    expect(history.inverseSelectionIds).toEqual([]);

    const image = referenceImageLayerToken('ref');
    const imageIds = new Set(['ref']);
    const renderOrder = (role: RoleDocument) => layerIdsForRole(role).reverse();
    const beforeOrder = ['e', 'd', HEAD_LAYER_ID, image, 'c', 'b', 'a'];
    const afterOrder = reconcileReferenceImageLayerOrder(beforeOrder, renderOrder(after), imageIds);
    expect(afterOrder).toEqual(['e', HEAD_LAYER_ID, image, 'c', 'a']);
    const undone = applyRoleHistoryPatch(after, history.patch, 'before');
    expect(undone).toEqual(before);
    expect(reconcileReferenceImageLayerOrder(afterOrder, renderOrder(undone), imageIds)).toEqual(beforeOrder);
    const redone = applyRoleHistoryPatch(undone, history.patch, 'after');
    expect(redone).toEqual(after);
    expect(reconcileReferenceImageLayerOrder(beforeOrder, renderOrder(redone), imageIds)).toEqual(afterOrder);
  });
});
