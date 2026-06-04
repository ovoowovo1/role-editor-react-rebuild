import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { DecorationLayer, EditorClipboardItem, RoleDocument } from '../types/role';
import { copiedClipboardItems } from '../lib/editor/editorDecorationMutations';
import { insertDecorations, settingsForScope, type InsertDraftSettings } from '../lib/editor/editorInsertSettings';
import {
  clipboardDecorationsFromSelection,
  mirroredCopiedDecorations,
  pasteBaseClipboardIntoRole,
  pasteLocalClipboardIntoRole
} from '../lib/editor/editorRoleCommands';

interface UseRoleClipboardCommandsOptions {
  roleRef: MutableRefObject<RoleDocument>;
  insertDraftSettings: InsertDraftSettings;
  selectedDecorationIds: string[];
  stableSelectedDecorations: DecorationLayer[];
  baseSelectedDecorations: DecorationLayer[];
  commitRole(nextRole: RoleDocument): void;
  restoreSelection(ids: string[]): void;
  setSelectedLayerIds(ids: string[]): void;
  updateRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
}

export function useRoleClipboardCommands({
  roleRef,
  insertDraftSettings,
  selectedDecorationIds,
  stableSelectedDecorations,
  baseSelectedDecorations,
  commitRole,
  restoreSelection,
  setSelectedLayerIds,
  updateRole
}: UseRoleClipboardCommandsOptions) {
  const pasteCountRef = useRef(0);
  const [baseClipboard, setBaseClipboard] = useState<EditorClipboardItem[]>([]);
  const [localClipboard, setLocalClipboard] = useState<DecorationLayer[]>([]);

  const copySelected = useCallback(() => {
    if (stableSelectedDecorations.length) {
      setLocalClipboard(clipboardDecorationsFromSelection(stableSelectedDecorations));
    }
    setBaseClipboard(copiedClipboardItems(baseSelectedDecorations));
    pasteCountRef.current = 0;
  }, [baseSelectedDecorations, stableSelectedDecorations]);

  const pasteClipboard = useCallback(() => {
    if (!localClipboard.length) {
      if (!baseClipboard.length) return;
      const pasteCountBefore = pasteCountRef.current;
      pasteCountRef.current = pasteCountBefore + 1;
      updateRole((current) => {
        const result = pasteBaseClipboardIntoRole(current, baseClipboard, selectedDecorationIds, pasteCountBefore);
        if (!result) return current;
        window.setTimeout(() => setSelectedLayerIds(result.pastedIds), 0);
        return current;
      });
      return;
    }

    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.copy);
    const result = pasteLocalClipboardIntoRole(roleRef.current, localClipboard, settings);
    if (!result) return;
    commitRole(result.role);
    restoreSelection(result.pastedIds);
  }, [
    baseClipboard,
    commitRole,
    insertDraftSettings,
    localClipboard,
    restoreSelection,
    roleRef,
    selectedDecorationIds,
    setSelectedLayerIds,
    updateRole
  ]);

  const mirrorCopyHorizontalSelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.copy);
    const copied = mirroredCopiedDecorations(stableSelectedDecorations, 'horizontal');
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [commitRole, insertDraftSettings, restoreSelection, roleRef, stableSelectedDecorations]);

  const mirrorCopyVerticalSelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.copy);
    const copied = mirroredCopiedDecorations(stableSelectedDecorations, 'vertical');
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [commitRole, insertDraftSettings, restoreSelection, roleRef, stableSelectedDecorations]);

  return {
    clipboardCount: baseClipboard.length,
    copySelected,
    pasteClipboard,
    mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected
  };
}
