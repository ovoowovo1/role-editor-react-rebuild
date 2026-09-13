import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { makeDecorationLayer, makePartOption, makeRoleDocument } from '../../test/roleFixtures';
import {
  beginTransientSession,
  centeredMirroredCopiedDecorations,
  centeredMirroredExpansion,
  clipboardDecorationsFromSelection,
  commandSelectionIdsForRole,
  commitTransientSession,
  copyDecorationsForPaste,
  mirroredCopiedDecorations,
  pasteBaseClipboardIntoRole,
  pasteLocalClipboardIntoRole,
  roleWithChosenBodyPart,
  selectionIdsToRestoreForRole,
  selectionIdsForCommand,
  stableSelectionIdsForRole
} from './editorRoleCommands';

describe('editor role commands', () => {
  it('chooses stable selection ids before fallback ids', () => {
    const stable = ['a'];
    const fallback = ['b'];
    const secondFallback = ['c'];

    expect(selectionIdsForCommand(stable, fallback)).toEqual(['a']);
    expect(selectionIdsForCommand([], fallback)).toEqual(['b']);
    expect(selectionIdsForCommand([], [], secondFallback)).toEqual(['c']);
    expect(selectionIdsForCommand([], [])).toEqual([]);
    expect(selectionIdsForCommand(stable, fallback)).not.toBe(stable);
    expect(selectionIdsForCommand([], fallback)).not.toBe(fallback);
  });

  it('normalizes command and stable selection ids with transient fallback', () => {
    const role = makeRoleDocument({
      decorations: [makeDecorationLayer('a'), makeDecorationLayer('b')]
    });
    const fallback = ['missing', 'b', HEAD_LAYER_ID, 'b'];

    expect(commandSelectionIdsForRole(role, [], fallback)).toEqual(['b', HEAD_LAYER_ID]);
    expect(stableSelectionIdsForRole(role, ['a'], true, fallback)).toEqual(['a']);
    expect(stableSelectionIdsForRole(role, [], true, fallback)).toEqual(['b', HEAD_LAYER_ID]);
    expect(stableSelectionIdsForRole(role, [], false, fallback)).toEqual([]);
    expect(stableSelectionIdsForRole(role, ['a'], true, fallback)).not.toBe(fallback);
  });

  it('deduplicates restored selection ids and drops missing layers', () => {
    const role = makeRoleDocument({
      decorations: [makeDecorationLayer('a'), makeDecorationLayer('b')]
    });

    expect(selectionIdsToRestoreForRole(role, ['missing', 'a', 'a', HEAD_LAYER_ID, 'b'])).toEqual([
      'a',
      HEAD_LAYER_ID,
      'b'
    ]);
  });

  it('copies and mirrors clipboard decorations without mutating the source', () => {
    const selected = [makeDecorationLayer('a', { x: 12.345, y: -8.765, scaleX: 2, scaleY: 3, rotation: 270 })];
    const clipboard = clipboardDecorationsFromSelection(selected);
    const pasted = copyDecorationsForPaste(clipboard);
    const mirroredX = mirroredCopiedDecorations(selected, 'horizontal');
    const mirroredY = mirroredCopiedDecorations(selected, 'vertical');

    expect(clipboard[0]).toEqual(selected[0]);
    expect(clipboard[0]).not.toBe(selected[0]);
    expect(pasted[0]).toMatchObject({ x: 12.345, y: -8.765, scaleX: 2, scaleY: 3 });
    expect(pasted[0].id).not.toBe(selected[0].id);
    expect(mirroredX[0]).toMatchObject({ x: -12.34, scaleX: -2, rotation: 90 });
    expect(mirroredY[0]).toMatchObject({ y: 8.77, scaleY: -3, rotation: 90 });
    expect(mirroredX[0].id).not.toBe(selected[0].id);
    expect(mirroredY[0].id).not.toBe(selected[0].id);
  });

  it('mirrors a single decoration around the role centre without moving the original', () => {
    const selected = [
      makeDecorationLayer('a', {
        x: 12.345,
        y: -8.765,
        scaleX: 2,
        scaleY: 3,
        rotation: 270,
        visible: false,
        opacity: 0.4
      })
    ];

    const expandedX = centeredMirroredExpansion(selected, 'horizontal');
    const expandedY = centeredMirroredExpansion(selected, 'vertical');

    expect(expandedX.originalDecorations).toEqual(selected);
    expect(expandedY.originalDecorations).toEqual(selected);
    expect(expandedX.originalDecorations[0]).not.toBe(selected[0]);
    expect(expandedX.copiedDecorations).toHaveLength(1);
    expect(expandedX.copiedDecorations[0]).toMatchObject({
      x: 0,
      y: 0,
      scaleX: -2,
      scaleY: 3,
      rotation: 90,
      visible: false,
      opacity: 0.4
    });
    expect(expandedX.copiedDecorations[0].id).not.toBe(selected[0].id);
    expect(expandedY.copiedDecorations[0].id).not.toBe(selected[0].id);

    expect(expandedY.copiedDecorations[0]).toMatchObject({
      x: 0,
      y: 0,
      scaleX: 2,
      scaleY: -3,
      rotation: 90,
      visible: false,
      opacity: 0.4
    });

    expect(selected[0]).toMatchObject({ x: 12.345, y: -8.765, scaleX: 2, scaleY: 3, rotation: 270 });
  });

  it('mirrors a multi-selection around its arithmetic centre without moving originals', () => {
    const selected = [
      makeDecorationLayer('a', { x: 10, y: 4 }),
      makeDecorationLayer('b', { x: 30, y: 14, scaleX: 2, scaleY: 3, rotation: 45 })
    ];

    const expandedX = centeredMirroredExpansion(selected, 'horizontal');
    const expandedY = centeredMirroredExpansion(selected, 'vertical');

    expect(expandedX.originalDecorations).toEqual(selected);
    expect(expandedY.originalDecorations).toEqual(selected);
    expect(expandedX.copiedDecorations.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 10, y: -5 },
      { x: -10, y: 5 }
    ]);
    expect(expandedY.copiedDecorations.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: -10, y: 5 },
      { x: 10, y: -5 }
    ]);
    expect(expandedX.copiedDecorations.map(({ scaleX, scaleY, rotation }) => ({ scaleX, scaleY, rotation }))).toEqual([
      { scaleX: -1, scaleY: 1, rotation: -0 },
      { scaleX: -2, scaleY: 3, rotation: -45 }
    ]);
    expect(expandedY.copiedDecorations.map(({ scaleX, scaleY, rotation }) => ({ scaleX, scaleY, rotation }))).toEqual([
      { scaleX: 1, scaleY: -1, rotation: -0 },
      { scaleX: 2, scaleY: -3, rotation: -45 }
    ]);
  });

  it('places a mirrored multi-selection around the head origin while preserving source positions', () => {
    const selected = [
      makeDecorationLayer('a', { x: -75.3, y: -42.66 }),
      makeDecorationLayer('b', { x: -61.3, y: -39.66 })
    ];

    const copies = centeredMirroredCopiedDecorations(selected, 'horizontal');

    expect(copies.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 7, y: -1.5 },
      { x: -7, y: 1.5 }
    ]);
    expect(selected.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: -75.3, y: -42.66 },
      { x: -61.3, y: -39.66 }
    ]);
  });

  it('keeps the copy-only helper aligned with the expansion copy half', () => {
    const selected = [makeDecorationLayer('a', { x: 4, y: 5 })];
    const expanded = centeredMirroredExpansion(selected, 'horizontal');
    const copies = centeredMirroredCopiedDecorations(selected, 'horizontal');

    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({
      x: expanded.copiedDecorations[0].x,
      y: expanded.copiedDecorations[0].y,
      scaleX: expanded.copiedDecorations[0].scaleX,
      scaleY: expanded.copiedDecorations[0].scaleY,
      rotation: expanded.copiedDecorations[0].rotation
    });
  });

  it('returns no center-mirror copies for an empty selection', () => {
    expect(centeredMirroredCopiedDecorations([], 'horizontal')).toEqual([]);
    expect(centeredMirroredExpansion([], 'vertical')).toEqual({ originalDecorations: [], copiedDecorations: [] });
  });

  it('pastes local clipboard copies and returns ids for selection restoration', () => {
    const role = makeRoleDocument({
      decorations: [makeDecorationLayer('a')]
    });
    const source = makeDecorationLayer('source', { x: 4, y: 5 });
    const result = pasteLocalClipboardIntoRole(role, [source], {
      placement: 'bottom',
      index: '1',
      scopes: { palette: true, copy: true, mergeBatch: true }
    });

    expect(result).not.toBeNull();
    expect(result?.role.decorations).toHaveLength(2);
    expect(result?.pastedIds).toHaveLength(1);
    expect(result?.pastedIds[0]).not.toBe(source.id);
    expect(result?.role.decorations[1]).toMatchObject({ x: 4, y: 5 });
    expect(role.decorations).toHaveLength(1);
  });

  it('pastes base clipboard with incremental offsets after the current selection', () => {
    const role = makeRoleDocument({
      decorations: [
        makeDecorationLayer('a', { x: 1, y: 2 }),
        makeDecorationLayer('b', { x: 10, y: 20 })
      ]
    });
    const { id: _id, ...clipboardItem } = makeDecorationLayer('copy', { x: 3, y: 4 });
    const clipboard = [clipboardItem];

    const first = pasteBaseClipboardIntoRole(role, clipboard, ['a'], 0);
    expect(first).toMatchObject({ pasteCount: 1, offset: 8 });
    expect(first?.pastedIds).toHaveLength(1);
    expect(role.decorations.map((item) => item.id)).toEqual(['a', first?.pastedIds[0], 'b']);
    expect(role.decorations[1]).toMatchObject({ x: 11, y: 12 });

    const second = pasteBaseClipboardIntoRole(role, clipboard, first?.pastedIds ?? [], first?.pasteCount ?? 0);
    expect(second).toMatchObject({ pasteCount: 2, offset: 16 });
    expect(role.decorations[2]).toMatchObject({ x: 19, y: 20 });
  });

  it('updates body part fields while preserving existing scale fallback', () => {
    const role = makeRoleDocument({
      parts: { head: 'old-head', hand: 'hand', foot: 'foot', cape: 'cape' },
      partFrames: { head: 2, hand: 0, foot: 0, cape: 0 },
      partScales: { head: 1.25, hand: 1, foot: 1, cape: 1 }
    });
    const option = makePartOption('new-head', { category: 'head', mockKind: 'head', frame: 7 });

    expect(roleWithChosenBodyPart(role, 'head', option)).toMatchObject({
      parts: { head: 'new-head' },
      partFrames: { head: 7 },
      partScales: { head: 1.25 }
    });

    const optionWithoutFrame = makePartOption('plain-head', { category: 'head', mockKind: 'head' });
    expect(roleWithChosenBodyPart(role, 'head', optionWithoutFrame)).toMatchObject({
      parts: { head: 'plain-head' },
      partFrames: { head: 2 },
      partScales: { head: 1.25 }
    });

    const roleWithoutExistingFrame = makeRoleDocument({
      partFrames: { head: undefined as unknown as number, hand: 0, foot: 0, cape: 0 }
    });
    expect(roleWithChosenBodyPart(roleWithoutExistingFrame, 'head', optionWithoutFrame).partFrames.head).toBe(1);
  });


  it('captures transient transform sessions before falling back to role snapshots', () => {
    const role = makeRoleDocument({
      decorations: [makeDecorationLayer('a', { x: 1, y: 2 })]
    });

    const transformSession = beginTransientSession(role, ['a'], []);
    expect(transformSession.selectionIds).toEqual(['a']);
    expect(transformSession.transformBefore).toEqual([
      { id: 'a', x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0 }
    ]);
    expect(transformSession.roleBefore).toBeNull();

    const snapshotSession = beginTransientSession(role, [], []);
    expect(snapshotSession.selectionIds).toEqual([]);
    expect(snapshotSession.transformBefore).toBeNull();
    expect(snapshotSession.roleBefore).toBe(role);
  });

  it('turns transient commits into pending transform or snapshot decisions', () => {
    const before = makeRoleDocument({
      decorations: [makeDecorationLayer('a', { x: 1 })]
    });
    const current = makeRoleDocument({
      decorations: [makeDecorationLayer('a', { x: 9 })]
    });
    const transformBefore = [{ id: 'a', x: 1, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }];

    expect(commitTransientSession(null, transformBefore, ['a'], current, [])).toMatchObject({
      pendingTransform: { target: transformBefore, selectionIds: ['a'] },
      historyEntry: null,
      restoreSelectionIds: ['a'],
      commitBaseTransient: false
    });

    const changedSnapshot = commitTransientSession(before, null, ['a'], current, ['fallback']);
    expect(changedSnapshot.pendingTransform).toBeNull();
    expect(changedSnapshot.historyEntry).toMatchObject({ kind: 'patch' });
    expect(changedSnapshot.restoreSelectionIds).toEqual(['a']);
    expect(changedSnapshot.commitBaseTransient).toBe(true);

    const unchangedSnapshot = commitTransientSession(before, null, [], before, ['fallback']);
    expect(unchangedSnapshot.historyEntry).toBeNull();
    expect(unchangedSnapshot.restoreSelectionIds).toEqual(['fallback']);
  });
});
