import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import {
  commandSelectionIdsForRole
} from '../lib/editor/editorRoleCommands';
import {
  captureDecorationTransforms,
  sameTransformTarget,
  type DecorationTransformTarget,
  type LocalHistoryEntry
} from '../lib/editor/editorTransformHistory';
import type { RoleDocument } from '../types/role';

export function usePendingTransformHistory({
  role,
  roleRef,
  selectedIdsRef,
  recordLocalHistoryEntry,
  restoreSelection
}: {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  selectedIdsRef: MutableRefObject<string[]>;
  recordLocalHistoryEntry(entry: LocalHistoryEntry): void;
  restoreSelection(ids: string[]): void;
}) {
  const pendingTransformHistoryRef = useRef<{ target: DecorationTransformTarget[]; selectionIds: string[] } | null>(null);
  const pendingTransformFinalizeRef = useRef<number | null>(null);

  const finalizePendingTransformHistory = useCallback(
    (targetRole: RoleDocument = roleRef.current) => {
      const pending = pendingTransformHistoryRef.current;
      if (!pending) return;

      const currentTarget = captureDecorationTransforms(targetRole, pending.selectionIds);
      pendingTransformHistoryRef.current = null;

      if (!currentTarget.length || sameTransformTarget(pending.target, currentTarget)) return;
      recordLocalHistoryEntry({
        kind: 'transform',
        target: pending.target,
        selectionIds: pending.selectionIds
      });
      restoreSelection(pending.selectionIds);
    },
    [recordLocalHistoryEntry, restoreSelection, roleRef]
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
  }, [finalizePendingTransformHistory, roleRef]);

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
    [roleRef, schedulePendingTransformFinalize, selectedIdsRef]
  );

  const queuePendingTransformHistory = useCallback(
    (pending: { target: DecorationTransformTarget[]; selectionIds: string[] }) => {
      pendingTransformHistoryRef.current ??= pending;
      schedulePendingTransformFinalize();
    },
    [schedulePendingTransformFinalize]
  );

  return {
    withTransformHistory,
    queuePendingTransformHistory
  };
}
