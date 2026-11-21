import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { referenceImageLayerToken } from '../../types/referenceImage';
import type { DecorationGroup, DecorationLayer, EditorClipboardItem, RoleDocument } from '../../types/role';
import {
  deleteDecorationFromRole,
  deleteSelectedFromRole,
  insertAfterSelection,
  mirrorCopySelectedInRole,
  pasteClipboardIntoRole,
  roleWithDeletedDecoration,
  roleWithSelectedVisibility,
  roleWithToggledDecorationVisibility
} from './editorDecorationMutations';
import { applyRoleHistoryPatch, makeRoleHistoryEntry } from './editorRoleHistoryPatch';
import { cloneRole } from './editorRoleUtils';
import { layerIdsForRole } from './layerOrdering';
import { reconcileReferenceImageLayerOrder } from './referenceImageModel';

function layer(id: string, patch: Partial<DecorationLayer> = {}): DecorationLayer {
  return {
    id,
    code: id,
    assetId: id,
    name: id,
    x: 1,
    y: 2,
    scaleX: 1,
    scaleY: 1,
    rotation: 30,
    visible: true,
    opacity: 1,
    ...patch
  };
}

function role(): RoleDocument {
  const groups: DecorationGroup[] = [
    {
      id: 'g1',
      name: 'Group 1',
      itemIds: ['a', 'c'],
      members: [
        { type: 'layer', id: 'a' },
        { type: 'layer', id: 'c' }
      ],
      visible: true,
      collapsed: false
    }
  ];
  return {
    schemaVersion: 1,
    name: 'role',
    camp: 'x',
    gender: 'male',
    parts: { head: 'head', hand: 'hand', foot: 'foot', cape: 'cape' },
    partFrames: { head: 0, hand: 0, foot: 0, cape: 0 },
    partScales: { head: 1, hand: 1, foot: 1, cape: 1 },
    headLayerIndex: 2,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b'), layer('c')],
    groups,
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

describe('editor decoration mutations', () => {
  it('sets visibility only for selected decorations', () => {
    const current = role();

    const next = roleWithSelectedVisibility(current, ['a', 'c'], false);

    expect(next.decorations.map((item) => [item.id, item.visible])).toEqual([
      ['a', false],
      ['b', true],
      ['c', false]
    ]);
  });

  it('shares unchanged layers and role metadata and does not allocate for no-op visibility', () => {
    const current = role();
    const next = roleWithSelectedVisibility(current, ['a', 'missing'], false);
    expect(next).not.toBe(current);
    expect(next.decorations[0]).not.toBe(current.decorations[0]);
    expect(next.decorations[1]).toBe(current.decorations[1]);
    expect(next.decorations[2]).toBe(current.decorations[2]);
    expect(next.groups).toBe(current.groups);
    expect(next.headLayer).toBe(current.headLayer);
    expect(next.headLayerIndex).toBe(current.headLayerIndex);
    expect(next.parts).toBe(current.parts);
    expect(next.updatedAt).toBe(current.updatedAt);
    expect(current.decorations[0].visible).toBe(true);
    expect(roleWithSelectedVisibility(current, [], false)).toBe(current);
    expect(roleWithSelectedVisibility(current, ['missing'], false)).toBe(current);
    expect(roleWithSelectedVisibility(current, ['a', 'c'], true)).toBe(current);
    expect(roleWithToggledDecorationVisibility(current, 'missing')).toBe(current);
  });

  it('updates all duplicate IDs independently, using each previous visibility when toggling', () => {
    const current = { ...role(), decorations: [layer('dup'), layer('unrelated'), layer('dup', { visible: false })] };
    const toggled = roleWithToggledDecorationVisibility(current, 'dup');
    expect(toggled.decorations.map((entry) => entry.visible)).toEqual([false, true, true]);
    expect(toggled.decorations[1]).toBe(current.decorations[1]);
    const hidden = roleWithSelectedVisibility(current, ['dup', 'dup'], false);
    expect(hidden.decorations.map((entry) => entry.visible)).toEqual([false, true, false]);
    expect(hidden.decorations[2]).toBe(current.decorations[2]);
  });

  it('round-trips visibility with grouping, stable layer order, and the same selection history', () => {
    const initial = role();
    const toggled = roleWithToggledDecorationVisibility(initial, 'b');
    for (const [before, after] of [
      [initial, toggled],
      [toggled, roleWithSelectedVisibility(toggled, ['a', 'b', 'c'], false)]
    ]) {
      const selection = ['a', 'c'];
      const entry = makeRoleHistoryEntry(before, after, selection);
      if (entry?.kind !== 'patch') throw new Error('Expected a visibility history patch.');
      expect(entry.selectionIds).toEqual(selection);
      expect(entry.inverseSelectionIds).toEqual(selection);
      expect(entry.patch.decorations.order).toBeNull();
      expect(entry.patch.decorations.fields).toEqual([]);
      expect(entry.patch.groups.fields).toEqual([]);
      expect(entry.patch.groups.presence).toEqual([]);
      const undone = applyRoleHistoryPatch(after, entry.patch, 'before');
      expect(undone).toEqual(before);
      expect(undone.groups).toBe(before.groups);
      const redone = applyRoleHistoryPatch(undone, entry.patch, 'after');
      expect(redone).toEqual(after);
      expect(redone.groups).toBe(after.groups);
    }
  });

  it('shares surviving layers and preserves exact single-delete semantics for duplicate IDs', () => {
    const current = role();
    const duplicate = {
      ...current,
      decorations: [current.decorations[0], layer('a', { x: 99 }), ...current.decorations.slice(1)],
      headLayerIndex: 3
    };
    const baseline = cloneRole(duplicate);
    deleteDecorationFromRole(baseline, 'a');
    const next = roleWithDeletedDecoration(duplicate, 'a');

    expect(next).toEqual(baseline);
    expect(next.headLayerIndex).toBe(2); // Historical single-delete uses only the first duplicate index.
    expect(next.decorations).toEqual([current.decorations[1], current.decorations[2]]);
    expect(next.decorations[0]).toBe(current.decorations[1]);
    expect(next.headLayer).toBe(duplicate.headLayer);
    expect(next.partFrames).toBe(duplicate.partFrames);
    expect(next.groups[0].members).toEqual([{ type: 'layer', id: 'c' }]);
    expect(duplicate.groups[0].itemIds).toEqual(['a', 'c']);
  });

  it('keeps image stack order and selection through delete, undo and redo', () => {
    const before = role();
    const after = roleWithDeletedDecoration(before, 'b');
    const beforeSelection = ['a', 'b'];
    const afterSelection = beforeSelection.filter((id) => id !== 'b');
    const entry = makeRoleHistoryEntry(before, after, beforeSelection, afterSelection);
    if (entry?.kind !== 'patch') throw new Error('Expected a deletion history patch.');
    expect(entry.selectionIds).toEqual(beforeSelection);
    expect(entry.inverseSelectionIds).toEqual(afterSelection);

    const image = referenceImageLayerToken('ref');
    const imageIds = new Set(['ref']);
    const renderOrder = (snapshot: RoleDocument) => layerIdsForRole(snapshot).reverse();
    const stackBefore = ['c', HEAD_LAYER_ID, image, 'b', 'a'];
    const stackAfter = reconcileReferenceImageLayerOrder(stackBefore, renderOrder(after), imageIds);
    expect(stackAfter).toEqual(['c', HEAD_LAYER_ID, image, 'a']);

    const undone = applyRoleHistoryPatch(after, entry.patch, 'before');
    expect(undone).toEqual(before);
    const stackUndo = reconcileReferenceImageLayerOrder(stackAfter, renderOrder(undone), imageIds);
    expect(stackUndo).toEqual(stackBefore);
    const redone = applyRoleHistoryPatch(undone, entry.patch, 'after');
    expect(redone).toEqual(after);
    expect(reconcileReferenceImageLayerOrder(stackUndo, renderOrder(redone), imageIds)).toEqual(stackAfter);
  });

  it('deletes selected decorations and shifts the head layer index', () => {
    const current = role();

    deleteSelectedFromRole(current, ['a', 'c']);

    expect(current.decorations.map((item) => item.id)).toEqual(['b']);
    expect(current.headLayerIndex).toBe(1);
    expect(current.groups[0].members).toEqual([]);
    expect(current.groups[0].itemIds).toEqual([]);
  });

  it('finds the last matching paste slot regardless of selection order or duplicate layer IDs', () => {
    const current = { ...role(), decorations: [layer('a'), layer('b'), layer('a'), layer('c')] };
    expect(insertAfterSelection(current, ['missing', 'b', 'a', 'b'])).toBe(3);
    expect(insertAfterSelection(current, ['c', 'a'])).toBe(4);
    expect(insertAfterSelection(current, ['missing'])).toBe(0);
    expect(insertAfterSelection(current, [])).toBe(0);
  });

  it('pastes clipboard items after the selection and moves the head layer', () => {
    const current = role();
    const clipboard: EditorClipboardItem[] = [
      { code: 'x', assetId: 'x', name: 'x', x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
      { code: 'y', assetId: 'y', name: 'y', x: 3, y: 4, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 }
    ];

    const pastedIds = pasteClipboardIntoRole(current, clipboard, ['a'], 5);

    expect(pastedIds).toHaveLength(2);
    expect(current.decorations.map((item) => item.code)).toEqual(['a', 'x', 'y', 'b', 'c']);
    expect(current.decorations[1]).toMatchObject({ x: 6, y: 7 });
    expect(current.decorations[2]).toMatchObject({ x: 8, y: 9 });
    expect(current.headLayerIndex).toBe(4);
  });

  it('creates mirrored copies with normalized rotation', () => {
    const current = role();

    const copiedIds = mirrorCopySelectedInRole(current, ['a'], 'horizontal');

    expect(copiedIds).toHaveLength(1);
    expect(current.decorations.map((item) => item.id)).toHaveLength(4);
    expect(current.decorations[1]).toMatchObject({ code: 'a', x: -1, scaleX: -1, rotation: -30 });
    expect(current.headLayerIndex).toBe(3);
  });
});
