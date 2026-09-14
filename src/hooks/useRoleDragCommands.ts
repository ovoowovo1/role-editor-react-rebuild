import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import { commandSelectionIdsForRole } from '../lib/editor/editorRoleCommands';
import { applyTranslateDelta } from '../lib/editor/editorTransformUtils';
import type { RoleDocument } from '../types/role';

export function useRoleDragCommands({
  roleRef,
  resetRole,
  stableSelectedIds,
  selectedIdsRef,
  recordLocalHistoryEntry,
  restoreSelection
}: {
  roleRef: MutableRefObject<RoleDocument>;
  resetRole(next: RoleDocument, keepHistory?: boolean): void;
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
      resetRole(nextRole);
      restoreSelection(selectionIds);
    },
    [recordLocalHistoryEntry, resetRole, restoreSelection, roleRef, selectedIdsRef, stableSelectedIds]
  );

  return { commitDrag };
}
