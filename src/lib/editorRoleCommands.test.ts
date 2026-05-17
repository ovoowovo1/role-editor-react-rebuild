import { describe, expect, it } from 'vitest';
import { makeDecorationLayer, makePartOption, makeRoleDocument } from '../test/roleFixtures';
import {
  clipboardDecorationsFromSelection,
  copyDecorationsForPaste,
  mirroredCopiedDecorations,
  roleWithChosenBodyPart,
  roleWithDragDelta,
  selectionIdsForCommand
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
});
