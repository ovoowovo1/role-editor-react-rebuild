import { useCallback, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  beginTransientSession,
  commitTransientSession
} from '../lib/editor/editorRoleCommands';
import { cloneRole, syncGroups, touch } from '../lib/editor/editorRoleUtils';
import {
  resolveLocalRedo,
  resolveLocalUndo,
  resolveRoleHistoryStack
} from '../lib/editor/editorHistoryCommands';
import {
  createHistoryIdPool,
  makeRoleHistoryEntry
} from '../lib/editor/editorRoleHistoryPatch';
import { pushLocalHistoryEntry } from '../lib/editor/editorTransformUtils';
import type { DecorationTransformTarget, HistoryIdPool, LocalHistoryEntry } from '../lib/editor/editorHistoryTypes';
import type { RoleDocument } from '../types/role';
import { usePendingTransformHistory } from './usePendingTransformHistory';

export interface RoleBaseHistoryApi {
  canUndo: boolean;
  canRedo: boolean;
  reset(next: RoleDocument, keepHistory?: boolean): void;
  undo(): void;
  redo(): void;
  clearRedo(): void;
  beginTransient(): void;
  commitTransient(): void;
  cancelTransient(): void;
}

export interface UseRoleHistoryControllerOptions {
  history: RoleBaseHistoryApi;
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

export function useRoleHistoryController({
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
}: UseRoleHistoryControllerOptions) {
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
      // Keep command consumers (including deferred selection restoration) on
      // the committed role before React publishes the next render.
      roleRef.current = nextRole;
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
    const stack = resolveRoleHistoryStack(localPast.length > 0, history.canUndo);
    const result = resolveLocalUndo(roleRef.current, localPast, localFuture);
    if (stack === 'local' && result) {
      setLocalPast(result.localPast);
      setLocalFuture(result.localFuture);
      history.reset(result.nextRole);
      restoreHistorySelection(result.restoreSelectionIds);
      return;
    }
    history.undo();
  }, [history, localFuture, localPast, restoreHistorySelection, roleRef]);

  const redo = useCallback(() => {
    const stack = resolveRoleHistoryStack(localFuture.length > 0, history.canRedo);
    const result = resolveLocalRedo(roleRef.current, localPast, localFuture);
    if (stack === 'local' && result) {
      setLocalPast(result.localPast);
      setLocalFuture(result.localFuture);
      history.reset(result.nextRole);
      restoreHistorySelection(result.restoreSelectionIds);
      return;
    }
    history.redo();
  }, [history, localFuture, localPast, restoreHistorySelection, roleRef]);

  const clearRedo = useCallback(() => {
    setLocalFuture([]);
    history.clearRedo();
  }, [history]);

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
    resetRole: history.reset,
    commitRole,
    importRole,
    recordLocalHistoryEntry,
    commitRoleUpdate,
    withTransformHistory,
    undo,
    redo,
    clearRedo,
    beginTransient,
    commitTransient
  };
}
