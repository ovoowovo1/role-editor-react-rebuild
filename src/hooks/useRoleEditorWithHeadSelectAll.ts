import { useCallback, useEffect, useRef, useState } from 'react';
import { HEAD_LAYER_ID } from '../components/LayerList';
import { useRoleEditor as useHeadLayerEditor, type InsertDraftSettings } from './useRoleEditorWithHeadLayerDrag';
import type { DecorationLayer, RoleDocument } from '../types/role';

export type { InsertDraftSettings };

const HISTORY_LIMIT = 200;

function cloneRole(role: RoleDocument): RoleDocument {
  return JSON.parse(JSON.stringify(role)) as RoleDocument;
}

function sameRole(a: RoleDocument, b: RoleDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getHeadLayerIndex(role: RoleDocument): number {
  const raw = Number(role.headLayerIndex);
  const count = role.decorations.length;
  return Math.max(0, Math.min(count, Number.isFinite(raw) ? Math.round(raw) : count));
}

function getAllLayerIdsIncludingHead(role: RoleDocument): string[] {
  const ids = role.decorations.map((item) => item.id);
  ids.splice(getHeadLayerIndex(role), 0, HEAD_LAYER_ID);
  return ids;
}

function roundPosition(value: number): number {
  return Math.round(value * 100) / 100;
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

export function useRoleEditor() {
  const editor = useHeadLayerEditor();
  const roleRef = useRef(editor.role);
  const selectedIdsRef = useRef(editor.selectedDecorationIds);
  const transientBeforeRef = useRef<RoleDocument | null>(null);
  const transientSelectionBeforeRef = useRef<string[]>([]);
  const [localPast, setLocalPast] = useState<RoleDocument[]>([]);
  const [localFuture, setLocalFuture] = useState<RoleDocument[]>([]);

  useEffect(() => {
    roleRef.current = editor.role;
  }, [editor.role]);

  useEffect(() => {
    selectedIdsRef.current = editor.selectedDecorationIds;
  }, [editor.selectedDecorationIds]);

  const restoreSelection = useCallback(
    (ids: string[]) => {
      const nextIds = validSelectionIds(roleRef.current, ids);
      if (!nextIds.length) return;

      window.setTimeout(() => {
        const stillValid = validSelectionIds(roleRef.current, nextIds);
        if (!stillValid.length) return;
        editor.clearSelection();
        stillValid.forEach((id, index) => editor.selectDecoration(id, index > 0));
      }, 0);
    },
    [editor]
  );

  const pushHistorySnapshot = useCallback((snapshot: RoleDocument) => {
    setLocalPast((items) => [...items, cloneRole(snapshot)].slice(-HISTORY_LIMIT));
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
      setLocalFuture((items) => [cloneRole(roleRef.current), ...items].slice(0, HISTORY_LIMIT));
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
      setLocalPast((items) => [...items, cloneRole(roleRef.current)].slice(-HISTORY_LIMIT));
      editor.importRole(next);
      editor.clearSelection();
      return;
    }
    editor.redo();
  }, [editor, localFuture]);

  const selectDecoration = useCallback(
    (id: string, additive = false) => {
      const isAlreadyInMultiSelection = !additive && editor.selectedDecorationIds.length > 1 && editor.selectedDecorationIds.includes(id);
      if (isAlreadyInMultiSelection) return;
      editor.selectDecoration(id, additive);
    },
    [editor]
  );

  const selectAllDecorations = useCallback(() => {
    const ids = getAllLayerIdsIncludingHead(editor.role);
    editor.clearSelection();
    ids.forEach((id, index) => editor.selectDecoration(id, index > 0));
  }, [editor]);

  const beginTransient = useCallback(() => {
    transientBeforeRef.current = cloneRole(roleRef.current);
    transientSelectionBeforeRef.current = [...selectedIdsRef.current];
    editor.beginTransient();
  }, [editor]);

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
      const selectionBefore = [...selectedIdsRef.current];
      const runUpdate = () => {
        const selectedDecoIds = selectedIdsRef.current.filter((itemId) => itemId !== HEAD_LAYER_ID);
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
    [editor, withImmediateHistory]
  );

  const updateSelectedTransform = useCallback(
    (patch: Parameters<typeof editor.updateSelectedTransform>[0], commit?: boolean) => {
      const selectionBefore = [...selectedIdsRef.current];
      if (commit) withImmediateHistory(() => editor.updateSelectedTransform(patch, commit), selectionBefore);
      else editor.updateSelectedTransform(patch, commit);
    },
    [editor, withImmediateHistory]
  );

  const deleteSelected = useCallback(() => {
    const nextRole = removeSelectedDecos(roleRef.current, selectedIdsRef.current);
    if (!nextRole) return;
    commitRole(nextRole);
    editor.clearSelection();
  }, [commitRole, editor]);

  return {
    ...editor,
    canUndo: localPast.length > 0 || editor.canUndo,
    canRedo: localFuture.length > 0 || editor.canRedo,
    undo,
    redo,
    selectDecoration,
    selectAllDecorations,
    beginTransient,
    commitTransient,
    updateDecoration,
    updateSelectedTransform,
    rotateSelectedBy: (degrees: number) => withImmediateHistory(() => editor.rotateSelectedBy(degrees)),
    scaleSelectedBy: (amount: number) => withImmediateHistory(() => editor.scaleSelectedBy(amount)),
    ratioSelectedBy: (amount: number) => withImmediateHistory(() => editor.ratioSelectedBy(amount)),
    nudgeSelected: (dx: number, dy: number) => withImmediateHistory(() => editor.nudgeSelected(dx, dy)),
    flipSelected: () => withImmediateHistory(() => editor.flipSelected()),
    deleteSelected
  };
}
