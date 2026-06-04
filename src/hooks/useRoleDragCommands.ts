import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import type { RoleDocument } from '../types/role';
import { applyTranslateDelta } from '../lib/editor/editorTransformHistory';
import {
  commandSelectionIdsForRole,
  roleWithDragDelta
} from '../lib/editor/editorRoleCommands';

interface BaseHistoryReset {
  reset(next: RoleDocument, keepHistory?: boolean): void;
}

export function useRoleDragCommands({
  roleRef,
  history,
  selectedDecorationIds,
  stableSelectedIds,
  selectedIdsRef,
  recordLocalHistoryEntry,
  restoreSelection,
  setRole
}: {
  roleRef: MutableRefObject<RoleDocument>;
  history: BaseHistoryReset;
  selectedDecorationIds: string[];
  stableSelectedIds: string[];
  selectedIdsRef: MutableRefObject<string[]>;
  recordLocalHistoryEntry(entry: { kind: 'translate'; ids: string[]; dx: number; dy: number; selectionIds: string[] }): void;
  restoreSelection(ids: string[]): void;
  setRole(updater: (current: RoleDocument) => RoleDocument, mode: 'history' | 'silent'): void;
}) {
  const commitDragDeltaToSelected = useCallback(
    (dx: number, dy: number) => {
      if (Math.abs(dx) <= Number.EPSILON && Math.abs(dy) <= Number.EPSILON) return;
      const selectionIds = commandSelectionIdsForRole(roleRef.current, stableSelectedIds, selectedIdsRef.current);
      const ids = selectionIds.filter((id) => id !== HEAD_LAYER_ID);
      if (!ids.length) return;

      const nextRole = applyTranslateDelta(roleRef.current, ids, dx, dy);
      if (nextRole === roleRef.current) return;

      recordLocalHistoryEntry({ kind: 'translate', ids, dx, dy, selectionIds });
      history.reset(nextRole);
      restoreSelection(selectionIds);
    },
    [history, recordLocalHistoryEntry, restoreSelection, roleRef, selectedIdsRef, stableSelectedIds]
  );

  const applyDragDeltaToSelected = useCallback(
    (dx: number, dy: number) => {
      setRole((current) => roleWithDragDelta(current, selectedDecorationIds, dx, dy), 'silent');
    },
    [selectedDecorationIds, setRole]
  );

  return {
    applyDragDeltaToSelected,
    commitDragDeltaToSelected
  };
}
