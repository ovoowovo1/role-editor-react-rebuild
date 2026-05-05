import { useCallback, useEffect, useRef } from 'react';
import { useRoleEditor as useBaseEditor, type InsertDraftSettings } from './useRoleEditorWithHeadSelectAll';
import type { RoleDocument } from '../types/role';

export type { InsertDraftSettings };

function uniq(ids: string[]): string[] {
  return ids.filter((id, index) => Boolean(id) && ids.indexOf(id) === index);
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

  return {
    ...editor,
    mergeImportedRole
  };
}
