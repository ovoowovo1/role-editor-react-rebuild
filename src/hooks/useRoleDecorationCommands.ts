import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import { findOptionByCode, optionById, partOptions } from '../mock/options';
import type { BodyPartTab, DecorationLayer, PartOption, PartTab, RoleDocument } from '../types/role';
import {
  deleteDecorationFromRole,
  setSelectedVisibleInRole,
  toggleDecorationVisibilityInRole
} from '../lib/editor/editorDecorationMutations';
import { insertDecorations, settingsForScope, type InsertDraftSettings } from '../lib/editor/editorInsertSettings';
import { toggleHeadVisibility } from '../lib/editor/headLayerMutations';
import { removeSelectedDecos } from '../lib/editor/editorTransformHistory';
import { makeCenteredDecoration } from '../lib/editor/editorImportMerge';
import {
  roleWithChosenBodyPart,
  selectionIdsForCommand
} from '../lib/editor/editorRoleCommands';
import { useRoleDragCommands } from './useRoleDragCommands';
import { useRoleTransformCommands } from './useRoleTransformCommands';

interface BaseHistoryReset {
  reset(next: RoleDocument, keepHistory?: boolean): void;
}

interface UseRoleDecorationCommandsOptions {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  history: BaseHistoryReset;
  insertDraftSettings: InsertDraftSettings;
  selectedDecorationIds: string[];
  stableSelectedIds: string[];
  baseSelectedDecorations: DecorationLayer[];
  selectedIdsRef: MutableRefObject<string[]>;
  commitRole(nextRole: RoleDocument): void;
  recordLocalHistoryEntry(entry: { kind: 'translate'; ids: string[]; dx: number; dy: number; selectionIds: string[] }): void;
  restoreSelection(ids: string[]): void;
  clearSelection(): void;
  setSelectedLayerIds(updater: (ids: string[]) => string[]): void;
  setRole(updater: (current: RoleDocument) => RoleDocument, mode: 'history' | 'silent'): void;
  updateRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
  withImmediateHistory(action: () => void, restoreIds?: string[]): void;
  withTransformHistory(action: () => void, restoreIds?: string[]): void;
}

export function useRoleDecorationCommands({
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
}: UseRoleDecorationCommandsOptions) {
  const transformCommands = useRoleTransformCommands({
    role,
    roleRef,
    selectedDecorationIds,
    stableSelectedIds,
    baseSelectedDecorations,
    selectedIdsRef,
    updateRole,
    withImmediateHistory,
    withTransformHistory
  });
  const dragCommands = useRoleDragCommands({
    roleRef,
    history,
    selectedDecorationIds,
    stableSelectedIds,
    selectedIdsRef,
    recordLocalHistoryEntry,
    restoreSelection,
    setRole
  });

  const choosePart = useCallback(
    (tab: PartTab, option: PartOption) => {
      if (tab === 'deco') {
        const deco = makeCenteredDecoration(option);
        const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.palette);
        const nextRole = insertDecorations(roleRef.current, [deco], settings);
        commitRole(nextRole);
        restoreSelection([deco.id]);
        return;
      }
      updateRole((current) => roleWithChosenBodyPart(current, tab as BodyPartTab, option));
    },
    [commitRole, insertDraftSettings, restoreSelection, roleRef, updateRole]
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
      updateRole((current) => {
        setSelectedVisibleInRole(current, selectedDecorationIds, visible);
        return current;
      });
    },
    [selectedDecorationIds, updateRole]
  );

  const toggleDecorationVisibility = useCallback(
    (id: string) => {
      if (id === HEAD_LAYER_ID) {
        commitRole(toggleHeadVisibility(roleRef.current));
        return;
      }
      updateRole((current) => {
        toggleDecorationVisibilityInRole(current, id);
        return current;
      });
    },
    [commitRole, roleRef, updateRole]
  );

  const deleteDecoration = useCallback(
    (id: string) => {
      updateRole((current) => {
        deleteDecorationFromRole(current, id);
        return current;
      });
      setSelectedLayerIds((ids) => ids.filter((item) => item !== id));
    },
    [setSelectedLayerIds, updateRole]
  );

  const deleteSelected = useCallback(() => {
    const nextRole = removeSelectedDecos(roleRef.current, selectionIdsForCommand(stableSelectedIds, selectedIdsRef.current));
    if (!nextRole) return;
    commitRole(nextRole);
    clearSelection();
  }, [clearSelection, commitRole, roleRef, selectedIdsRef, stableSelectedIds]);

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
