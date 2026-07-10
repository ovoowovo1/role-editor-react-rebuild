import type { RoleDocument } from '../../types/role';
import {
  applyDecorationTransformTarget,
  applyTranslateDelta,
  captureDecorationTransforms,
  makeSnapshotEntry,
  pushLocalFutureEntry,
  pushLocalHistoryEntry,
  type LocalHistoryEntry
} from './editorTransformHistory';

export interface LocalHistoryCommandResult {
  localPast: LocalHistoryEntry[];
  localFuture: LocalHistoryEntry[];
  nextRole: RoleDocument;
  restoreSelectionIds: string[];
}

export function resolveLocalUndo(
  currentRole: RoleDocument,
  localPast: LocalHistoryEntry[],
  localFuture: LocalHistoryEntry[]
): LocalHistoryCommandResult | null {
  if (!localPast.length) return null;

  const previous = localPast[localPast.length - 1];
  const nextPast = localPast.slice(0, -1);

  if (previous.kind === 'translate') {
    return {
      localPast: nextPast,
      localFuture: pushLocalFutureEntry(localFuture, previous),
      nextRole: applyTranslateDelta(currentRole, previous.ids, -previous.dx, -previous.dy),
      restoreSelectionIds: previous.selectionIds
    };
  }

  if (previous.kind === 'transform') {
    const currentTarget = captureDecorationTransforms(currentRole, previous.selectionIds);
    const nextFuture = currentTarget.length
      ? pushLocalFutureEntry(localFuture, {
          kind: 'transform',
          target: currentTarget,
          selectionIds: previous.selectionIds
        })
      : localFuture;

    return {
      localPast: nextPast,
      localFuture: nextFuture,
      nextRole: applyDecorationTransformTarget(currentRole, previous.target),
      restoreSelectionIds: previous.selectionIds
    };
  }

  return {
    localPast: nextPast,
    localFuture: pushLocalFutureEntry(
      localFuture,
      makeSnapshotEntry(currentRole, previous.inverseSelectionIds, previous.selectionIds)
    ),
    nextRole: previous.role,
    restoreSelectionIds: previous.selectionIds
  };
}

export function resolveLocalRedo(
  currentRole: RoleDocument,
  localPast: LocalHistoryEntry[],
  localFuture: LocalHistoryEntry[]
): LocalHistoryCommandResult | null {
  if (!localFuture.length) return null;

  const next = localFuture[0];
  const nextFuture = localFuture.slice(1);

  if (next.kind === 'translate') {
    return {
      localPast: pushLocalHistoryEntry(localPast, next),
      localFuture: nextFuture,
      nextRole: applyTranslateDelta(currentRole, next.ids, next.dx, next.dy),
      restoreSelectionIds: next.selectionIds
    };
  }

  if (next.kind === 'transform') {
    const currentTarget = captureDecorationTransforms(currentRole, next.selectionIds);
    const nextPast = currentTarget.length
      ? pushLocalHistoryEntry(localPast, {
          kind: 'transform',
          target: currentTarget,
          selectionIds: next.selectionIds
        })
      : localPast;

    return {
      localPast: nextPast,
      localFuture: nextFuture,
      nextRole: applyDecorationTransformTarget(currentRole, next.target),
      restoreSelectionIds: next.selectionIds
    };
  }

  return {
    localPast: pushLocalHistoryEntry(
      localPast,
      makeSnapshotEntry(currentRole, next.inverseSelectionIds, next.selectionIds)
    ),
    localFuture: nextFuture,
    nextRole: next.role,
    restoreSelectionIds: next.selectionIds
  };
}
