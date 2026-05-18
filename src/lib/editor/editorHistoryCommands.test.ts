import { describe, expect, it } from 'vitest';
import { makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import type { LocalHistoryEntry } from './editorTransformHistory';
import { resolveLocalRedo, resolveLocalUndo } from './editorHistoryCommands';

describe('editor history commands', () => {
  it('undoes translate entries and moves them to future history', () => {
    const current = makeRoleDocument({
      decorations: [makeDecorationLayer('a', { x: 10, y: 20 })]
    });
    const past: LocalHistoryEntry[] = [
      { kind: 'translate', ids: ['a'], dx: 3, dy: -4, selectionIds: ['a'] }
    ];

    const result = resolveLocalUndo(current, past, []);

    expect(result?.localPast).toEqual([]);
    expect(result?.localFuture).toHaveLength(1);
    expect(result?.nextRole.decorations[0]).toMatchObject({ x: 7, y: 24 });
    expect(result?.restoreSelectionIds).toEqual(['a']);
    expect(result?.clearSelection).toBe(false);
  });

  it('undoes transform entries and stores the current transform for redo', () => {
    const current = makeRoleDocument({
      decorations: [makeDecorationLayer('a', { x: 9, y: 8, scaleX: 2, scaleY: 3, rotation: 45 })]
    });
    const past: LocalHistoryEntry[] = [
      {
        kind: 'transform',
        target: [{ id: 'a', x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0 }],
        selectionIds: ['a']
      }
    ];

    const result = resolveLocalUndo(current, past, []);

    expect(result?.nextRole.decorations[0]).toMatchObject({ x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0 });
    expect(result?.localFuture[0]).toMatchObject({
      kind: 'transform',
      target: [{ id: 'a', x: 9, y: 8, scaleX: 2, scaleY: 3, rotation: 45 }],
      selectionIds: ['a']
    });
  });

  it('redoes transform entries and stores the current transform for undo', () => {
    const current = makeRoleDocument({
      decorations: [makeDecorationLayer('a', { x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0 })]
    });
    const future: LocalHistoryEntry[] = [
      {
        kind: 'transform',
        target: [{ id: 'a', x: 9, y: 8, scaleX: 2, scaleY: 3, rotation: 45 }],
        selectionIds: ['a']
      }
    ];

    const result = resolveLocalRedo(current, [], future);

    expect(result?.nextRole.decorations[0]).toMatchObject({ x: 9, y: 8, scaleX: 2, scaleY: 3, rotation: 45 });
    expect(result?.localPast[0]).toMatchObject({
      kind: 'transform',
      target: [{ id: 'a', x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0 }],
      selectionIds: ['a']
    });
  });

  it('uses snapshot entries as full role restores and clears selection', () => {
    const current = makeRoleDocument({ name: 'current' });
    const snapshot = makeRoleDocument({ name: 'snapshot' });
    const past: LocalHistoryEntry[] = [{ kind: 'snapshot', role: snapshot }];

    const result = resolveLocalUndo(current, past, []);

    expect(result?.nextRole.name).toBe('snapshot');
    expect(result?.localFuture[0]).toMatchObject({ kind: 'snapshot', role: { name: 'current' } });
    expect(result?.restoreSelectionIds).toEqual([]);
    expect(result?.clearSelection).toBe(true);
  });

  it('returns null when there is no local history to handle', () => {
    const current = makeRoleDocument();

    expect(resolveLocalUndo(current, [], [])).toBeNull();
    expect(resolveLocalRedo(current, [], [])).toBeNull();
  });
});
