import { useEffect } from 'react';
import { resolveKeyboardShortcutCommand } from '../lib/keyboardShortcuts';
import type { TransformValues } from '../types/role';

interface ShortcutActions {
  hasSelection: boolean;
  canGroupSelected: boolean;
  editValues: TransformValues;
  undo(): void;
  redo(): void;
  copy(): void;
  paste(): void;
  selectAll(): void;
  groupSelected(): void;
  deleteSelected(): void;
  clearSelection(): void;
  moveSelectedToBoundary(boundary: 'top' | 'bottom'): void;
  nudge(dx: number, dy: number): void;
  rotateBy(degrees: number): void;
  scaleBy(amount: number): void;
  ratioBy(amount: number): void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = resolveKeyboardShortcutCommand(event, {
        hasSelection: actions.hasSelection,
        canGroupSelected: actions.canGroupSelected
      });

      if (!command) return;
      if (command.preventDefault) event.preventDefault();

      switch (command.action) {
        case 'moveSelectedToBoundary':
          actions.moveSelectedToBoundary(command.boundary);
          return;
        case 'undo':
          actions.undo();
          return;
        case 'redo':
          actions.redo();
          return;
        case 'copy':
          actions.copy();
          return;
        case 'paste':
          actions.paste();
          return;
        case 'selectAll':
          actions.selectAll();
          return;
        case 'groupSelected':
          actions.groupSelected();
          return;
        case 'clearSelection':
          actions.clearSelection();
          return;
        case 'deleteSelected':
          actions.deleteSelected();
          return;
        case 'nudge':
          actions.nudge(command.dx, command.dy);
          return;
        case 'rotateBy':
          actions.rotateBy(command.degrees);
          return;
        case 'scaleBy':
          actions.scaleBy(command.amount);
          return;
        case 'ratioBy':
          actions.ratioBy(command.amount);
          return;
        default:
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}
