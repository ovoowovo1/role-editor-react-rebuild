import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { camps, createDefaultRole } from '../mock/options';
import type { GenderCode, PartTab, RoleDocument } from '../types/role';
import type { BaseRoleAppearanceUpdate } from '../lib/editor/editorRoleCommands';
import type { GroupRoleUpdate } from '../lib/editor/editorGroupMutations';
import type { InsertDraftSettings } from '../lib/editor/editorInsertSettings';
import { useRoleClipboardCommands } from './useRoleClipboardCommands';
import { useRoleDecorationCommands } from './useRoleDecorationCommands';
import { useRoleHistoryController, type RoleBaseHistoryApi } from './useRoleHistoryController';
import { useRoleGroupCommands } from './useRoleGroupCommands';
import { useRoleLayerCommands } from './useRoleLayerCommands';
import { useRoleMergeCommands } from './useRoleMergeCommands';
import { useRoleSelection } from './useRoleSelection';

export function useEditorCommands({
  roleHistory,
  role,
  roleRef,
  insertDraftSettings,
  setSelectedTab,
  updateRole,
  updateBaseRoleAppearance,
  updateGroupRole,
  updateTransformRole
}: {
  roleHistory: RoleBaseHistoryApi;
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  insertDraftSettings: InsertDraftSettings;
  setSelectedTab: Dispatch<SetStateAction<PartTab>>;
  updateRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
  updateBaseRoleAppearance(update: BaseRoleAppearanceUpdate): void;
  updateGroupRole(update: GroupRoleUpdate): void;
  updateTransformRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
}) {
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

  const roleHistoryController = useRoleHistoryController({
    history: roleHistory,
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

  const {
    canUndo,
    canRedo,
    commitRole,
    commitRoleUpdate,
    importRole,
    recordLocalHistoryEntry,
    withTransformHistory,
    undo,
    redo,
    clearRedo,
    beginTransient,
    commitTransient
  } = roleHistoryController;

  const decorationCommands = useRoleDecorationCommands({
    role,
    roleRef,
    insertDraftSettings,
    selectedDecorationIds,
    stableSelectedIds,
    baseSelectedDecorations,
    selectedIdsRef,
    commitRole,
    commitRoleUpdate,
    recordLocalHistoryEntry,
    restoreSelection,
    updateRole,
    updateBaseRoleAppearance,
    updateTransformRole,
    withTransformHistory,
    resetRole: roleHistoryController.resetRole
  });

  const clipboardCommands = useRoleClipboardCommands({
    roleRef,
    insertDraftSettings,
    selectedDecorationIds,
    stableSelectedDecorations,
    baseSelectedDecorations,
    commitRole,
    setSelectedLayerIds,
    updateRole
  });

  const groupCommands = useRoleGroupCommands({
    role,
    roleRef,
    selectedLayerIds,
    commitRole,
    updateRole,
    updateGroupRole
  });

  const layerCommands = useRoleLayerCommands({
    roleRef,
    selectedDecorationIds,
    selectedLayerIds,
    commitRole,
    updateRole
  });

  const mergeCommands = useRoleMergeCommands({
    roleRef,
    insertDraftSettings,
    commitRole
  });

  const changeCamp = useCallback(
    (camp: string) => updateBaseRoleAppearance({ type: 'camp', camp }),
    [updateBaseRoleAppearance]
  );

  const changeGender = useCallback(
    (gender: GenderCode) => updateBaseRoleAppearance({ type: 'gender', gender }),
    [updateBaseRoleAppearance]
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
    clearRedo,
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
