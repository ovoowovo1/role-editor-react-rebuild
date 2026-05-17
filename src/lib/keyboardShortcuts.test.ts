import { describe, expect, it } from 'vitest';
import { isEditableShortcutTarget, resolveKeyboardShortcutCommand } from './keyboardShortcuts';

const selectable = { hasSelection: true, canGroupSelected: true };

describe('keyboard shortcut helpers', () => {
  it('detects editable targets without depending on a DOM test environment', () => {
    expect(isEditableShortcutTarget({ tagName: 'INPUT', type: 'text' } as unknown as EventTarget)).toBe(true);
    expect(isEditableShortcutTarget({ tagName: 'INPUT', type: 'range' } as unknown as EventTarget)).toBe(false);
    expect(isEditableShortcutTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
    expect(isEditableShortcutTarget({ isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isEditableShortcutTarget(null)).toBe(false);
  });

  it('resolves ctrl/meta commands and ignores editable fields', () => {
    expect(resolveKeyboardShortcutCommand({ key: 'z', ctrlKey: true }, selectable)).toEqual({
      action: 'undo',
      preventDefault: true
    });
    expect(resolveKeyboardShortcutCommand({ key: 'z', metaKey: true, shiftKey: true }, selectable)).toEqual({
      action: 'redo',
      preventDefault: true
    });
    expect(resolveKeyboardShortcutCommand({ key: ']', code: 'BracketRight', ctrlKey: true, shiftKey: true }, selectable)).toEqual({
      action: 'moveSelectedToBoundary',
      boundary: 'top',
      preventDefault: true
    });
    expect(resolveKeyboardShortcutCommand({ key: 'g', ctrlKey: true }, { hasSelection: true, canGroupSelected: false })).toBeNull();
    expect(resolveKeyboardShortcutCommand({
      key: 'c',
      ctrlKey: true,
      target: { tagName: 'INPUT', type: 'text' } as unknown as EventTarget
    }, selectable)).toBeNull();
  });

  it('resolves selection editing commands', () => {
    expect(resolveKeyboardShortcutCommand({ key: 'ArrowLeft' }, selectable)).toEqual({
      action: 'nudge',
      dx: -1,
      dy: 0,
      preventDefault: true
    });
    expect(resolveKeyboardShortcutCommand({ key: 'Escape' }, selectable)).toEqual({
      action: 'clearSelection',
      preventDefault: false
    });
    expect(resolveKeyboardShortcutCommand({ key: 'z', shiftKey: true }, selectable)).toEqual({
      action: 'ratioBy',
      amount: 0.01,
      preventDefault: true
    });
    expect(resolveKeyboardShortcutCommand({ key: '=' }, selectable)).toEqual({
      action: 'scaleBy',
      amount: 0.002,
      preventDefault: true
    });
    expect(resolveKeyboardShortcutCommand({ key: 'Delete' }, { hasSelection: false, canGroupSelected: true })).toBeNull();
  });
});
