import { useCallback, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  beginTransientSession,
  commitTransientSession
} from '../lib/editor/editorRoleCommands';
import { cloneRole, syncGroups, touch } from '../lib/editor/editorRoleUtils';
import { resolveLocalRedo, resolveLocalUndo } from '../lib/editor/editorHistoryCommands';
import {
  createHistoryIdPool,
  makeRoleHistoryEntry,
  pushLocalHistoryEntry,
  type DecorationTransformTarget,
  type HistoryIdPool,
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

type RoleUpdater = (current: RoleDocument) => RoleDocument;

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
  const localHistoryIdPoolRef = useRef<HistoryIdPool>(createHistoryIdPool());

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

  const restoreHistorySelection = useCallback(
    (ids: string[]) => {
      selectedIdsRef.current = [];
      setSelectedLayerIds([]);
      restoreSelection(ids);
    },
    [restoreSelection, selectedIdsRef, setSelectedLayerIds]
  );

  const commitRole = useCallback(
    (nextRole: RoleDocument, afterSelectionIds = selectedIdsRef.current) => {
      const entry = makeRoleHistoryEntry(
        roleRef.current,
        nextRole,
        selectedIdsRef.current,
        afterSelectionIds,
        localHistoryIdPoolRef.current
      );
      if (!entry) return;
      recordLocalHistoryEntry(entry);
      history.reset(nextRole);
      restoreHistorySelection(afterSelectionIds);
    },
    [history, recordLocalHistoryEntry, restoreHistorySelection, roleRef, selectedIdsRef]
  );

  const commitRoleUpdate = useCallback(
    (updater: RoleUpdater, afterSelectionIds = selectedIdsRef.current) => {
      const current = roleRef.current;
      const nextRole = syncGroups(touch(updater(cloneRole(current))));
      commitRole(nextRole, afterSelectionIds);
    },
    [commitRole, roleRef, selectedIdsRef]
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

  const undo = useCallback(() => {
    const result = resolveLocalUndo(roleRef.current, localPast, localFuture);
      if (result) {
        setLocalPast(result.localPast);
        setLocalFuture(result.localFuture);
        history.reset(result.nextRole);
        restoreHistorySelection(result.restoreSelectionIds);
        return;
      }
    history.undo();
  }, [history, localFuture, localPast, restoreHistorySelection, roleRef]);

  const redo = useCallback(() => {
    const result = resolveLocalRedo(roleRef.current, localPast, localFuture);
      if (result) {
        setLocalPast(result.localPast);
        setLocalFuture(result.localFuture);
        history.reset(result.nextRole);
        restoreHistorySelection(result.restoreSelectionIds);
        return;
      }
    history.redo();
  }, [history, localFuture, localPast, restoreHistorySelection, roleRef]);

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

    const session = commitTransientSession(
      before,
      transformBefore,
      selectionBefore,
      roleRef.current,
      selectedIdsRef.current,
      localHistoryIdPoolRef.current
    );

    if (session.pendingTransform) {
      queuePendingTransformHistory(session.pendingTransform);
      return;
    }

    if (session.commitBaseTransient) history.commitTransient();
    if (session.historyEntry) {
      recordLocalHistoryEntry(session.historyEntry);
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
    commitRoleUpdate,
    withTransformHistory,
    undo,
    redo,
    beginTransient,
    commitTransient
  };
}
