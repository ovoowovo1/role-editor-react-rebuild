import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { DecorationLayer, RoleDocument } from '../types/role';
import { settingsForScope, type InsertDraftSettings } from '../lib/editor/editorInsertSettings';
import {
  type DecorationBatchGroupDraft,
  insertDecorationBatchIntoRole,
  insertGroupedDecorationBatchIntoRole,
  mergeImportedDecorationsIntoRole
} from '../lib/editor/editorImportMerge';

interface UseRoleMergeCommandsOptions {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  insertDraftSettings: InsertDraftSettings;
  commitRole(nextRole: RoleDocument): void;
  restoreSelection(ids: string[]): void;
  clearSelection(): void;
  selectDecoration(id: string, additive?: boolean): void;
}

export function useRoleMergeCommands({
  role,
  roleRef,
  insertDraftSettings,
  commitRole,
  restoreSelection,
  clearSelection,
  selectDecoration
}: UseRoleMergeCommandsOptions) {
  const pendingMergeBeforeIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const beforeIds = pendingMergeBeforeIdsRef.current;
    if (!beforeIds) return;

    const mergedIds = [...new Set(role.decorations.filter((item) => !beforeIds.has(item.id)).map((item) => item.id))];
    if (!mergedIds.length) return;

    pendingMergeBeforeIdsRef.current = null;
    window.setTimeout(() => {
      clearSelection();
      mergedIds.forEach((id, index) => selectDecoration(id, index > 0));
    }, 0);
  }, [clearSelection, role.decorations, selectDecoration]);

  const mergeImportedRole = useCallback(
    (incoming: RoleDocument) => {
      pendingMergeBeforeIdsRef.current = new Set(roleRef.current.decorations.map((item) => item.id));

      const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
      const result = mergeImportedDecorationsIntoRole(roleRef.current, incoming, settings);
      if (!result) return;
      commitRole(result.role);
      restoreSelection(result.copiedIds);
    },
    [commitRole, insertDraftSettings, restoreSelection, roleRef]
  );

  const insertDecorationBatch = useCallback(
    (decorations: DecorationLayer[], groupName: string) => {
      const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
      const result = insertDecorationBatchIntoRole(roleRef.current, decorations, groupName, settings);
      if (!result) return 0;
      commitRole(result.role);
      restoreSelection(result.copiedIds);
      return result.copiedIds.length;
    },
    [commitRole, insertDraftSettings, restoreSelection, roleRef]
  );

  const insertGroupedDecorationBatch = useCallback(
    (decorations: DecorationLayer[], groups: DecorationBatchGroupDraft[], groupName: string) => {
      const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
      const result = insertGroupedDecorationBatchIntoRole(roleRef.current, decorations, groups, groupName, settings);
      if (!result) return 0;
      commitRole(result.role);
      restoreSelection(result.copiedIds);
      return result.copiedIds.length;
    },
    [commitRole, insertDraftSettings, restoreSelection, roleRef]
  );

  return {
    mergeImportedRole,
    insertDecorationBatch,
    insertGroupedDecorationBatch
  };
}
