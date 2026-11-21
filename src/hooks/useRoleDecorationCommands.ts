import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import { findOptionByCode, optionById, partOptions } from '../mock/options';
import type { BodyPartTab, DecorationLayer, PartOption, PartTab, RoleDocument } from '../types/role';
import {
  roleWithDeletedDecoration,
  roleWithSelectedVisibility,
  roleWithToggledDecorationVisibility
} from '../lib/editor/editorDecorationMutations';
import { insertDecorations, settingsForScope, type InsertDraftSettings } from '../lib/editor/editorInsertSettings';
import { toggleHeadVisibility } from '../lib/editor/headLayerMutations';
import { removeSelectedDecos } from '../lib/editor/editorTransformUtils';
import { makeCenteredDecoration } from '../lib/editor/editorImportMerge';
import {
  type BaseRoleAppearanceUpdate,
  selectionIdsForCommand
} from '../lib/editor/editorRoleCommands';
import { useRoleDragCommands } from './useRoleDragCommands';
import { useRoleTransformCommands } from './useRoleTransformCommands';

interface UseRoleDecorationCommandsOptions {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  resetRole(next: RoleDocument, keepHistory?: boolean): void;
  insertDraftSettings: InsertDraftSettings;
  selectedDecorationIds: string[];
  stableSelectedIds: string[];
  baseSelectedDecorations: DecorationLayer[];
  selectedIdsRef: MutableRefObject<string[]>;
  commitRole(nextRole: RoleDocument, afterSelectionIds?: string[]): void;
  commitRoleUpdate(updater: (current: RoleDocument) => RoleDocument, afterSelectionIds?: string[]): void;
  recordLocalHistoryEntry(entry: { kind: 'translate'; ids: string[]; dx: number; dy: number; selectionIds: string[] }): void;
  restoreSelection(ids: string[]): void;
  updateRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
  updateBaseRoleAppearance(update: BaseRoleAppearanceUpdate): void;
  updateTransformRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
  withTransformHistory(action: () => void, restoreIds?: string[]): void;
}

export function useRoleDecorationCommands({
  role,
  roleRef,
  resetRole,
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
  withTransformHistory
}: UseRoleDecorationCommandsOptions) {
  const transformCommands = useRoleTransformCommands({
    role,
    roleRef,
    selectedDecorationIds,
    stableSelectedIds,
    baseSelectedDecorations,
    selectedIdsRef,
    updateRole,
    updateTransformRole,
    commitRoleUpdate,
    withTransformHistory
  });
  const dragCommands = useRoleDragCommands({
    roleRef,
    resetRole,
    stableSelectedIds,
    selectedIdsRef,
    recordLocalHistoryEntry,
    restoreSelection
  });

  const choosePart = useCallback(
    (tab: PartTab, option: PartOption) => {
      if (tab === 'deco') {
        const deco = makeCenteredDecoration(option);
        const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.palette);
        const nextRole = insertDecorations(roleRef.current, [deco], settings);
        commitRole(nextRole, [deco.id]);
        return;
      }
      updateBaseRoleAppearance({ type: 'part', tab, option });
    },
    [commitRole, insertDraftSettings, roleRef, updateBaseRoleAppearance]
  );

  const updatePartById = useCallback(
    (tab: BodyPartTab, optionId: string) => {
      const option = optionById[optionId] ?? findOptionByCode(tab, optionId) ?? partOptions[tab][0];
      choosePart(tab, option);
    },
    [choosePart]
  );

  const setSelectedVisible = useCallback(
    (visible: boolean) => {
      commitRole(roleWithSelectedVisibility(roleRef.current, selectedDecorationIds, visible));
    },
    [commitRole, roleRef, selectedDecorationIds]
  );

  const toggleDecorationVisibility = useCallback(
    (id: string) => {
      if (id === HEAD_LAYER_ID) {
        commitRole(toggleHeadVisibility(roleRef.current));
        return;
      }
      commitRole(roleWithToggledDecorationVisibility(roleRef.current, id));
    },
    [commitRole, roleRef]
  );

  const deleteDecoration = useCallback(
    (id: string) => {
      const nextRole = roleWithDeletedDecoration(roleRef.current, id);
      commitRole(nextRole, selectedIdsRef.current.filter((item) => item !== id));
    },
    [commitRole, roleRef, selectedIdsRef]
  );

  const deleteSelected = useCallback(() => {
    const nextRole = removeSelectedDecos(roleRef.current, selectionIdsForCommand(stableSelectedIds, selectedIdsRef.current));
    if (!nextRole) return;
    commitRole(nextRole, []);
  }, [commitRole, roleRef, selectedIdsRef, stableSelectedIds]);

  return {
    ...transformCommands,
    ...dragCommands,
    choosePart,
    updatePartById,
    setSelectedVisible,
    toggleDecorationVisibility,
    deleteDecoration,
    deleteSelected
  };
}
