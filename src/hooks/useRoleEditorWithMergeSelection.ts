import { useCallback, useEffect, useRef } from 'react';
import { GROUP_ROW_PREFIX } from '../constants/layers';
import { atomsForRole, deriveRoleFromAtoms, rowIdToAtoms } from '../lib/layerOrdering';
import { useRoleEditor as useBaseEditor, type InsertDraftSettings } from './useRoleEditorWithHeadSelectAll';
import type { RoleDocument } from '../types/role';

export type { InsertDraftSettings };

function uniq(ids: string[]): string[] {
  return ids.filter((id, index) => Boolean(id) && ids.indexOf(id) === index);
}

function reorderGroupWithoutUngrouping(role: RoleDocument, activeRowId: string, overRowId: string): RoleDocument | null {
  if (!activeRowId.startsWith(GROUP_ROW_PREFIX)) return null;
  const movingAtoms = rowIdToAtoms(role, activeRowId);
  const overAtoms = rowIdToAtoms(role, overRowId);
  if (!movingAtoms.length || !overAtoms.length) return role;
  if (movingAtoms.some((atom) => overAtoms.includes(atom))) return role;

  const originalAtoms = atomsForRole(role);
  const movingSet = new Set(movingAtoms);
  const overSet = new Set(overAtoms);
  const sourceIndexes = originalAtoms.map((atom, index) => (movingSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  const overIndexes = originalAtoms.map((atom, index) => (overSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  if (!sourceIndexes.length || !overIndexes.length) return role;

  const sourceStart = Math.min(...sourceIndexes);
  const overStart = Math.min(...overIndexes);
  const remainingAtoms = originalAtoms.filter((atom) => !movingSet.has(atom));
  const remainingOverIndexes = remainingAtoms.map((atom, index) => (overSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  if (!remainingOverIndexes.length) return role;

  const targetIndex = sourceStart < overStart ? Math.max(...remainingOverIndexes) + 1 : Math.min(...remainingOverIndexes);
  const nextAtoms = [...remainingAtoms.slice(0, targetIndex), ...movingAtoms, ...remainingAtoms.slice(targetIndex)];
  return deriveRoleFromAtoms(role, nextAtoms);
}

export function useRoleEditor() {
  const editor = useBaseEditor();
  const pendingMergeBeforeIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const beforeIds = pendingMergeBeforeIdsRef.current;
    if (!beforeIds) return;

    const mergedIds = uniq(editor.role.decorations.filter((item) => !beforeIds.has(item.id)).map((item) => item.id));
    if (!mergedIds.length) return;

    pendingMergeBeforeIdsRef.current = null;
    window.setTimeout(() => {
      editor.clearSelection();
      mergedIds.forEach((id, index) => editor.selectDecoration(id, index > 0));
    }, 0);
  }, [editor, editor.role.decorations]);

  const mergeImportedRole = useCallback(
    (incoming: RoleDocument) => {
      pendingMergeBeforeIdsRef.current = new Set(editor.role.decorations.map((item) => item.id));
      editor.mergeImportedRole(incoming);
    },
    [editor]
  );

  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string) => {
      const nextRole = reorderGroupWithoutUngrouping(editor.role, activeRowId, overRowId);
      if (nextRole) {
        editor.importRole(nextRole);
        return;
      }
      editor.reorderDecorations(activeRowId, overRowId);
    },
    [editor]
  );

  return {
    ...editor,
    mergeImportedRole,
    reorderDecorations
  };
}
