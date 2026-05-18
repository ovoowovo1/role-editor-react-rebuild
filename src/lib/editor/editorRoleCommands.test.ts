import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { makeDecorationLayer, makePartOption, makeRoleDocument } from '../../test/roleFixtures';
import {
  beginTransientSession,
  clipboardDecorationsFromSelection,
  commandSelectionIdsForRole,
  commitTransientSession,
  copyDecorationsForPaste,
  mirroredCopiedDecorations,
  roleWithChosenBodyPart,
  roleWithDragDelta,
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

  it('applies silent drag deltas to selected decorations only', () => {
    const role = makeRoleDocument({
      updatedAt: 'old',
      decorations: [
        makeDecorationLayer('a', { x: 1, y: 2 }),
        makeDecorationLayer('b', { x: 10, y: 20 })
      ]
    });
    const next = roleWithDragDelta(role, ['a'], 3, -4);

    expect(next.decorations[0]).toMatchObject({ x: 4, y: -2 });
    expect(next.decorations[1]).toBe(role.decorations[1]);
    expect(next.updatedAt).not.toBe('old');
    expect(roleWithDragDelta(role, [], 3, -4)).toBe(role);
    expect(roleWithDragDelta(role, ['a'], 0, 0)).toBe(role);
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
    expect(snapshotSession.roleBefore).toEqual(role);
    expect(snapshotSession.roleBefore).not.toBe(role);
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
      snapshotEntry: null,
      restoreSelectionIds: ['a'],
      commitBaseTransient: false
    });

    const changedSnapshot = commitTransientSession(before, null, ['a'], current, ['fallback']);
    expect(changedSnapshot.pendingTransform).toBeNull();
    expect(changedSnapshot.snapshotEntry).toMatchObject({ kind: 'snapshot', role: before });
    expect(changedSnapshot.restoreSelectionIds).toEqual(['a']);
    expect(changedSnapshot.commitBaseTransient).toBe(true);

    const unchangedSnapshot = commitTransientSession(before, null, [], before, ['fallback']);
    expect(unchangedSnapshot.snapshotEntry).toBeNull();
    expect(unchangedSnapshot.restoreSelectionIds).toEqual(['fallback']);
  });
});
