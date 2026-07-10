import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import { commandSelectionIdsForRole } from '../lib/editor/editorRoleCommands';
import { applyTranslateDelta } from '../lib/editor/editorTransformHistory';
import type { RoleDocument } from '../types/role';

interface BaseHistoryReset {
  reset(next: RoleDocument, keepHistory?: boolean): void;
}

export function useRoleDragCommands({
  roleRef,
  history,
  stableSelectedIds,
  selectedIdsRef,
  recordLocalHistoryEntry,
  restoreSelection
}: {
  roleRef: MutableRefObject<RoleDocument>;
  history: BaseHistoryReset;
  stableSelectedIds: string[];
  selectedIdsRef: MutableRefObject<string[]>;
  recordLocalHistoryEntry(entry: { kind: 'translate'; ids: string[]; dx: number; dy: number; selectionIds: string[] }): void;
  restoreSelection(ids: string[]): void;
}) {
  const commitDrag = useCallback(
    (draggedIds: readonly string[], dx: number, dy: number) => {
      if (Math.abs(dx) <= Number.EPSILON && Math.abs(dy) <= Number.EPSILON) return;

      const selectionIds = commandSelectionIdsForRole(
        roleRef.current,
        [...draggedIds],
        stableSelectedIds,
        selectedIdsRef.current
      );
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

  return { commitDrag };
}
