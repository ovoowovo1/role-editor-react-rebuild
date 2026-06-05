import { EDITOR_STAGE_MAX_SCALE, EDITOR_STAGE_MIN_SCALE } from '../constants/editor';
import {
  type InsertDraftPlacement,
  type InsertDraftScopes,
  type InsertDraftSettings
} from '../lib/editor/editorInsertSettings';
import { useEditorCommands } from './useEditorCommands';
import { useEditorDerivedState } from './useEditorDerivedState';
import { useEditorState } from './useEditorState';

export type { InsertDraftPlacement, InsertDraftScopes, InsertDraftSettings };

export function useRoleEditor() {
  const {
    history,
    role,
    roleRef,
    selectedTab,
    setSelectedTab,
    stageScale,
    setStageScale,
    insertDraftSettings,
    setInsertDraftSettings,
    updateRole
  } = useEditorState();

  const commands = useEditorCommands({
    history,
    role,
    roleRef,
    insertDraftSettings,
    setSelectedTab,
    updateRole
  });

  const derived = useEditorDerivedState({
    role,
    selectedLayerIds: commands.selectedLayerIds,
    stableSelectedDecorations: commands.stableSelectedDecorations
  });

  return {
    role,
    selectedTab,
    setSelectedTab,
    selectedDecorationIds: commands.stableSelectedIds,
    selectedDecorations: commands.stableSelectedDecorations,
    visibleOptionsByTab: derived.visibleOptionsByTab,
    groups: role.groups ?? [],
    groupMap: derived.groupMap,
    canGroupSelected: derived.canGroupSelected,
    canMergeSelected: derived.canMergeSelected,
    editValues: commands.editValues,
    selectionScaleMin: commands.selectionScaleMin,
    selectionScaleMax: commands.selectionScaleMax,
    selectionRatioMin: commands.selectionRatioMin,
    selectionRatioMax: commands.selectionRatioMax,
    clipboardCount: commands.clipboardCount,
    stageScale,
    setStageScale,
    stageMinScale: EDITOR_STAGE_MIN_SCALE,
    stageMaxScale: EDITOR_STAGE_MAX_SCALE,
    canUndo: commands.canUndo,
    canRedo: commands.canRedo,
    beginTransient: commands.beginTransient,
    commitTransient: commands.commitTransient,
    cancelTransient: history.cancelTransient,
    undo: commands.undo,
    redo: commands.redo,
    insertDraftSettings,
    setInsertDraftSettings,
    choosePart: commands.choosePart,
    updatePartById: commands.updatePartById,
    selectDecoration: commands.selectDecoration,
    clearSelection: commands.clearSelection,
    selectMultipleDecorations: commands.selectMultipleDecorations,
    selectAllDecorations: commands.selectAllDecorations,
    applyDragDeltaToSelected: commands.applyDragDeltaToSelected,
    updateDecoration: commands.updateDecoration,
    updateSelectedTransform: commands.updateSelectedTransform,
    nudgeSelected: commands.nudgeSelected,
    rotateSelectedBy: commands.rotateSelectedBy,
    scaleSelectedBy: commands.scaleSelectedBy,
    ratioSelectedBy: commands.ratioSelectedBy,
    flipSelected: commands.flipSelected,
    flipSelectedVertical: commands.flipSelectedVertical,
    commitDragDeltaToSelected: commands.commitDragDeltaToSelected,
    setSelectedVisible: commands.setSelectedVisible,
    toggleDecorationVisibility: commands.toggleDecorationVisibility,
    selectGroup: commands.selectGroup,
    groupSelected: commands.groupSelected,
    toggleGroupCollapsed: commands.toggleGroupCollapsed,
    renameGroup: commands.renameGroup,
    toggleGroupVisibility: commands.toggleGroupVisibility,
    ungroup: commands.ungroup,
    deleteDecoration: commands.deleteDecoration,
    deleteSelected: commands.deleteSelected,
    copySelected: commands.copySelected,
    pasteClipboard: commands.pasteClipboard,
    mirrorCopyHorizontalSelected: commands.mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected: commands.mirrorCopyVerticalSelected,
    reorderDecorations: commands.reorderDecorations,
    moveSelectedToBoundary: commands.moveSelectedToBoundary,
    changeCamp: commands.changeCamp,
    changeGender: commands.changeGender,
    newDesign: commands.newDesign,
    importRole: commands.importRole,
    mergeImportedRole: commands.mergeImportedRole,
    insertDecorationBatch: commands.insertDecorationBatch
  };
}
