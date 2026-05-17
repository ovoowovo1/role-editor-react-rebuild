import { clamp } from './math';

export interface KeyboardShortcutState {
  hasSelection: boolean;
  canGroupSelected: boolean;
}

export interface KeyboardEventLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  target?: EventTarget | null;
}

export type KeyboardShortcutCommand =
  | { action: 'moveSelectedToBoundary'; boundary: 'top' | 'bottom'; preventDefault: true }
  | { action: 'undo'; preventDefault: true }
  | { action: 'redo'; preventDefault: true }
  | { action: 'copy'; preventDefault: true }
  | { action: 'paste'; preventDefault: true }
  | { action: 'selectAll'; preventDefault: true }
  | { action: 'groupSelected'; preventDefault: true }
  | { action: 'clearSelection'; preventDefault: false }
  | { action: 'deleteSelected'; preventDefault: true }
  | { action: 'nudge'; dx: number; dy: number; preventDefault: true }
  | { action: 'rotateBy'; degrees: number; preventDefault: true }
  | { action: 'scaleBy'; amount: number; preventDefault: true }
  | { action: 'ratioBy'; amount: number; preventDefault: true };

const TEXT_INPUT_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week'
]);

interface EditableTargetLike {
  isContentEditable?: boolean;
  tagName?: string;
  type?: string;
}

export function isEditableShortcutTarget(target: EventTarget | null | undefined): boolean {
  if (!target || typeof target !== 'object') return false;
  const element = target as EditableTargetLike;
  if (element.isContentEditable) return true;
  const tag = typeof element.tagName === 'string' ? element.tagName.toLowerCase() : '';
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag !== 'input') return false;
  return TEXT_INPUT_TYPES.has((element.type ?? 'text').toLowerCase());
}

export function resolveKeyboardShortcutCommand(
  event: KeyboardEventLike,
  state: KeyboardShortcutState
): KeyboardShortcutCommand | null {
  const editable = isEditableShortcutTarget(event.target);
  const ctrl = Boolean(event.ctrlKey || event.metaKey);
  const key = event.key.toLowerCase();

  if (ctrl) {
    if (editable) return null;
    if (event.shiftKey && (event.code === 'BracketLeft' || event.code === 'BracketRight')) {
      return {
        action: 'moveSelectedToBoundary',
        boundary: event.code === 'BracketRight' ? 'top' : 'bottom',
        preventDefault: true
      };
    }
    switch (key) {
      case 'z':
        return event.shiftKey
          ? { action: 'redo', preventDefault: true }
          : { action: 'undo', preventDefault: true };
      case 'y':
        return { action: 'redo', preventDefault: true };
      case 'c':
        return { action: 'copy', preventDefault: true };
      case 'v':
        return { action: 'paste', preventDefault: true };
      case 'a':
        return { action: 'selectAll', preventDefault: true };
      case 'g':
        return state.canGroupSelected ? { action: 'groupSelected', preventDefault: true } : null;
      default:
        return null;
    }
  }

  if (editable || !state.hasSelection) return null;

  switch (key) {
    case 'escape':
      return { action: 'clearSelection', preventDefault: false };
    case 'delete':
    case 'backspace':
      return { action: 'deleteSelected', preventDefault: true };
    case 'arrowdown':
    case 's':
      return { action: 'nudge', dx: 0, dy: 1, preventDefault: true };
    case 'arrowup':
    case 'w':
      return { action: 'nudge', dx: 0, dy: -1, preventDefault: true };
    case 'arrowright':
    case 'd':
      return { action: 'nudge', dx: 1, dy: 0, preventDefault: true };
    case 'arrowleft':
    case 'a':
      return { action: 'nudge', dx: -1, dy: 0, preventDefault: true };
    case 'c':
      return { action: 'rotateBy', degrees: 0.25, preventDefault: true };
    case 'v':
      return { action: 'rotateBy', degrees: -0.25, preventDefault: true };
    case 'z':
      return event.shiftKey
        ? { action: 'ratioBy', amount: 0.01, preventDefault: true }
        : { action: 'scaleBy', amount: 0.001, preventDefault: true };
    case 'x':
      return event.shiftKey
        ? { action: 'ratioBy', amount: -0.01, preventDefault: true }
        : { action: 'scaleBy', amount: -0.001, preventDefault: true };
    case '+':
    case '=':
      return { action: 'scaleBy', amount: clamp(0.002, 0.001, 0.1), preventDefault: true };
    default:
      return null;
  }
}
