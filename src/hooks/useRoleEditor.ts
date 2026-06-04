import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EDITOR_BASE_HISTORY_LIMIT, EDITOR_STAGE_MAX_SCALE, EDITOR_STAGE_MIN_SCALE } from '../constants/editor';
import { camps, createDefaultRole, filterPartOptionsByCamp } from '../mock/options';
import type { GenderCode, PartTab, RoleDocument } from '../types/role';
import { clamp } from '../lib/math';
import {
  cloneRole,
  syncGroups,
  touch
} from '../lib/editor/editorRoleUtils';
import { makeGroupMap } from '../lib/editor/editorGroupMutations';
import {
  DEFAULT_INSERT_SETTINGS,
  sanitizeInsertDraftSettings,
  type InsertDraftPlacement,
  type InsertDraftScopes,
  type InsertDraftSettings
} from '../lib/editor/editorInsertSettings';
import { hasGroupableSelectedLayerIds } from '../lib/editor/headLayerMutations';
import { useRoleClipboardCommands } from './useRoleClipboardCommands';
import { useRoleDecorationCommands } from './useRoleDecorationCommands';
import { useRoleEditorHistory } from './useRoleEditorHistory';
import { useRoleGroupCommands } from './useRoleGroupCommands';
import { useRoleLayerCommands } from './useRoleLayerCommands';
import { useRoleMergeCommands } from './useRoleMergeCommands';
import { useRoleSelection } from './useRoleSelection';
import { useHistory } from './useHistory';

export type { InsertDraftPlacement, InsertDraftScopes, InsertDraftSettings };

export function useRoleEditor() {
  // ============================================================
  // Base history (fallback for coarse-grained undo/redo)
  // ============================================================
  const history = useHistory<RoleDocument>(createDefaultRole(), { limit: EDITOR_BASE_HISTORY_LIMIT });
  const { present: role, setPresent: setRole } = history;

  // ============================================================
  // Refs
  // ============================================================
  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // ============================================================
  // State
  // ============================================================
  const [selectedTab, setSelectedTab] = useState<PartTab>('deco');
  const [stageScale, setStageScaleState] = useState(EDITOR_STAGE_MIN_SCALE);
  const [insertDraftSettings, setInsertDraftSettingsState] = useState<InsertDraftSettings>(DEFAULT_INSERT_SETTINGS);

  // ============================================================
  // Selection
  // ============================================================
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
  } = useRoleSelection({ role, roleRef });

  // ============================================================
  // Derived values
  // ============================================================
  const visibleOptionsByTab = useMemo(
    () => ({
      deco: filterPartOptionsByCamp('deco', role.camp),
      head: filterPartOptionsByCamp('head', role.camp),
      hand: filterPartOptionsByCamp('hand', role.camp),
      foot: filterPartOptionsByCamp('foot', role.camp),
      cape: filterPartOptionsByCamp('cape', role.camp)
    }),
    [role.camp]
  );
  const groupMap = useMemo(() => makeGroupMap(role.groups ?? []), [role.groups]);
  const canGroupSelected = useMemo(
    () => hasGroupableSelectedLayerIds(role, selectedLayerIds),
    [role, selectedLayerIds]
  );
  const canMergeSelected = stableSelectedDecorations.length > 0;

  // ============================================================
  // Role update helpers
  // ============================================================
  const updateRole = useCallback(
    (updater: (current: RoleDocument) => RoleDocument, commit = true) => {
      setRole((current) => syncGroups(touch(updater(cloneRole(current)))), commit ? 'history' : 'silent');
    },
    [setRole]
  );

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

  const {
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    choosePart,
    updatePartById,
    applyDragDeltaToSelected,
    updateDecoration,
    updateSelectedTransform,
    nudgeSelected,
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical,
    commitDragDeltaToSelected,
    setSelectedVisible,
    toggleDecorationVisibility,
    deleteDecoration,
    deleteSelected
  } = useRoleDecorationCommands({
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

  const {
    clipboardCount,
    copySelected,
    pasteClipboard,
    mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected
  } = useRoleClipboardCommands({
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

  const {
    groupSelected,
    toggleGroupCollapsed,
    renameGroup,
    toggleGroupVisibility,
    ungroup
  } = useRoleGroupCommands({
    role,
    roleRef,
    selectedLayerIds,
    commitRole,
    updateRole
  });

  const { reorderDecorations, moveSelectedToBoundary } = useRoleLayerCommands({
    roleRef,
    selectedDecorationIds,
    selectedLayerIds,
    commitRole,
    setRole,
    updateRole
  });

  const { mergeImportedRole, insertDecorationBatch } = useRoleMergeCommands({
    role,
    roleRef,
    insertDraftSettings,
    commitRole,
    restoreSelection,
    clearSelection,
    selectDecoration
  });

  // ============================================================
  // Camp / Gender / Misc
  // ============================================================
  const setStageScale = useCallback((value: number) => {
    setStageScaleState(clamp(Math.round(value), EDITOR_STAGE_MIN_SCALE, EDITOR_STAGE_MAX_SCALE));
  }, []);

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
  }, [importRole]);

  const setInsertDraftSettings = useCallback((settings: InsertDraftSettings) => {
    setInsertDraftSettingsState(sanitizeInsertDraftSettings(settings));
  }, []);

  // ============================================================
  // Return
  // ============================================================
  return {
    role,
    selectedTab,
    setSelectedTab,
    selectedDecorationIds: stableSelectedIds,
    selectedDecorations: stableSelectedDecorations,
    visibleOptionsByTab,
    groups: role.groups ?? [],
    groupMap,
    canGroupSelected,
    canMergeSelected,
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    clipboardCount,
    stageScale,
    setStageScale,
    stageMinScale: EDITOR_STAGE_MIN_SCALE,
    stageMaxScale: EDITOR_STAGE_MAX_SCALE,
    canUndo,
    canRedo,
    beginTransient,
    commitTransient,
    cancelTransient: history.cancelTransient,
    undo,
    redo,
    insertDraftSettings,
    setInsertDraftSettings,
    choosePart,
    updatePartById,
    selectDecoration,
    clearSelection,
    selectMultipleDecorations,
    selectAllDecorations,
    applyDragDeltaToSelected,
    updateDecoration,
    updateSelectedTransform,
    nudgeSelected,
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical,
    commitDragDeltaToSelected,
    setSelectedVisible,
    toggleDecorationVisibility,
    selectGroup,
    groupSelected,
    toggleGroupCollapsed,
    renameGroup,
    toggleGroupVisibility,
    ungroup,
    deleteDecoration,
    deleteSelected,
    copySelected,
    pasteClipboard,
    mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected,
    reorderDecorations,
    moveSelectedToBoundary,
    changeCamp,
    changeGender,
    newDesign,
    importRole,
    mergeImportedRole,
    insertDecorationBatch
  };
}
