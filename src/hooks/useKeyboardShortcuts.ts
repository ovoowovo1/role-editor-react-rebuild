import { useEffect } from 'react';
import { clamp } from '../lib/math';
import type { TransformValues } from '../types/role';

interface ShortcutActions {
  hasSelection: boolean;
  editValues: TransformValues;
  undo(): void;
  redo(): void;
  copy(): void;
  paste(): void;
  selectAll(): void;
  deleteSelected(): void;
  clearSelection(): void;
  moveSelectedToBoundary(boundary: 'top' | 'bottom'): void;
  nudge(dx: number, dy: number): void;
  rotateBy(degrees: number): void;
  scaleBy(amount: number): void;
  ratioBy(amount: number): void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag !== 'input') return false;
  const input = target as HTMLInputElement;
  return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color', 'hidden'].includes(input.type);
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editable = isEditableTarget(event.target);
      const ctrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (ctrl) {
        if (editable) return;
        if (event.shiftKey && (event.code === 'BracketLeft' || event.code === 'BracketRight')) {
          event.preventDefault();
          actions.moveSelectedToBoundary(event.code === 'BracketRight' ? 'top' : 'bottom');
          return;
        }
        switch (key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) actions.redo();
            else actions.undo();
            return;
          case 'y':
            event.preventDefault();
            actions.redo();
            return;
          case 'c':
            event.preventDefault();
            actions.copy();
            return;
          case 'v':
            event.preventDefault();
            actions.paste();
            return;
          case 'a':
            event.preventDefault();
            actions.selectAll();
            return;
          default:
            return;
        }
      }

      if (editable || !actions.hasSelection) return;

      switch (key) {
        case 'escape':
          actions.clearSelection();
          return;
        case 'delete':
        case 'backspace':
          event.preventDefault();
          actions.deleteSelected();
          return;
        case 'arrowdown':
        case 's':
          event.preventDefault();
          actions.nudge(0, 1);
          return;
        case 'arrowup':
        case 'w':
          event.preventDefault();
          actions.nudge(0, -1);
          return;
        case 'arrowright':
        case 'd':
          event.preventDefault();
          actions.nudge(1, 0);
          return;
        case 'arrowleft':
        case 'a':
          event.preventDefault();
          actions.nudge(-1, 0);
          return;
        case 'c':
          event.preventDefault();
          actions.rotateBy(0.25);
          return;
        case 'v':
          event.preventDefault();
          actions.rotateBy(-0.25);
          return;
        case 'z':
          event.preventDefault();
          if (event.shiftKey) actions.ratioBy(0.01);
          else actions.scaleBy(0.001);
          return;
        case 'x':
          event.preventDefault();
          if (event.shiftKey) actions.ratioBy(-0.01);
          else actions.scaleBy(-0.001);
          return;
        case '+':
        case '=':
          event.preventDefault();
          actions.scaleBy(clamp(0.002, 0.001, 0.1));
          return;
        default:
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}
