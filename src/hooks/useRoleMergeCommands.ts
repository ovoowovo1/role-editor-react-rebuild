import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { DecorationLayer, RoleDocument } from '../types/role';
import { settingsForScope, type InsertDraftSettings } from '../lib/editor/editorInsertSettings';
import {
  insertDecorationBatchIntoRole,
  mergeImportedDecorationsIntoRole
} from '../lib/editor/editorImportMerge';

interface UseRoleMergeCommandsOptions {
  roleRef: MutableRefObject<RoleDocument>;
  insertDraftSettings: InsertDraftSettings;
  commitRole(nextRole: RoleDocument, afterSelectionIds?: string[]): void;
}

export function useRoleMergeCommands({
  roleRef,
  insertDraftSettings,
  commitRole
}: UseRoleMergeCommandsOptions) {
  const mergeImportedRole = useCallback(
    (incoming: RoleDocument) => {
      const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
      const result = mergeImportedDecorationsIntoRole(roleRef.current, incoming, settings);
      if (!result) return;
      commitRole(result.role, result.copiedIds);
    },
    [commitRole, insertDraftSettings, roleRef]
  );

  const insertDecorationBatch = useCallback(
    (decorations: DecorationLayer[], groupName: string) => {
      const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
      const result = insertDecorationBatchIntoRole(roleRef.current, decorations, groupName, settings);
      if (!result) return 0;
      commitRole(result.role, result.copiedIds);
      return result.copiedIds.length;
    },
    [commitRole, insertDraftSettings, roleRef]
  );

  return {
    mergeImportedRole,
    insertDecorationBatch
  };
}
