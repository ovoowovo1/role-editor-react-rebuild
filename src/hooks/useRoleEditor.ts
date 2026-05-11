import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import { camps, createDefaultRole, filterPartOptionsByCamp, findOptionByCode, optionById, partOptions } from '../mock/options';
import type { BodyPartTab, DecorationGroup, DecorationLayer, EditorClipboardItem, GenderCode, PartOption, PartTab, RoleDocument, TransformValues } from '../types/role';
import { clamp, createId, normalizeDegrees, round } from '../lib/math';
import { getPartFrame } from '../lib/twlibPartRuntime';
import {
  cloneRole,
  orderedSelectedDecorations,
  syncGroups,
  touch,
  shiftHeadLayerForInsert
} from '../lib/editorRoleUtils';
import {
  copiedClipboardItems,
  deleteDecorationFromRole,
  deleteSelectedFromRole,
  makeDecoration,
  mirrorCopySelectedInRole,
  moveSelectedToBoundaryInRole,
  pasteClipboardIntoRole,
  setSelectedVisibleInRole,
  toggleDecorationVisibilityInRole
} from '../lib/editorDecorationMutations';
import {
  createGroupFromSelection,
  hasUngroupedSelected,
  makeGroupMap,
  renameGroupInRole,
  setGroupVisibleInRole,
  toggleGroupCollapsedInRole,
  ungroupedSelectedIds,
  ungroupInRole
} from '../lib/editorGroupMutations';
import { reorderBaseEditorLayersImmutable } from '../lib/editorLayerDrag';
import {
  DEFAULT_INSERT_SETTINGS,
  insertDecorations,
  sanitizeInsertDraftSettings,
  settingsForScope,
  type InsertDraftPlacement,
  type InsertDraftScopes,
  type InsertDraftSettings
} from '../lib/editorInsertSettings';
import {
  createGroupFromLayerSelection,
  decorationIdsFromLayerIds,
  nextGroupId,
  reorderIncludingHead,
  setGroupVisibilityIncludingHead,
  toggleHeadVisibility,
  toggleLayerSelection,
  ungroupIncludingHead,
  ungroupedSelectedLayerIds,
  hasUngroupedSelectedLayerIds
} from '../lib/headLayerMutations';
import { sameRole } from '../lib/editorLocalHistory';
import {
  applyDecorationTransformTarget,
  applyTranslateDelta,
  captureDecorationTransforms,
  makeSnapshotEntry,
  pushLocalFutureEntry,
  pushLocalHistoryEntry,
  removeSelectedDecos,
  roundPosition,
  sameTransformTarget,
  transformValuesFromSingleDeco,
  validSelectionIds,
  type DecorationTransformTarget,
  type LocalHistoryEntry
} from '../lib/editorTransformHistory';
import { useEditorGroupTransform } from './useEditorGroupTransform';
import { useHistory } from './useHistory';
import { GROUP_ROW_PREFIX } from '../constants/layers';
import { atomsForRole, deriveRoleFromAtoms, layerIdsForRole, rowIdToAtoms } from '../lib/layerOrdering';

export type { InsertDraftPlacement, InsertDraftScopes, InsertDraftSettings };

const STAGE_MIN_SCALE = 1;
const STAGE_MAX_SCALE = 30;

function nextGroupName(role: RoleDocument): string {
  return `Group ${(role.groups ?? []).length + 1}`;
}

function makeCenteredDecoration(option: PartOption): DecorationLayer {
  return {
    id: createId('deco'),
    code: option.code,
    assetId: option.id,
    name: option.label,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

function copyDecoration(item: DecorationLayer, patch: Partial<DecorationLayer> = {}): DecorationLayer {
  return { ...item, id: createId('deco'), ...patch };
}

function copyDecorationForInsert(item: DecorationLayer | EditorClipboardItem, offset = 0): DecorationLayer {
  return {
    id: createId('deco'),
    code: item.code,
    assetId: item.assetId,
    name: item.name,
    x: (item.x ?? 0) + offset,
    y: (item.y ?? 0) + offset,
    scaleX: item.scaleX ?? 1,
    scaleY: item.scaleY ?? 1,
    rotation: item.rotation ?? 0,
    visible: (item as DecorationLayer).visible ?? true,
    opacity: (item as DecorationLayer).opacity ?? 1
  };
}

function reorderGroupWithoutUngrouping(role: RoleDocument, activeRowId: string, overRowId: string): RoleDocument | null {
  if (!activeRowId.startsWith(GROUP_ROW_PREFIX)) return null;
  const movingAtoms = rowIdToAtoms(role, activeRowId);
  const overAtoms = rowIdToAtoms(role, overRowId);
  if (!movingAtoms.length || !overAtoms.length) return role;
  if (movingAtoms.some((atom) => overAtoms.includes(atom))) return role;

  const originalAtoms = atomsForRole(role);
  const movingSet = new Set(movingAtoms);
  const overSet = new Set(overAtoms);
  const sourceIndexes = originalAtoms.map((atom, index) => (movingSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  const overIndexes = originalAtoms.map((atom, index) => (overSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  if (!sourceIndexes.length || !overIndexes.length) return role;

  const sourceStart = Math.min(...sourceIndexes);
  const overStart = Math.min(...overIndexes);
  const remainingAtoms = originalAtoms.filter((atom) => !movingSet.has(atom));
  const remainingOverIndexes = remainingAtoms.map((atom, index) => (overSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  if (!remainingOverIndexes.length) return role;

  const targetIndex = sourceStart < overStart ? Math.max(...remainingOverIndexes) + 1 : Math.min(...remainingOverIndexes);
  const nextAtoms = [...remainingAtoms.slice(0, targetIndex), ...movingAtoms, ...remainingAtoms.slice(targetIndex)];
  return deriveRoleFromAtoms(role, nextAtoms);
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
  // ============================================================
  // Base history (fallback for coarse-grained undo/redo)
  // ============================================================
  const history = useHistory<RoleDocument>(createDefaultRole(), { limit: 50 });
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
  const [stageScale, setStageScaleState] = useState(STAGE_MIN_SCALE);
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
    const current = validSelectionIds(role, selectedLayerIds);
    if (current.length) return current;
    if (transientBeforeRef.current || transientTransformBeforeRef.current) {
      const fallback = transientSelectionBeforeRef.current.length ? transientSelectionBeforeRef.current : selectedIdsRef.current;
      return validSelectionIds(role, fallback);
    }
    return [];
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
    () => hasUngroupedSelectedLayerIds(role, selectedLayerIds),
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
        const stillValid = validSelectionIds(roleRef.current, nextIds);
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
      const selectionIds = validSelectionIds(roleRef.current, restoreIds.length ? restoreIds : selectedIdsRef.current);
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
    if (localPast.length) {
      const previous = localPast[localPast.length - 1];
      setLocalPast((items) => items.slice(0, -1));

      if (previous.kind === 'translate') {
        setLocalFuture((items) => pushLocalFutureEntry(items, previous));
        const nextRole = applyTranslateDelta(roleRef.current, previous.ids, -previous.dx, -previous.dy);
        history.reset(nextRole);
        restoreSelection(previous.selectionIds);
        return;
      }

      if (previous.kind === 'transform') {
        const currentTarget = captureDecorationTransforms(roleRef.current, previous.selectionIds);
        if (currentTarget.length) {
          setLocalFuture((items) => pushLocalFutureEntry(items, { kind: 'transform', target: currentTarget, selectionIds: previous.selectionIds }));
        }
        const nextRole = applyDecorationTransformTarget(roleRef.current, previous.target);
        history.reset(nextRole);
        restoreSelection(previous.selectionIds);
        return;
      }

      // snapshot
      setLocalFuture((items) => pushLocalFutureEntry(items, makeSnapshotEntry(roleRef.current)));
      selectedIdsRef.current = [];
      history.reset(previous.role);
      setSelectedLayerIds([]);
      return;
    }
    history.undo();
  }, [history, localPast, restoreSelection]);

  const redo = useCallback(() => {
    if (localFuture.length) {
      const next = localFuture[0];
      setLocalFuture((items) => items.slice(1));

      if (next.kind === 'translate') {
        setLocalPast((items) => pushLocalHistoryEntry(items, next));
        const nextRole = applyTranslateDelta(roleRef.current, next.ids, next.dx, next.dy);
        history.reset(nextRole);
        restoreSelection(next.selectionIds);
        return;
      }

      if (next.kind === 'transform') {
        const currentTarget = captureDecorationTransforms(roleRef.current, next.selectionIds);
        if (currentTarget.length) {
          setLocalPast((items) => pushLocalHistoryEntry(items, { kind: 'transform', target: currentTarget, selectionIds: next.selectionIds }));
        }
        const nextRole = applyDecorationTransformTarget(roleRef.current, next.target);
        history.reset(nextRole);
        restoreSelection(next.selectionIds);
        return;
      }

      // snapshot
      setLocalPast((items) => pushLocalHistoryEntry(items, makeSnapshotEntry(roleRef.current)));
      selectedIdsRef.current = [];
      history.reset(next.role);
      setSelectedLayerIds([]);
      return;
    }
    history.redo();
  }, [history, localFuture, restoreSelection]);

  // ============================================================
  // Transient
  // ============================================================
  const beginTransient = useCallback(() => {
    const selectionBefore = stableSelectedIds.length ? [...stableSelectedIds] : [...selectedIdsRef.current];
    const transformBefore = captureDecorationTransforms(roleRef.current, selectionBefore);
    transientSelectionBeforeRef.current = selectionBefore;

    if (transformBefore.length) {
      transientBeforeRef.current = null;
      transientTransformBeforeRef.current = transformBefore;
      history.cancelTransient();
      return;
    }

    transientTransformBeforeRef.current = null;
    transientBeforeRef.current = cloneRole(roleRef.current);
    history.beginTransient();
  }, [history, stableSelectedIds]);

  const commitTransient = useCallback(() => {
    const before = transientBeforeRef.current;
    const transformBefore = transientTransformBeforeRef.current;
    const selectionBefore = transientSelectionBeforeRef.current;
    transientBeforeRef.current = null;
    transientTransformBeforeRef.current = null;
    transientSelectionBeforeRef.current = [];

    if (transformBefore) {
      pendingTransformHistoryRef.current ??= { target: transformBefore, selectionIds: selectionBefore };
      schedulePendingTransformFinalize();
      return;
    }

    history.commitTransient();
    if (before && !sameRole(before, roleRef.current)) {
      setLocalPast((items) => pushLocalHistoryEntry(items, makeSnapshotEntry(before)));
    }
    restoreSelection(selectionBefore.length ? selectionBefore : selectedIdsRef.current);
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
      const group = role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      const ids = layerIdsForRole({ ...role, decorations: role.decorations.filter((d) => group.itemIds.includes(d.id)) });
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
      updateRole((current) => {
        const bodyTab = tab as BodyPartTab;
        current.parts[bodyTab] = option.id;
        current.partFrames = { ...current.partFrames, [bodyTab]: getPartFrame(option) ?? current.partFrames?.[bodyTab] ?? 1 };
        current.partScales = { ...current.partScales, [bodyTab]: current.partScales?.[bodyTab] ?? 1 };
        return current;
      });
    },
    [commitRole, insertDraftSettings, restoreSelection, updateRole]
  );

  const updateDecoration = useCallback(
    (id: string, patch: Partial<DecorationLayer>, commit?: boolean) => {
      const selectionBefore = stableSelectedIds.length ? [...stableSelectedIds] : [...selectedIdsRef.current];

      const runUpdate = () => {
        const selectedDecoIds = (selectionBefore.length ? selectionBefore : selectedIdsRef.current).filter((itemId) => itemId !== HEAD_LAYER_ID);
        const shouldMoveSelection =
          selectedDecoIds.length > 1 &&
          selectedDecoIds.includes(id) &&
          (typeof patch.x === 'number' || typeof patch.y === 'number');

        if (!shouldMoveSelection) {
          updateRole((current) => {
            current.decorations = current.decorations.map((item) => (item.id === id ? { ...item, ...patch } : item));
            return current;
          }, commit);
          return;
        }

        const dragged = roleRef.current.decorations.find((deco) => deco.id === id);
        if (!dragged) {
          updateRole((current) => {
            current.decorations = current.decorations.map((item) => (item.id === id ? { ...item, ...patch } : item));
            return current;
          }, commit);
          return;
        }

        const dx = typeof patch.x === 'number' ? patch.x - dragged.x : 0;
        const dy = typeof patch.y === 'number' ? patch.y - dragged.y : 0;
        const hasDx = Math.abs(dx) > Number.EPSILON;
        const hasDy = Math.abs(dy) > Number.EPSILON;

        updateRole((current) => {
          current.decorations = current.decorations.map((item) => {
            if (!selectedDecoIds.includes(item.id)) return item;
            if (item.id === id) return { ...item, ...patch };
            const nextPatch: Partial<DecorationLayer> = {};
            if (hasDx) nextPatch.x = roundPosition(item.x + dx);
            if (hasDy) nextPatch.y = roundPosition(item.y + dy);
            return { ...item, ...nextPatch };
          });
          return current;
        }, commit);
      };

      if (commit) withImmediateHistory(runUpdate, selectionBefore);
      else runUpdate();
    },
    [stableSelectedIds, updateRole, withImmediateHistory]
  );

  const updateSelectedTransform = useCallback(
    (patch: Partial<TransformValues>, commit?: boolean) => {
      const selectionBefore = stableSelectedIds.length ? [...stableSelectedIds] : [...selectedIdsRef.current];
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
      const selectionIds = [...(stableSelectedIds.length ? stableSelectedIds : selectedIdsRef.current)];
      const ids = validSelectionIds(roleRef.current, selectionIds).filter((id) => id !== HEAD_LAYER_ID);
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
      const selectedSet = new Set(selectedDecorationIds);
      setRole((current) => ({
        ...current,
        decorations: current.decorations.map((item) => {
          if (!selectedSet.has(item.id)) return item;
          return { ...item, x: item.x + dx, y: item.y + dy };
        }),
        updatedAt: new Date().toISOString()
      }), 'silent');
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
    const nextRole = removeSelectedDecos(roleRef.current, stableSelectedIds.length ? stableSelectedIds : selectedIdsRef.current);
    if (!nextRole) return;
    commitRole(nextRole);
    clearSelection();
  }, [clearSelection, commitRole, stableSelectedIds]);

  // ============================================================
  // Clipboard
  // ============================================================
  const copySelected = useCallback(() => {
    if (stableSelectedDecorations.length) {
      setLocalClipboard(stableSelectedDecorations.map((item) => cloneRole({ ...roleRef.current, decorations: [item] }).decorations[0]));
    }
    setBaseClipboard(copiedClipboardItems(baseSelectedDecorations));
    pasteCountRef.current = 0;
  }, [baseSelectedDecorations, stableSelectedDecorations]);

  const pasteClipboard = useCallback(() => {
    if (!localClipboard.length) {
      // Fallback to base clipboard
      if (!baseClipboard.length) return;
      pasteCountRef.current += 1;
      const offset = pasteCountRef.current * 8;
      updateRole((current) => {
        const pastedIds = pasteClipboardIntoRole(current, baseClipboard, selectedDecorationIds, offset);
        window.setTimeout(() => setSelectedLayerIds(pastedIds), 0);
        return current;
      });
      return;
    }
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.copy);
    const copied = localClipboard.map((item) => copyDecoration(item));
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [baseClipboard, commitRole, insertDraftSettings, localClipboard, restoreSelection, selectedDecorationIds, updateRole]);

  const mirrorCopyHorizontalSelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.copy);
    const copied = stableSelectedDecorations.map((item) =>
      copyDecoration(item, { x: roundPosition(-item.x), scaleX: -item.scaleX, rotation: normalizeDegrees(-item.rotation) })
    );
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [commitRole, insertDraftSettings, restoreSelection, stableSelectedDecorations]);

  const mirrorCopyVerticalSelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.copy);
    const copied = stableSelectedDecorations.map((item) =>
      copyDecoration(item, { y: roundPosition(-item.y), scaleY: -item.scaleY, rotation: normalizeDegrees(-item.rotation) })
    );
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
      if (group.itemIds.includes(HEAD_LAYER_ID)) {
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
      if (group?.itemIds.includes(HEAD_LAYER_ID)) {
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
    (activeRowId: string, overRowId: string) => {
      if (activeRowId === overRowId) return;
      // Try stable group reorder first
      const nextRole = reorderGroupWithoutUngrouping(roleRef.current, activeRowId, overRowId);
      if (nextRole) {
        history.reset(nextRole);
        return;
      }
      // Try head-including reorder
      const headNextRole = reorderIncludingHead(roleRef.current, activeRowId, overRowId, selectedLayerIds);
      if (headNextRole) {
        commitRole(headNextRole);
        return;
      }
      // Fallback to base reorder
      setRole(
        (current) => reorderBaseEditorLayersImmutable(current, activeRowId, overRowId, selectedDecorationIds) ?? current,
        'history'
      );
    },
    [commitRole, history, selectedDecorationIds, selectedLayerIds, setRole]
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

      // Merge using insert settings
      const idMap = new Map<string, string>();
      const copied = incoming.decorations.map((item) => {
        const next = copyDecoration(item);
        idMap.set(item.id, next.id);
        return next;
      });
      if (!copied.length) return;

      const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
      const baseRole = insertDecorations(roleRef.current, copied, settings);
      const importedGroups = (incoming.groups ?? [])
        .map((group): DecorationGroup | null => {
          const itemIds = group.itemIds
            .map((id) => idMap.get(id))
            .filter((id): id is string => Boolean(id));
          if (itemIds.length < 2) return null;
          return {
            id: nextGroupId(),
            name: group.name,
            visible: group.visible !== false,
            collapsed: group.collapsed === true,
            itemIds
          };
        })
        .filter((group): group is DecorationGroup => group !== null);

      const nextRole: RoleDocument = {
        ...baseRole,
        groups: [...(baseRole.groups ?? []), ...importedGroups],
        updatedAt: new Date().toISOString()
      };
      commitRole(nextRole);
      restoreSelection(copied.map((item) => item.id));
    },
    [commitRole, insertDraftSettings, restoreSelection]
  );

  // ============================================================
  // Camp / Gender / Misc
  // ============================================================
  const setStageScale = useCallback((value: number) => {
    setStageScaleState(clamp(Math.round(value), STAGE_MIN_SCALE, STAGE_MAX_SCALE));
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
    stageMinScale: STAGE_MIN_SCALE,
    stageMaxScale: STAGE_MAX_SCALE,
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
    mergeImportedRole
  };
}
