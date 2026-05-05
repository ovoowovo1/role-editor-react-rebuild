import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import { getHeadLayerIndex, layerIdsForRole } from '../lib/layerOrdering';
import { createId } from '../lib/math';
import { insertDecorations, settingsForScope } from '../lib/editorInsertSettings';
import { pushLocalFuture, pushLocalPast, sameRole } from '../lib/editorLocalHistory';
import { cloneRole } from '../lib/editorRoleUtils';
import { nextGroupId } from '../lib/headLayerMutations';
import { useRoleEditor as useHeadLayerEditor, type InsertDraftSettings } from './useRoleEditorWithHeadLayerDrag';
import type { DecorationGroup, DecorationLayer, PartOption, RoleDocument, TransformValues } from '../types/role';

export type { InsertDraftSettings };

function roundPosition(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundValue(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function transformValuesFromSingleDeco(deco: DecorationLayer): TransformValues {
  return {
    rotate: roundValue(deco.rotation, 3),
    scale: roundValue(Math.abs(deco.scaleX), 3),
    ratio: roundValue(Math.abs(deco.scaleY / (deco.scaleX || 1)), 3),
    posX: roundValue(deco.x, 2),
    posY: roundValue(deco.y, 2)
  };
}

function makeCenteredDecoration(option: PartOption): DecorationLayer {
  return {
    id: createId('deco'),
    code: option.code,
    assetId: option.id,
    name: option.label,
    x: 0,
    y: 0,
    scaleX: 0.5,
    scaleY: 0.5,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

function copyDecoration(item: DecorationLayer, patch: Partial<DecorationLayer> = {}): DecorationLayer {
  return {
    ...item,
    id: createId('deco'),
    ...patch
  };
}

function removeSelectedDecos(role: RoleDocument, selectedIds: string[]): RoleDocument | null {
  const selected = new Set(selectedIds.filter((id) => id !== HEAD_LAYER_ID));
  if (!selected.size) return null;

  const oldHeadIndex = getHeadLayerIndex(role);
  const deletedIndexes: number[] = [];
  const decorations = role.decorations.filter((deco, index) => {
    const remove = selected.has(deco.id);
    if (remove) deletedIndexes.push(index);
    return !remove;
  });
  if (decorations.length === role.decorations.length) return null;

  const removedAboveHead = deletedIndexes.filter((index) => index < oldHeadIndex).length;
  const validIds = new Set([...decorations.map((deco) => deco.id), HEAD_LAYER_ID]);
  const groups = (role.groups ?? [])
    .map((group) => ({
      ...group,
      itemIds: group.itemIds.filter((id) => validIds.has(id) && !selected.has(id))
    }))
    .filter((group) => group.itemIds.length >= 2);

  return {
    ...role,
    decorations,
    groups,
    headLayerIndex: Math.max(0, Math.min(decorations.length, oldHeadIndex - removedAboveHead)),
    updatedAt: new Date().toISOString()
  };
}

function validSelectionIds(role: RoleDocument, ids: string[]): string[] {
  const valid = new Set([...role.decorations.map((deco) => deco.id), HEAD_LAYER_ID]);
  return ids.filter((id, index) => valid.has(id) && ids.indexOf(id) === index);
}

function nextSelection(current: string[], id: string, additive: boolean): string[] {
  if (!additive) return [id];
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

export function useRoleEditor() {
  const editor = useHeadLayerEditor();
  const roleRef = useRef(editor.role);
  const selectedIdsRef = useRef(editor.selectedDecorationIds);
  const transientBeforeRef = useRef<RoleDocument | null>(null);
  const transientSelectionBeforeRef = useRef<string[]>([]);
  const [localPast, setLocalPast] = useState<RoleDocument[]>([]);
  const [localFuture, setLocalFuture] = useState<RoleDocument[]>([]);
  const [localClipboard, setLocalClipboard] = useState<DecorationLayer[]>([]);

  useEffect(() => {
    roleRef.current = editor.role;
  }, [editor.role]);

  useEffect(() => {
    if (editor.selectedDecorationIds.length) {
      selectedIdsRef.current = editor.selectedDecorationIds;
    } else if (!transientBeforeRef.current) {
      selectedIdsRef.current = [];
    }
  }, [editor.selectedDecorationIds]);

  const stableSelectedDecorationIds = useMemo(() => {
    const current = validSelectionIds(editor.role, editor.selectedDecorationIds);
    if (current.length) return current;
    if (transientBeforeRef.current) {
      const fallback = transientSelectionBeforeRef.current.length ? transientSelectionBeforeRef.current : selectedIdsRef.current;
      return validSelectionIds(editor.role, fallback);
    }
    return [];
  }, [editor.role, editor.selectedDecorationIds]);

  const stableSelectedDecorations = useMemo(
    () => editor.role.decorations.filter((deco) => stableSelectedDecorationIds.includes(deco.id)),
    [editor.role.decorations, stableSelectedDecorationIds]
  );

  const stableEditValues = useMemo<TransformValues>(() => {
    const decoIds = stableSelectedDecorationIds.filter((id) => id !== HEAD_LAYER_ID);
    if (decoIds.length === 1) {
      const deco = editor.role.decorations.find((item) => item.id === decoIds[0]);
      if (deco) return transformValuesFromSingleDeco(deco);
    }
    return editor.editValues;
  }, [editor.editValues, editor.role.decorations, stableSelectedDecorationIds]);

  const restoreSelection = useCallback(
    (ids: string[]) => {
      const nextIds = ids.filter((id, index) => Boolean(id) && ids.indexOf(id) === index);
      if (!nextIds.length) return;

      window.setTimeout(() => {
        const stillValid = validSelectionIds(roleRef.current, nextIds);
        if (!stillValid.length) return;
        selectedIdsRef.current = stillValid;
        editor.clearSelection();
        stillValid.forEach((id, index) => editor.selectDecoration(id, index > 0));
      }, 0);
    },
    [editor]
  );

  const pushHistorySnapshot = useCallback((snapshot: RoleDocument) => {
    setLocalPast((items) => pushLocalPast(items, snapshot));
    setLocalFuture([]);
  }, []);

  const commitRole = useCallback(
    (nextRole: RoleDocument) => {
      if (sameRole(roleRef.current, nextRole)) return;
      pushHistorySnapshot(roleRef.current);
      editor.importRole(nextRole);
    },
    [editor, pushHistorySnapshot]
  );

  const withImmediateHistory = useCallback(
    (action: () => void, restoreIds = selectedIdsRef.current) => {
      const before = cloneRole(roleRef.current);
      pushHistorySnapshot(before);
      action();
      restoreSelection(restoreIds);
    },
    [pushHistorySnapshot, restoreSelection]
  );

  const undo = useCallback(() => {
    if (localPast.length) {
      const previous = localPast[localPast.length - 1];
      setLocalPast((items) => items.slice(0, -1));
      setLocalFuture((items) => pushLocalFuture(items, roleRef.current));
      selectedIdsRef.current = [];
      editor.importRole(previous);
      editor.clearSelection();
      return;
    }
    editor.undo();
  }, [editor, localPast]);

  const redo = useCallback(() => {
    if (localFuture.length) {
      const next = localFuture[0];
      setLocalFuture((items) => items.slice(1));
      setLocalPast((items) => pushLocalPast(items, roleRef.current));
      selectedIdsRef.current = [];
      editor.importRole(next);
      editor.clearSelection();
      return;
    }
    editor.redo();
  }, [editor, localFuture]);

  const selectDecoration = useCallback(
    (id: string, additive = false) => {
      const isAlreadyInMultiSelection = !additive && stableSelectedDecorationIds.length > 1 && stableSelectedDecorationIds.includes(id);
      if (isAlreadyInMultiSelection) return;
      selectedIdsRef.current = nextSelection(stableSelectedDecorationIds, id, additive);
      editor.selectDecoration(id, additive);
    },
    [editor, stableSelectedDecorationIds]
  );

  const selectAllDecorations = useCallback(() => {
    const ids = layerIdsForRole(editor.role);
    selectedIdsRef.current = ids;
    editor.clearSelection();
    ids.forEach((id, index) => editor.selectDecoration(id, index > 0));
  }, [editor]);

  const beginTransient = useCallback(() => {
    transientBeforeRef.current = cloneRole(roleRef.current);
    transientSelectionBeforeRef.current = stableSelectedDecorationIds.length ? [...stableSelectedDecorationIds] : [...selectedIdsRef.current];
    editor.beginTransient();
  }, [editor, stableSelectedDecorationIds]);

  const commitTransient = useCallback(() => {
    const before = transientBeforeRef.current;
    const selectionBefore = transientSelectionBeforeRef.current;
    transientBeforeRef.current = null;
    transientSelectionBeforeRef.current = [];
    editor.commitTransient();
    if (before && !sameRole(before, roleRef.current)) {
      pushHistorySnapshot(before);
    }
    restoreSelection(selectionBefore.length ? selectionBefore : selectedIdsRef.current);
  }, [editor, pushHistorySnapshot, restoreSelection]);

  const updateDecoration = useCallback(
    (id: string, patch: Partial<DecorationLayer>, commit?: boolean) => {
      const selectionBefore = stableSelectedDecorationIds.length ? [...stableSelectedDecorationIds] : [...selectedIdsRef.current];
      const runUpdate = () => {
        const selectedDecoIds = (selectionBefore.length ? selectionBefore : selectedIdsRef.current).filter((itemId) => itemId !== HEAD_LAYER_ID);
        const shouldMoveSelection =
          selectedDecoIds.length > 1 &&
          selectedDecoIds.includes(id) &&
          (typeof patch.x === 'number' || typeof patch.y === 'number');

        if (!shouldMoveSelection) {
          editor.updateDecoration(id, patch, commit);
          return;
        }

        const dragged = roleRef.current.decorations.find((deco) => deco.id === id);
        if (!dragged) {
          editor.updateDecoration(id, patch, commit);
          return;
        }

        const dx = typeof patch.x === 'number' ? patch.x - dragged.x : 0;
        const dy = typeof patch.y === 'number' ? patch.y - dragged.y : 0;
        const hasDx = Math.abs(dx) > Number.EPSILON;
        const hasDy = Math.abs(dy) > Number.EPSILON;

        for (const selectedId of selectedDecoIds) {
          const deco = roleRef.current.decorations.find((item) => item.id === selectedId);
          if (!deco) continue;
          if (selectedId === id) {
            editor.updateDecoration(selectedId, patch, commit);
            continue;
          }

          const nextPatch: Partial<DecorationLayer> = { ...patch };
          if (hasDx) nextPatch.x = roundPosition(deco.x + dx);
          else delete nextPatch.x;
          if (hasDy) nextPatch.y = roundPosition(deco.y + dy);
          else delete nextPatch.y;
          editor.updateDecoration(selectedId, nextPatch, commit);
        }
      };

      if (commit) withImmediateHistory(runUpdate, selectionBefore);
      else runUpdate();
    },
    [editor, stableSelectedDecorationIds, withImmediateHistory]
  );

  const updateSelectedTransform = useCallback(
    (patch: Parameters<typeof editor.updateSelectedTransform>[0], commit?: boolean) => {
      const selectionBefore = stableSelectedDecorationIds.length ? [...stableSelectedDecorationIds] : [...selectedIdsRef.current];
      if (commit) withImmediateHistory(() => editor.updateSelectedTransform(patch, commit), selectionBefore);
      else editor.updateSelectedTransform(patch, commit);
    },
    [editor, stableSelectedDecorationIds, withImmediateHistory]
  );

  const choosePart = useCallback(
    (tab: Parameters<typeof editor.choosePart>[0], option: PartOption) => {
      if (tab !== 'deco') {
        editor.choosePart(tab, option);
        return;
      }

      const deco = makeCenteredDecoration(option);
      const settings = settingsForScope(editor.insertDraftSettings, editor.insertDraftSettings.scopes.palette);
      const nextRole = insertDecorations(roleRef.current, [deco], settings);
      commitRole(nextRole);
      restoreSelection([deco.id]);
    },
    [commitRole, editor, restoreSelection]
  );

  const copySelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    setLocalClipboard(stableSelectedDecorations.map((item) => cloneRole({ ...roleRef.current, decorations: [item] }).decorations[0]));
  }, [stableSelectedDecorations]);

  const pasteClipboard = useCallback(() => {
    if (!localClipboard.length) return;
    const settings = settingsForScope(editor.insertDraftSettings, editor.insertDraftSettings.scopes.copy);
    const copied = localClipboard.map((item) => copyDecoration(item));
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [commitRole, editor.insertDraftSettings, localClipboard, restoreSelection]);

  const mirrorCopyHorizontalSelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    const settings = settingsForScope(editor.insertDraftSettings, editor.insertDraftSettings.scopes.copy);
    const copied = stableSelectedDecorations.map((item) =>
      copyDecoration(item, {
        x: roundPosition(-item.x),
        scaleX: -item.scaleX
      })
    );
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [commitRole, editor.insertDraftSettings, restoreSelection, stableSelectedDecorations]);

  const mirrorCopyVerticalSelected = useCallback(() => {
    if (!stableSelectedDecorations.length) return;
    const settings = settingsForScope(editor.insertDraftSettings, editor.insertDraftSettings.scopes.copy);
    const copied = stableSelectedDecorations.map((item) =>
      copyDecoration(item, {
        y: roundPosition(-item.y),
        scaleY: -item.scaleY
      })
    );
    const nextRole = insertDecorations(roleRef.current, copied, settings);
    commitRole(nextRole);
    restoreSelection(copied.map((item) => item.id));
  }, [commitRole, editor.insertDraftSettings, restoreSelection, stableSelectedDecorations]);

  const mergeImportedRole = useCallback(
    (incoming: RoleDocument) => {
      const idMap = new Map<string, string>();
      const copied = incoming.decorations.map((item) => {
        const next = copyDecoration(item);
        idMap.set(item.id, next.id);
        return next;
      });
      if (!copied.length) return;

      const settings = settingsForScope(editor.insertDraftSettings, editor.insertDraftSettings.scopes.mergeBatch);
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
    [commitRole, editor.insertDraftSettings, restoreSelection]
  );

  const clearSelection = useCallback(() => {
    selectedIdsRef.current = [];
    transientSelectionBeforeRef.current = [];
    editor.clearSelection();
  }, [editor]);

  const deleteSelected = useCallback(() => {
    const nextRole = removeSelectedDecos(roleRef.current, stableSelectedDecorationIds.length ? stableSelectedDecorationIds : selectedIdsRef.current);
    if (!nextRole) return;
    commitRole(nextRole);
    clearSelection();
  }, [clearSelection, commitRole, stableSelectedDecorationIds]);

  return {
    ...editor,
    selectedDecorationIds: stableSelectedDecorationIds,
    selectedDecorations: stableSelectedDecorations,
    editValues: stableEditValues,
    canUndo: localPast.length > 0 || editor.canUndo,
    canRedo: localFuture.length > 0 || editor.canRedo,
    undo,
    redo,
    selectDecoration,
    selectAllDecorations,
    clearSelection,
    beginTransient,
    commitTransient,
    updateDecoration,
    updateSelectedTransform,
    choosePart,
    copySelected,
    pasteClipboard,
    mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected,
    mergeImportedRole,
    rotateSelectedBy: (degrees: number) => withImmediateHistory(() => editor.rotateSelectedBy(degrees)),
    scaleSelectedBy: (amount: number) => withImmediateHistory(() => editor.scaleSelectedBy(amount)),
    ratioSelectedBy: (amount: number) => withImmediateHistory(() => editor.ratioSelectedBy(amount)),
    nudgeSelected: (dx: number, dy: number) => withImmediateHistory(() => editor.nudgeSelected(dx, dy)),
    flipSelected: () => withImmediateHistory(() => editor.flipSelected()),
    deleteSelected
  };
}
