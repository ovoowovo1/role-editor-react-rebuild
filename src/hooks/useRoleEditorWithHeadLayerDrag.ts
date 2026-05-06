import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DecorationGroup, DecorationLayer, EditorClipboardItem, PartOption, RoleDocument } from '../types/role';
import { HEAD_LAYER_ID } from '../constants/layers';
import { orderedLayerIds } from '../lib/layerOrdering';
import { round } from '../lib/math';
import { copyDecorationForInsert, makeDecoration } from '../lib/editorDecorationMutations';
import {
  DEFAULT_INSERT_SETTINGS,
  insertDecorations,
  sanitizeInsertDraftSettings,
  settingsForScope,
  type InsertDraftPlacement,
  type InsertDraftScopes,
  type InsertDraftSettings
} from '../lib/editorInsertSettings';
import { pushLocalFuture, pushLocalPast, sameRole } from '../lib/editorLocalHistory';
import {
  createGroupFromLayerSelection,
  decorationIdsFromLayerIds,
  nextGroupId,
  reorderIncludingHead,
  setGroupVisibilityIncludingHead,
  toggleHeadVisibility,
  toggleLayerSelection,
  ungroupIncludingHead,
  ungroupedSelectedLayerIds
} from '../lib/headLayerMutations';
import { useRoleEditor as useBaseRoleEditor } from './useRoleEditor';

export type { InsertDraftPlacement, InsertDraftScopes, InsertDraftSettings };

function nextGroupName(role: RoleDocument): string {
  return `Group ${(role.groups ?? []).length + 1}`;
}

function mergeImportedRoleIntoCurrent(role: RoleDocument, incoming: RoleDocument, settings: InsertDraftSettings): { role: RoleDocument; insertedIds: string[] } {
  const idMap = new Map<string, string>();
  const copied = incoming.decorations.map((item, index) => {
    const next = copyDecorationForInsert(item, index * 2);
    idMap.set(item.id, next.id);
    return next;
  });
  const nextRole = insertDecorations(role, copied, settings);
  const importedGroups = (incoming.groups ?? [])
    .map((group): DecorationGroup | null => {
      const itemIds = group.itemIds
        .map((id) => idMap.get(id))
        .filter((id): id is string => Boolean(id));
      if (itemIds.length < 2) return null;
      return {
        id: nextGroupId(),
        name: group.name || nextGroupName(nextRole),
        visible: group.visible !== false,
        collapsed: group.collapsed === true,
        itemIds
      };
    })
    .filter((group): group is DecorationGroup => group !== null);
  return {
    role: {
      ...nextRole,
      groups: [...(nextRole.groups ?? []), ...importedGroups],
      updatedAt: new Date().toISOString()
    },
    insertedIds: copied.map((item) => item.id)
  };
}

export function useRoleEditor() {
  const editor = useBaseRoleEditor();
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(editor.selectedDecorationIds);
  const [insertDraftSettings, setInsertDraftSettingsState] = useState<InsertDraftSettings>(DEFAULT_INSERT_SETTINGS);
  const [localClipboard, setLocalClipboard] = useState<EditorClipboardItem[]>([]);
  const [localPasteCount, setLocalPasteCount] = useState(0);
  const [localPast, setLocalPast] = useState<RoleDocument[]>([]);
  const [localFuture, setLocalFuture] = useState<RoleDocument[]>([]);

  const commitRole = useCallback(
    (nextRole: RoleDocument, nextSelectionIds?: string[]) => {
      if (sameRole(editor.role, nextRole)) return;
      setLocalPast((items) => pushLocalPast(items, editor.role));
      setLocalFuture([]);
      editor.importRole(nextRole);
      if (nextSelectionIds) setSelectedLayerIds(nextSelectionIds);
    },
    [editor]
  );

  const undo = useCallback(() => {
    if (localPast.length) {
      const previous = localPast[localPast.length - 1];
      setLocalPast((items) => items.slice(0, -1));
      setLocalFuture((items) => pushLocalFuture(items, editor.role));
      editor.importRole(previous);
      setSelectedLayerIds([]);
      return;
    }
    editor.undo();
  }, [editor, localPast]);

  const redo = useCallback(() => {
    if (localFuture.length) {
      const next = localFuture[0];
      setLocalFuture((items) => items.slice(1));
      setLocalPast((items) => pushLocalPast(items, editor.role));
      editor.importRole(next);
      setSelectedLayerIds([]);
      return;
    }
    editor.redo();
  }, [editor, localFuture]);

  const setInsertDraftSettings = useCallback((settings: InsertDraftSettings) => {
    setInsertDraftSettingsState(sanitizeInsertDraftSettings(settings));
  }, []);

  useEffect(() => {
    setSelectedLayerIds((ids) => {
      const valid = new Set([...editor.role.decorations.map((item) => item.id), HEAD_LAYER_ID]);
      return ids.filter((id) => valid.has(id));
    });
  }, [editor.role.decorations]);

  const selectedDecorationIdsOnly = useMemo(
    () => decorationIdsFromLayerIds(editor.role, selectedLayerIds),
    [editor.role, selectedLayerIds]
  );

  const selectedDecorations = useMemo(() => {
    const selectedSet = new Set(selectedLayerIds);
    return editor.role.decorations.filter((item) => selectedSet.has(item.id));
  }, [editor.role.decorations, selectedLayerIds]);

  const canGroupSelected = useMemo(
    () => ungroupedSelectedLayerIds(editor.role, selectedLayerIds).length >= 2,
    [editor.role, selectedLayerIds]
  );

  const canMergeSelected = selectedDecorations.length > 0;

  const selectDecoration = useCallback(
    (id: string, additive = false) => {
      if (id === HEAD_LAYER_ID) {
        setSelectedLayerIds((current) => toggleLayerSelection(current, [HEAD_LAYER_ID], additive));
        if (!additive) editor.clearSelection();
        return;
      }
      setSelectedLayerIds((current) => toggleLayerSelection(current, [id], additive));
      editor.selectDecoration(id, additive);
    },
    [editor]
  );

  const clearSelection = useCallback(() => {
    setSelectedLayerIds([]);
    editor.clearSelection();
  }, [editor]);

  const selectMultipleDecorations = useCallback((ids: string[]) => {
    setSelectedLayerIds(ids);
    editor.selectMultipleDecorations(ids.filter((id) => id !== HEAD_LAYER_ID));
  }, [editor]);

  const selectGroup = useCallback(
    (groupId: string, additive = false) => {
      const group = editor.role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      const ids = orderedLayerIds(editor.role, group.itemIds);
      setSelectedLayerIds((current) => toggleLayerSelection(current, ids, additive));
      editor.selectGroup(groupId, additive);
    },
    [editor]
  );

  const groupSelected = useCallback(() => {
    const nextRole = createGroupFromLayerSelection(editor.role, selectedLayerIds);
    if (!nextRole) return;
    commitRole(nextRole);
  }, [commitRole, editor.role, selectedLayerIds]);

  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string) => {
      const nextRole = reorderIncludingHead(editor.role, activeRowId, overRowId, selectedLayerIds);
      if (nextRole) {
        commitRole(nextRole);
        return;
      }
      editor.reorderDecorations(activeRowId, overRowId);
    },
    [commitRole, editor, selectedLayerIds]
  );

  const toggleDecorationVisibility = useCallback(
    (id: string) => {
      if (id === HEAD_LAYER_ID) {
        commitRole(toggleHeadVisibility(editor.role));
        return;
      }
      editor.toggleDecorationVisibility(id);
    },
    [commitRole, editor]
  );

  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      const group = editor.role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      if (group.itemIds.includes(HEAD_LAYER_ID)) {
        commitRole(setGroupVisibilityIncludingHead(editor.role, groupId, group.visible === false));
        return;
      }
      editor.toggleGroupVisibility(groupId);
    },
    [commitRole, editor]
  );

  const renameGroup = useCallback(
    (groupId: string, name: string) => {
      editor.renameGroup(groupId, name);
    },
    [editor]
  );

  const ungroup = useCallback(
    (groupId: string) => {
      const group = editor.role.groups?.find((item) => item.id === groupId);
      if (group?.itemIds.includes(HEAD_LAYER_ID)) {
        commitRole(ungroupIncludingHead(editor.role, groupId));
        return;
      }
      editor.ungroup(groupId);
    },
    [commitRole, editor]
  );

  const choosePart = useCallback(
    (tab: Parameters<typeof editor.choosePart>[0], option: PartOption) => {
      if (tab === 'deco' && insertDraftSettings.scopes.palette) {
        const deco = makeDecoration(option, editor.role.decorations.length);
        const nextRole = insertDecorations(editor.role, [deco], insertDraftSettings);
        commitRole(nextRole, [deco.id]);
        return;
      }
      editor.choosePart(tab, option);
    },
    [commitRole, editor, insertDraftSettings]
  );

  const copySelected = useCallback(() => {
    const copied = selectedDecorations.map(({ id: _id, ...item }) => item);
    setLocalClipboard(copied);
    editor.copySelected();
  }, [editor, selectedDecorations]);

  const pasteClipboard = useCallback(() => {
    if (!insertDraftSettings.scopes.copy || !localClipboard.length) {
      editor.pasteClipboard();
      return;
    }
    const offset = 8 + localPasteCount * 4;
    const pasted = localClipboard.map((item) => copyDecorationForInsert(item, offset));
    const nextRole = insertDecorations(editor.role, pasted, insertDraftSettings);
    commitRole(nextRole, pasted.map((item) => item.id));
    setLocalPasteCount((count) => count + 1);
  }, [commitRole, editor, insertDraftSettings, localClipboard, localPasteCount]);

  const mirrorCopyHorizontalSelected = useCallback(() => {
    if (!insertDraftSettings.scopes.copy || !selectedDecorations.length) {
      editor.mirrorCopyHorizontalSelected();
      return;
    }
    const copied = selectedDecorations.map((item) => ({ ...copyDecorationForInsert(item), x: round(-item.x, 2) }));
    const nextRole = insertDecorations(editor.role, copied, insertDraftSettings);
    commitRole(nextRole, copied.map((item) => item.id));
  }, [commitRole, editor, insertDraftSettings, selectedDecorations]);

  const mirrorCopyVerticalSelected = useCallback(() => {
    if (!insertDraftSettings.scopes.copy || !selectedDecorations.length) {
      editor.mirrorCopyVerticalSelected();
      return;
    }
    const copied = selectedDecorations.map((item) => ({ ...copyDecorationForInsert(item), y: round(-item.y, 2) }));
    const nextRole = insertDecorations(editor.role, copied, insertDraftSettings);
    commitRole(nextRole, copied.map((item) => item.id));
  }, [commitRole, editor, insertDraftSettings, selectedDecorations]);

  const mergeSelectedAsBatch = useCallback(() => {
    if (!selectedDecorations.length) return;
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
    const copied = selectedDecorations.map((item, index) => copyDecorationForInsert(item, index * 2));
    const nextRole = insertDecorations(editor.role, copied, settings);
    commitRole(nextRole, copied.map((item) => item.id));
  }, [commitRole, editor.role, insertDraftSettings, selectedDecorations]);

  const mergeImportedRole = useCallback(
    (incoming: RoleDocument) => {
      const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
      const result = mergeImportedRoleIntoCurrent(editor.role, incoming, settings);
      commitRole(result.role, result.insertedIds);
    },
    [commitRole, editor.role, insertDraftSettings]
  );

  const importRole = useCallback(
    (role: RoleDocument) => {
      setLocalPast([]);
      setLocalFuture([]);
      setSelectedLayerIds([]);
      editor.importRole(role);
    },
    [editor]
  );

  return {
    ...editor,
    role: editor.role,
    canUndo: localPast.length > 0 || editor.canUndo,
    canRedo: localFuture.length > 0 || editor.canRedo,
    undo,
    redo,
    importRole,
    selectedDecorationIds: selectedLayerIds,
    selectedDecorations,
    canGroupSelected,
    canMergeSelected,
    insertDraftSettings,
    setInsertDraftSettings,
    selectDecoration,
    selectMultipleDecorations,
    clearSelection,
    selectGroup,
    groupSelected,
    renameGroup,
    toggleGroupVisibility,
    ungroup,
    reorderDecorations,
    toggleDecorationVisibility,
    choosePart,
    copySelected,
    pasteClipboard,
    mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected,
    mergeSelectedAsBatch,
    mergeImportedRole,
    selectedDecorationIdsOnly
  };
}
