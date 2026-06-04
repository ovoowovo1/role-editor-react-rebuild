import { useCallback, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  beginTransientSession,
  commitTransientSession
} from '../lib/editor/editorRoleCommands';
import { cloneRole } from '../lib/editor/editorRoleUtils';
import { resolveLocalRedo, resolveLocalUndo } from '../lib/editor/editorHistoryCommands';
import {
  makeSnapshotEntry,
  pushLocalHistoryEntry,
  sameRole,
  type DecorationTransformTarget,
  type LocalHistoryEntry
} from '../lib/editor/editorTransformHistory';
import type { RoleDocument } from '../types/role';
import { usePendingTransformHistory } from './usePendingTransformHistory';

interface BaseHistoryApi {
  canUndo: boolean;
  canRedo: boolean;
  reset(next: RoleDocument, keepHistory?: boolean): void;
  undo(): void;
  redo(): void;
  beginTransient(): void;
  commitTransient(): void;
  cancelTransient(): void;
}

interface UseRoleEditorHistoryOptions {
  history: BaseHistoryApi;
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  stableSelectedIds: string[];
  selectedIdsRef: MutableRefObject<string[]>;
  setSelectedLayerIds: Dispatch<SetStateAction<string[]>>;
  transientBeforeRef: MutableRefObject<RoleDocument | null>;
  transientTransformBeforeRef: MutableRefObject<DecorationTransformTarget[] | null>;
  transientSelectionBeforeRef: MutableRefObject<string[]>;
  restoreSelection(ids: string[]): void;
}

export function useRoleEditorHistory({
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
}: UseRoleEditorHistoryOptions) {
  const [localPast, setLocalPast] = useState<LocalHistoryEntry[]>([]);
  const [localFuture, setLocalFuture] = useState<LocalHistoryEntry[]>([]);

  const recordLocalHistoryEntry = useCallback((entry: LocalHistoryEntry) => {
    setLocalPast((items) => pushLocalHistoryEntry(items, entry));
    setLocalFuture([]);
  }, []);

  const {
    withTransformHistory,
    queuePendingTransformHistory
  } = usePendingTransformHistory({
    role,
    roleRef,
    selectedIdsRef,
    recordLocalHistoryEntry,
    restoreSelection
  });

  const commitRole = useCallback(
    (nextRole: RoleDocument) => {
      if (sameRole(roleRef.current, nextRole)) return;
      recordLocalHistoryEntry(makeSnapshotEntry(roleRef.current));
      history.reset(nextRole);
    },
    [history, recordLocalHistoryEntry, roleRef]
  );

  const importRole = useCallback(
    (nextRole: RoleDocument) => {
      setLocalPast([]);
      setLocalFuture([]);
      setSelectedLayerIds([]);
      history.reset(nextRole);
    },
    [history, setSelectedLayerIds]
  );

  const withImmediateHistory = useCallback(
    (action: () => void, restoreIds = selectedIdsRef.current) => {
      recordLocalHistoryEntry(makeSnapshotEntry(cloneRole(roleRef.current)));
      action();
      restoreSelection(restoreIds);
    },
    [recordLocalHistoryEntry, restoreSelection, roleRef, selectedIdsRef]
  );

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
  }, [history, localFuture, localPast, restoreSelection, roleRef, selectedIdsRef, setSelectedLayerIds]);

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
  }, [history, localFuture, localPast, restoreSelection, roleRef, selectedIdsRef, setSelectedLayerIds]);

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
  }, [
    history,
    roleRef,
    selectedIdsRef,
    stableSelectedIds,
    transientBeforeRef,
    transientSelectionBeforeRef,
    transientTransformBeforeRef
  ]);

  const commitTransient = useCallback(() => {
    const before = transientBeforeRef.current;
    const transformBefore = transientTransformBeforeRef.current;
    const selectionBefore = transientSelectionBeforeRef.current;
    transientBeforeRef.current = null;
    transientTransformBeforeRef.current = null;
    transientSelectionBeforeRef.current = [];

    const session = commitTransientSession(before, transformBefore, selectionBefore, roleRef.current, selectedIdsRef.current);

    if (session.pendingTransform) {
      queuePendingTransformHistory(session.pendingTransform);
      return;
    }

    if (session.commitBaseTransient) history.commitTransient();
    if (session.snapshotEntry) {
      recordLocalHistoryEntry(session.snapshotEntry);
    }
    restoreSelection(session.restoreSelectionIds);
  }, [
    history,
    queuePendingTransformHistory,
    recordLocalHistoryEntry,
    restoreSelection,
    roleRef,
    selectedIdsRef,
    transientBeforeRef,
    transientSelectionBeforeRef,
    transientTransformBeforeRef
  ]);

  return {
    canUndo: localPast.length > 0 || history.canUndo,
    canRedo: localFuture.length > 0 || history.canRedo,
    commitRole,
    importRole,
    recordLocalHistoryEntry,
    withImmediateHistory,
    withTransformHistory,
    undo,
    redo,
    beginTransient,
    commitTransient
  };
}
