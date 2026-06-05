import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { camps, createDefaultRole } from '../mock/options';
import type { GenderCode, PartTab, RoleDocument } from '../types/role';
import type { InsertDraftSettings } from '../lib/editor/editorInsertSettings';
import { useHistory } from './useHistory';
import { useRoleClipboardCommands } from './useRoleClipboardCommands';
import { useRoleDecorationCommands } from './useRoleDecorationCommands';
import { useRoleEditorHistory } from './useRoleEditorHistory';
import { useRoleGroupCommands } from './useRoleGroupCommands';
import { useRoleLayerCommands } from './useRoleLayerCommands';
import { useRoleMergeCommands } from './useRoleMergeCommands';
import { useRoleSelection } from './useRoleSelection';

type EditorHistory = ReturnType<typeof useHistory<RoleDocument>>;

export function useEditorCommands({
  history,
  role,
  roleRef,
  insertDraftSettings,
  setSelectedTab,
  updateRole
}: {
  history: EditorHistory;
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  insertDraftSettings: InsertDraftSettings;
  setSelectedTab: Dispatch<SetStateAction<PartTab>>;
  updateRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
}) {
  const { setPresent: setRole } = history;
  const selection = useRoleSelection({ role, roleRef });
  const {
    selectedLayerIds,
    setSelectedLayerIds,
    selectedIdsRef,
    transientBeforeRef,
    transientTransformBeforeRef,
    transientSelectionBeforeRef,
    selectedDecorationIds,
    stableSelectedIds,
    stableSelectedDecorations,
    baseSelectedDecorations,
    restoreSelection,
    selectDecoration,
    clearSelection,
    selectMultipleDecorations,
    selectAllDecorations,
    selectGroup
  } = selection;

  const {
    canUndo,
    canRedo,
    commitRole,
    importRole,
    recordLocalHistoryEntry,
    withImmediateHistory,
    withTransformHistory,
    undo,
    redo,
    beginTransient,
    commitTransient
  } = useRoleEditorHistory({
    history,
    role,
    roleRef,
    stableSelectedIds,
    selectedIdsRef,
    setSelectedLayerIds,
    transientBeforeRef,
    transientTransformBeforeRef,
    transientSelectionBeforeRef,
    restoreSelection
  });

  const decorationCommands = useRoleDecorationCommands({
    role,
    roleRef,
    history,
    insertDraftSettings,
    selectedDecorationIds,
    stableSelectedIds,
    baseSelectedDecorations,
    selectedIdsRef,
    commitRole,
    recordLocalHistoryEntry,
    restoreSelection,
    clearSelection,
    setSelectedLayerIds,
    setRole,
    updateRole,
    withImmediateHistory,
    withTransformHistory
  });

  const clipboardCommands = useRoleClipboardCommands({
    roleRef,
    insertDraftSettings,
    selectedDecorationIds,
    stableSelectedDecorations,
    baseSelectedDecorations,
    commitRole,
    restoreSelection,
    setSelectedLayerIds,
    updateRole
  });

  const groupCommands = useRoleGroupCommands({
    role,
    roleRef,
    selectedLayerIds,
    commitRole,
    updateRole
  });

  const layerCommands = useRoleLayerCommands({
    roleRef,
    selectedDecorationIds,
    selectedLayerIds,
    commitRole,
    setRole,
    updateRole
  });

  const mergeCommands = useRoleMergeCommands({
    role,
    roleRef,
    insertDraftSettings,
    commitRole,
    restoreSelection,
    clearSelection,
    selectDecoration
  });

  const changeCamp = useCallback(
    (camp: string) => updateRole((current) => ({ ...current, camp })),
    [updateRole]
  );

  const changeGender = useCallback(
    (gender: GenderCode) => updateRole((current) => ({ ...current, gender })),
    [updateRole]
  );

  const newDesign = useCallback(() => {
    importRole(createDefaultRole(camps[0].code, 'male'));
    setSelectedTab('deco');
  }, [importRole, setSelectedTab]);

  return {
    selectedLayerIds,
    rawSelectedDecorationIds: selectedDecorationIds,
    stableSelectedIds,
    stableSelectedDecorations,
    canUndo,
    canRedo,
    beginTransient,
    commitTransient,
    undo,
    redo,
    importRole,
    selectDecoration,
    clearSelection,
    selectMultipleDecorations,
    selectAllDecorations,
    selectGroup,
    changeCamp,
    changeGender,
    newDesign,
    ...decorationCommands,
    ...clipboardCommands,
    ...groupCommands,
    ...layerCommands,
    ...mergeCommands
  };
}
