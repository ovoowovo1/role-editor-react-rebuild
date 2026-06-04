import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import { EDITOR_BASE_HISTORY_LIMIT, EDITOR_STAGE_MAX_SCALE, EDITOR_STAGE_MIN_SCALE } from '../constants/editor';
import { camps, createDefaultRole, filterPartOptionsByCamp, findOptionByCode, optionById, partOptions } from '../mock/options';
import type { BodyPartTab, DecorationLayer, EditorClipboardItem, GenderCode, PartOption, PartTab, RoleDocument, TransformValues } from '../types/role';
import { clamp } from '../lib/math';
import {
  cloneRole,
  orderedSelectedDecorations,
  syncGroups,
  touch
} from '../lib/editor/editorRoleUtils';
import {
  copiedClipboardItems,
  deleteDecorationFromRole,
  makeDecoration,
  moveSelectedToBoundaryInRole,
  setSelectedVisibleInRole,
  toggleDecorationVisibilityInRole
} from '../lib/editor/editorDecorationMutations';
import {
  makeGroupMap,
  renameGroupInRole,
  setGroupVisibleInRole,
  toggleGroupCollapsedInRole,
  ungroupInRole
} from '../lib/editor/editorGroupMutations';
import { reorderBaseEditorLayersImmutable } from '../lib/editor/editorLayerDrag';
import type { LayerReorderOptions } from '../lib/editor/editorLayerDrag';
import {
  DEFAULT_INSERT_SETTINGS,
  insertDecorations,
  sanitizeInsertDraftSettings,
  settingsForScope,
  type InsertDraftPlacement,
  type InsertDraftScopes,
  type InsertDraftSettings
} from '../lib/editor/editorInsertSettings';
import {
  createGroupFromLayerSelection,
  decorationIdsFromLayerIds,
  reorderIncludingHead,
  groupContainsHeadLayer,
  setGroupVisibilityIncludingHead,
  toggleHeadVisibility,
  toggleLayerSelection,
  ungroupIncludingHead,
  ungroupedSelectedLayerIds,
  hasGroupableSelectedLayerIds
} from '../lib/editor/headLayerMutations';
import { resolveLocalRedo, resolveLocalUndo } from '../lib/editor/editorHistoryCommands';
import {
  applyTranslateDelta,
  captureDecorationTransforms,
  makeSnapshotEntry,
  pushLocalHistoryEntry,
  removeSelectedDecos,
  sameRole,
  sameTransformTarget,
  transformValuesFromSingleDeco,
  type DecorationTransformTarget,
  type LocalHistoryEntry
} from '../lib/editor/editorTransformHistory';
import {
  insertDecorationBatchIntoRole,
  makeCenteredDecoration,
  mergeImportedDecorationsIntoRole
} from '../lib/editor/editorImportMerge';
import { reorderGroupWithoutUngrouping } from '../lib/editor/editorGroupReorder';
import { useEditorGroupTransform } from './useEditorGroupTransform';
import { useHistory } from './useHistory';
import { layerIdsForRole } from '../lib/editor/layerOrdering';
import { patchDecorationForSelectionDrag, selectedLayerIdsForGroup } from '../lib/editor/editorSelectionCommands';
import {
  beginTransientSession,
  clipboardDecorationsFromSelection,
  commandSelectionIdsForRole,
  commitTransientSession,
  mirroredCopiedDecorations,
  pasteBaseClipboardIntoRole,
  pasteLocalClipboardIntoRole,
  roleWithChosenBodyPart,
  roleWithDragDelta,
  selectionIdsForCommand,
  selectionIdsToRestoreForRole,
  stableSelectionIdsForRole
} from '../lib/editor/editorRoleCommands';

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
  const pasteCountRef = useRef(0);
  const selectedIdsRef = useRef<string[]>([]);
  const transientBeforeRef = useRef<RoleDocument | null>(null);
  const transientTransformBeforeRef = useRef<DecorationTransformTarget[] | null>(null);
  const transientSelectionBeforeRef = useRef<string[]>([]);
  const pendingTransformHistoryRef = useRef<{ target: DecorationTransformTarget[]; selectionIds: string[] } | null>(null);
  const pendingTransformFinalizeRef = useRef<number | null>(null);
  const pendingMergeBeforeIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // ============================================================
  // State
  // ============================================================
  const [selectedTab, setSelectedTab] = useState<PartTab>('deco');
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [baseClipboard, setBaseClipboard] = useState<EditorClipboardItem[]>([]);
  const [stageScale, setStageScaleState] = useState(EDITOR_STAGE_MIN_SCALE);
  const [insertDraftSettings, setInsertDraftSettingsState] = useState<InsertDraftSettings>(DEFAULT_INSERT_SETTINGS);
  const [localClipboard, setLocalClipboard] = useState<DecorationLayer[]>([]);
  const [localPasteCount, setLocalPasteCount] = useState(0);

  // Unified typed history (single source of truth for fine-grained undo/redo)
  const [localPast, setLocalPast] = useState<LocalHistoryEntry[]>([]);
  const [localFuture, setLocalFuture] = useState<LocalHistoryEntry[]>([]);

  // ============================================================
  // Derived: decoration-only IDs (excludes HEAD_LAYER_ID)
  // ============================================================
  const selectedDecorationIds = useMemo(
    () => decorationIdsFromLayerIds(role, selectedLayerIds),
    [role, selectedLayerIds]
  );

  // Validate selection on role changes
  useEffect(() => {
    setSelectedLayerIds((ids) => {
      const valid = new Set(role.decorations.map((item) => item.id));
      valid.add(HEAD_LAYER_ID);
      return ids.filter((id) => valid.has(id));
    });
  }, [role.decorations]);

  // ============================================================
  // Stable selection (survives transient clears)
  // ============================================================
  useEffect(() => {
    if (selectedLayerIds.length) {
      selectedIdsRef.current = selectedLayerIds;
    } else if (!transientBeforeRef.current && !transientTransformBeforeRef.current) {
      selectedIdsRef.current = [];
    }
  }, [selectedLayerIds]);

  const stableSelectedIds = useMemo(() => {
    return stableSelectionIdsForRole(
      role,
      selectedLayerIds,
      Boolean(transientBeforeRef.current || transientTransformBeforeRef.current),
      transientSelectionBeforeRef.current,
      selectedIdsRef.current
    );
  }, [role, selectedLayerIds]);

  const stableSelectedDecorations = useMemo(() => {
    const selectedSet = new Set(stableSelectedIds);
    return role.decorations.filter((deco) => selectedSet.has(deco.id));
  }, [role.decorations, stableSelectedIds]);

  // ============================================================
  // Derived values
  // ============================================================
  const baseSelectedDecorations = useMemo(
    () => orderedSelectedDecorations(role, selectedDecorationIds),
    [role, selectedDecorationIds]
  );
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

  const commitRole = useCallback(
    (nextRole: RoleDocument) => {
      if (sameRole(roleRef.current, nextRole)) return;
      setLocalPast((items) => pushLocalHistoryEntry(items, makeSnapshotEntry(roleRef.current)));
      setLocalFuture([]);
      history.reset(nextRole);
    },
    [history]
  );

  const importRole = useCallback(
    (nextRole: RoleDocument) => {
      setLocalPast([]);
      setLocalFuture([]);
      setSelectedLayerIds([]);
      history.reset(nextRole);
    },
    [history]
  );

  // ============================================================
  // Selection restoration
  // ============================================================
  const restoreSelection = useCallback(
    (ids: string[]) => {
      const nextIds = [...new Set(ids.filter(Boolean))];
      if (!nextIds.length) return;
      window.setTimeout(() => {
        const stillValid = selectionIdsToRestoreForRole(roleRef.current, nextIds);
        if (!stillValid.length) return;
        selectedIdsRef.current = stillValid;
        setSelectedLayerIds(stillValid);
      }, 0);
    },
    []
  );

  // ============================================================
  // Transform history finalization
  // ============================================================
  const finalizePendingTransformHistory = useCallback(
    (targetRole: RoleDocument = roleRef.current) => {
      const pending = pendingTransformHistoryRef.current;
      if (!pending) return;

      const currentTarget = captureDecorationTransforms(targetRole, pending.selectionIds);
      pendingTransformHistoryRef.current = null;

      if (!currentTarget.length || sameTransformTarget(pending.target, currentTarget)) return;
      setLocalPast((items) =>
        pushLocalHistoryEntry(items, {
          kind: 'transform',
          target: pending.target,
          selectionIds: pending.selectionIds
        })
      );
      setLocalFuture([]);
      restoreSelection(pending.selectionIds);
    },
    [restoreSelection]
  );

  const schedulePendingTransformFinalize = useCallback(() => {
    if (pendingTransformFinalizeRef.current !== null) {
      cancelAnimationFrame(pendingTransformFinalizeRef.current);
    }
    pendingTransformFinalizeRef.current = requestAnimationFrame(() => {
      pendingTransformFinalizeRef.current = requestAnimationFrame(() => {
        pendingTransformFinalizeRef.current = null;
        finalizePendingTransformHistory(roleRef.current);
      });
    });
  }, [finalizePendingTransformHistory]);

  useEffect(() => {
    finalizePendingTransformHistory(role);
  }, [role, finalizePendingTransformHistory]);

  useEffect(
    () => () => {
      if (pendingTransformFinalizeRef.current !== null) {
        cancelAnimationFrame(pendingTransformFinalizeRef.current);
      }
    },
    []
  );

  // ============================================================
  // History action wrappers
  // ============================================================
  const withImmediateHistory = useCallback(
    (action: () => void, restoreIds = selectedIdsRef.current) => {
      const before = cloneRole(roleRef.current);
      setLocalPast((items) => pushLocalHistoryEntry(items, makeSnapshotEntry(before)));
      setLocalFuture([]);
      action();
      restoreSelection(restoreIds);
    },
    [restoreSelection]
  );

  const withTransformHistory = useCallback(
    (action: () => void, restoreIds = selectedIdsRef.current) => {
      const selectionIds = commandSelectionIdsForRole(roleRef.current, restoreIds, selectedIdsRef.current);
      const beforeTarget = captureDecorationTransforms(roleRef.current, selectionIds);
      if (!beforeTarget.length) {
        action();
        return;
      }

      pendingTransformHistoryRef.current ??= { target: beforeTarget, selectionIds };
      action();
      schedulePendingTransformFinalize();
    },
    [schedulePendingTransformFinalize]
  );

  // ============================================================
  // Group Transform
  // ============================================================
  const {
    editValues: editValuesRaw,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    updateSelectedTransform: updateSelectedTransformRaw,
    nudgeSelected: nudgeSelectedRaw,
    rotateSelectedBy: rotateSelectedByRaw,
    scaleSelectedBy: scaleSelectedByRaw,
    ratioSelectedBy: ratioSelectedByRaw,
    flipSelected: flipSelectedRaw,
    flipSelectedVertical: flipSelectedVerticalRaw
  } = useEditorGroupTransform({
    role,
    roleRef,
    selectedDecorationIds,
    selectedDecorations: baseSelectedDecorations,
    updateRole
  });

  const stableEditValues = useMemo<TransformValues>(() => {
    const decoIds = stableSelectedIds.filter((id) => id !== HEAD_LAYER_ID);
    if (decoIds.length === 1) {
      const deco = role.decorations.find((item) => item.id === decoIds[0]);
      if (deco) return transformValuesFromSingleDeco(deco);
    }
    return editValuesRaw;
  }, [editValuesRaw, role.decorations, stableSelectedIds]);

  // ============================================================
  // Undo / Redo (unified: typed local history first, then base)
  // ============================================================
  const undo = useCallback(() => {
    const result = resolveLocalUndo(roleRef.current, localPast, localFuture);
    if (result) {
      setLocalPast(result.localPast);
      setLocalFuture(result.localFuture);
      if (result.clearSelection) {
        selectedIdsRef.current = [];
        setSelectedLayerIds([]);
      }
      history.reset(result.nextRole);
      restoreSelection(result.restoreSelectionIds);
      return;
    }
    history.undo();
  }, [history, localFuture, localPast, restoreSelection]);

  const redo = useCallback(() => {
    const result = resolveLocalRedo(roleRef.current, localPast, localFuture);
    if (result) {
      setLocalPast(result.localPast);
      setLocalFuture(result.localFuture);
      if (result.clearSelection) {
        selectedIdsRef.current = [];
        setSelectedLayerIds([]);
      }
      history.reset(result.nextRole);
      restoreSelection(result.restoreSelectionIds);
      return;
    }
    history.redo();
  }, [history, localFuture, localPast, restoreSelection]);

  // ============================================================
  // Transient
  // ============================================================
  const beginTransient = useCallback(() => {
    const session = beginTransientSession(roleRef.current, stableSelectedIds, selectedIdsRef.current);
    transientSelectionBeforeRef.current = session.selectionIds;

    if (session.transformBefore) {
      transientBeforeRef.current = null;
      transientTransformBeforeRef.current = session.transformBefore;
      history.cancelTransient();
      return;
    }

    transientTransformBeforeRef.current = null;
    transientBeforeRef.current = session.roleBefore;
    history.beginTransient();
  }, [history, stableSelectedIds]);

  const commitTransient = useCallback(() => {
    const before = transientBeforeRef.current;
    const transformBefore = transientTransformBeforeRef.current;
    const selectionBefore = transientSelectionBeforeRef.current;
    transientBeforeRef.current = null;
    transientTransformBeforeRef.current = null;
    transientSelectionBeforeRef.current = [];

    const session = commitTransientSession(before, transformBefore, selectionBefore, roleRef.current, selectedIdsRef.current);

    if (session.pendingTransform) {
      pendingTransformHistoryRef.current ??= session.pendingTransform;
      schedulePendingTransformFinalize();
      return;
    }

    if (session.commitBaseTransient) history.commitTransient();
    if (session.snapshotEntry) {
      setLocalPast((items) => pushLocalHistoryEntry(items, session.snapshotEntry!));
    }
    restoreSelection(session.restoreSelectionIds);
  }, [history, restoreSelection, schedulePendingTransformFinalize]);

  // ============================================================
  // Selection actions
  // ============================================================
  const selectDecoration = useCallback(
    (id: string, additive = false) => {
      const isAlreadyInMultiSelection = !additive && stableSelectedIds.length > 1 && stableSelectedIds.includes(id);
      if (isAlreadyInMultiSelection) return;

      setSelectedLayerIds((current) => {
        if (id === HEAD_LAYER_ID) return toggleLayerSelection(current, [HEAD_LAYER_ID], additive);
        return toggleLayerSelection(current, [id], additive);
      });
    },
    [stableSelectedIds]
  );

  const clearSelection = useCallback(() => {
    selectedIdsRef.current = [];
    transientTransformBeforeRef.current = null;
    transientSelectionBeforeRef.current = [];
    setSelectedLayerIds([]);
  }, []);

  const selectMultipleDecorations = useCallback((ids: string[]) => {
    selectedIdsRef.current = ids;
    setSelectedLayerIds(ids);
  }, []);

  const selectAllDecorations = useCallback(() => {
    const ids = layerIdsForRole(role);
    selectMultipleDecorations(ids);
  }, [role, selectMultipleDecorations]);

  const selectGroup = useCallback(
    (groupId: string, additive = false) => {
      const ids = selectedLayerIdsForGroup(role, groupId);
      if (!ids.length) return;
      setSelectedLayerIds((current) => toggleLayerSelection(current, ids, additive));
    },
    [role]
  );

  // ============================================================
  // Decoration CRUD
  // ============================================================
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
      // Body part
      updateRole((current) => roleWithChosenBodyPart(current, tab as BodyPartTab, option));
    },
    [commitRole, insertDraftSettings, restoreSelection, updateRole]
  );

  const updateDecoration = useCallback(
    (id: string, patch: Partial<DecorationLayer>, commit?: boolean) => {
      const selectionBefore = selectionIdsForCommand(stableSelectedIds, selectedIdsRef.current);

      const runUpdate = () => {
        const selectedIds = selectionIdsForCommand(selectionBefore, selectedIdsRef.current);
        updateRole((current) => patchDecorationForSelectionDrag(current, id, patch, selectedIds), commit);
      };

      if (commit) withImmediateHistory(runUpdate, selectionBefore);
      else runUpdate();
    },
    [stableSelectedIds, updateRole, withImmediateHistory]
  );

  const updateSelectedTransform = useCallback(
    (patch: Partial<TransformValues>, commit?: boolean) => {
      const selectionBefore = selectionIdsForCommand(stableSelectedIds, selectedIdsRef.current);
      if (commit) withTransformHistory(() => updateSelectedTransformRaw(patch, false), selectionBefore);
      else updateSelectedTransformRaw(patch, commit);
    },
    [stableSelectedIds, updateSelectedTransformRaw, withTransformHistory]
  );

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => withTransformHistory(() => nudgeSelectedRaw(dx, dy, false)),
    [nudgeSelectedRaw, withTransformHistory]
  );

  const rotateSelectedBy = useCallback(
    (degrees: number) => withTransformHistory(() => rotateSelectedByRaw(degrees, false)),
    [rotateSelectedByRaw, withTransformHistory]
  );

  const scaleSelectedBy = useCallback(
    (amount: number) => withTransformHistory(() => scaleSelectedByRaw(amount, false)),
    [scaleSelectedByRaw, withTransformHistory]
  );

  const ratioSelectedBy = useCallback(
    (amount: number) => withTransformHistory(() => ratioSelectedByRaw(amount, false)),
    [ratioSelectedByRaw, withTransformHistory]
  );

  const flipSelected = useCallback(
    () => withTransformHistory(() => flipSelectedRaw(false)),
    [flipSelectedRaw, withTransformHistory]
  );

  const flipSelectedVertical = useCallback(
    () => withTransformHistory(() => flipSelectedVerticalRaw(false)),
    [flipSelectedVerticalRaw, withTransformHistory]
  );

  const commitDragDeltaToSelected = useCallback(
    (dx: number, dy: number) => {
      if (Math.abs(dx) <= Number.EPSILON && Math.abs(dy) <= Number.EPSILON) return;
      const selectionIds = commandSelectionIdsForRole(roleRef.current, stableSelectedIds, selectedIdsRef.current);
      const ids = selectionIds.filter((id) => id !== HEAD_LAYER_ID);
      if (!ids.length) return;

      const nextRole = applyTranslateDelta(roleRef.current, ids, dx, dy);
      if (nextRole === roleRef.current) return;

      setLocalPast((items) =>
        pushLocalHistoryEntry(items, { kind: 'translate', ids, dx, dy, selectionIds })
      );
      setLocalFuture([]);
      history.reset(nextRole);
      restoreSelection(selectionIds);
    },
    [history, restoreSelection, stableSelectedIds]
  );

  const applyDragDeltaToSelected = useCallback(
    (dx: number, dy: number) => {
      setRole((current) => roleWithDragDelta(current, selectedDecorationIds, dx, dy), 'silent');
    },
    [selectedDecorationIds, setRole]
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
    [commitRole, updateRole]
  );

  const deleteDecoration = useCallback(
    (id: string) => {
      updateRole((current) => {
        deleteDecorationFromRole(current, id);
        return current;
      });
      setSelectedLayerIds((ids) => ids.filter((item) => item !== id));
    },
    [updateRole]
  );

  const deleteSelected = useCallback(() => {
    const nextRole = removeSelectedDecos(roleRef.current, selectionIdsForCommand(stableSelectedIds, selectedIdsRef.current));
    if (!nextRole) return;
    commitRole(nextRole);
    clearSelection();
  }, [clearSelection, commitRole, stableSelectedIds]);

  // ============================================================
  // Clipboard
  // ============================================================
  const copySelected = useCallback(() => {
    if (stableSelectedDecorations.length) {
      setLocalClipboard(clipboardDecorationsFromSelection(stableSelectedDecorations));
    }
    setBaseClipboard(copiedClipboardItems(baseSelectedDecorations));
    pasteCountRef.current = 0;
  }, [baseSelectedDecorations, stableSelectedDecorations]);

  const pasteClipboard = useCallback(() => {
    if (!localClipboard.length) {
      // Fallback to base clipboard
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
  }, [baseClipboard, commitRole, insertDraftSettings, localClipboard, restoreSelection, selectedDecorationIds, updateRole]);

  const mirrorCopyHorizontalSelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.copy);
    const copied = mirroredCopiedDecorations(stableSelectedDecorations, 'horizontal');
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [commitRole, insertDraftSettings, restoreSelection, stableSelectedDecorations]);

  const mirrorCopyVerticalSelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.copy);
    const copied = mirroredCopiedDecorations(stableSelectedDecorations, 'vertical');
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [commitRole, insertDraftSettings, restoreSelection, stableSelectedDecorations]);

  // ============================================================
  // Group actions
  // ============================================================
  const groupSelected = useCallback(() => {
    const nextRole = createGroupFromLayerSelection(roleRef.current, selectedLayerIds);
    if (!nextRole) return;
    commitRole(nextRole);
  }, [commitRole, selectedLayerIds]);

  const toggleGroupCollapsed = useCallback(
    (groupId: string) => {
      updateRole((current) => {
        toggleGroupCollapsedInRole(current, groupId);
        return current;
      });
    },
    [updateRole]
  );

  const renameGroup = useCallback(
    (groupId: string, name: string) => {
      updateRole((current) => {
        renameGroupInRole(current, groupId, name);
        return current;
      });
    },
    [updateRole]
  );

  const setGroupVisible = useCallback(
    (groupId: string, visible: boolean) => {
      updateRole((current) => {
        setGroupVisibleInRole(current, groupId, visible);
        return current;
      });
    },
    [updateRole]
  );

  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      const group = role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      if (groupContainsHeadLayer(roleRef.current, groupId)) {
        commitRole(setGroupVisibilityIncludingHead(roleRef.current, groupId, group.visible === false));
        return;
      }
      setGroupVisible(groupId, group.visible === false);
    },
    [commitRole, role.groups, setGroupVisible]
  );

  const ungroup = useCallback(
    (groupId: string) => {
      const group = role.groups?.find((item) => item.id === groupId);
      if (group && groupContainsHeadLayer(roleRef.current, groupId)) {
        commitRole(ungroupIncludingHead(roleRef.current, groupId));
        return;
      }
      updateRole((current) => {
        ungroupInRole(current, groupId);
        return current;
      });
    },
    [commitRole, role.groups, updateRole]
  );

  // ============================================================
  // Layer reorder
  // ============================================================
  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string, options: LayerReorderOptions = {}) => {
      if (activeRowId === overRowId) return;
      // Try stable group reorder first
      const nextRole = reorderGroupWithoutUngrouping(roleRef.current, activeRowId, overRowId, options);
      if (nextRole) {
        commitRole(nextRole);
        return;
      }
      // Try head-including reorder
      const headNextRole = reorderIncludingHead(roleRef.current, activeRowId, overRowId, selectedLayerIds, options);
      if (headNextRole) {
        commitRole(headNextRole);
        return;
      }
      // Fallback to base reorder
      setRole(
        (current) => reorderBaseEditorLayersImmutable(current, activeRowId, overRowId, selectedDecorationIds, options) ?? current,
        'history'
      );
    },
    [commitRole, selectedDecorationIds, selectedLayerIds, setRole]
  );

  const moveSelectedToBoundary = useCallback(
    (boundary: 'top' | 'bottom') => {
      if (!selectedDecorationIds.length) return;
      updateRole((current) => {
        moveSelectedToBoundaryInRole(current, selectedDecorationIds, boundary);
        return current;
      });
    },
    [selectedDecorationIds, updateRole]
  );

  // ============================================================
  // Merge
  // ============================================================
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
    [commitRole, insertDraftSettings, restoreSelection]
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
    [commitRole, insertDraftSettings, restoreSelection]
  );

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

  const updatePartById = useCallback(
    (tab: BodyPartTab, optionId: string) => {
      const option = optionById[optionId] ?? findOptionByCode(tab, optionId) ?? partOptions[tab][0];
      choosePart(tab, option);
    },
    [choosePart]
  );

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
    editValues: stableEditValues,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    clipboardCount: baseClipboard.length,
    stageScale,
    setStageScale,
    stageMinScale: EDITOR_STAGE_MIN_SCALE,
    stageMaxScale: EDITOR_STAGE_MAX_SCALE,
    canUndo: localPast.length > 0 || history.canUndo,
    canRedo: localFuture.length > 0 || history.canRedo,
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
