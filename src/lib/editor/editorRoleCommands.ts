import type { BodyPartTab, DecorationLayer, PartOption, RoleDocument } from '../../types/role';
import { getPartFrame } from '../runtime/twlibPartRuntime';
import { normalizeDegrees } from '../math';
import { copyDecoration } from './editorImportMerge';
import { cloneRole } from './editorRoleUtils';
import {
  captureDecorationTransforms,
  makeSnapshotEntry,
  roundPosition,
  sameRole,
  validSelectionIds,
  type DecorationTransformTarget,
  type LocalHistoryEntry
} from './editorTransformHistory';

export function selectionIdsForCommand(...candidates: string[][]): string[] {
  const selected = candidates.find((ids) => ids.length > 0) ?? [];
  return [...selected];
}

export function commandSelectionIdsForRole(role: RoleDocument, ...candidates: string[][]): string[] {
  return validSelectionIds(role, selectionIdsForCommand(...candidates));
}

export function stableSelectionIdsForRole(
  role: RoleDocument,
  selectedLayerIds: string[],
  transientActive: boolean,
  ...fallbacks: string[][]
): string[] {
  const current = validSelectionIds(role, selectedLayerIds);
  if (current.length) return current;
  if (!transientActive) return [];
  return commandSelectionIdsForRole(role, ...fallbacks);
}

export interface BeginTransientSessionResult {
  selectionIds: string[];
  transformBefore: DecorationTransformTarget[] | null;
  roleBefore: RoleDocument | null;
}

export function beginTransientSession(
  role: RoleDocument,
  stableSelectedIds: string[],
  fallbackSelectedIds: string[]
): BeginTransientSessionResult {
  const selectionIds = commandSelectionIdsForRole(role, stableSelectedIds, fallbackSelectedIds);
  const transformBefore = captureDecorationTransforms(role, selectionIds);
  if (transformBefore.length) {
    return { selectionIds, transformBefore, roleBefore: null };
  }
  return { selectionIds, transformBefore: null, roleBefore: cloneRole(role) };
}

export interface CommitTransientSessionResult {
  pendingTransform: { target: DecorationTransformTarget[]; selectionIds: string[] } | null;
  snapshotEntry: LocalHistoryEntry | null;
  restoreSelectionIds: string[];
  commitBaseTransient: boolean;
}

export function commitTransientSession(
  roleBefore: RoleDocument | null,
  transformBefore: DecorationTransformTarget[] | null,
  selectionBefore: string[],
  currentRole: RoleDocument,
  fallbackSelectedIds: string[]
): CommitTransientSessionResult {
  if (transformBefore) {
    return {
      pendingTransform: { target: transformBefore, selectionIds: selectionBefore },
      snapshotEntry: null,
      restoreSelectionIds: selectionBefore,
      commitBaseTransient: false
    };
  }

  return {
    pendingTransform: null,
    snapshotEntry: roleBefore && !sameRole(roleBefore, currentRole) ? makeSnapshotEntry(roleBefore) : null,
    restoreSelectionIds: selectionIdsForCommand(selectionBefore, fallbackSelectedIds),
    commitBaseTransient: true
  };
}

export function clipboardDecorationsFromSelection(selectedDecorations: DecorationLayer[]): DecorationLayer[] {
  return selectedDecorations.map((item) => ({ ...item }));
}

export function copyDecorationsForPaste(localClipboard: DecorationLayer[]): DecorationLayer[] {
  return localClipboard.map((item) => copyDecoration(item));
}

export function mirroredCopiedDecorations(
  selectedDecorations: DecorationLayer[],
  axis: 'horizontal' | 'vertical'
): DecorationLayer[] {
  return selectedDecorations.map((item) =>
    copyDecoration(
      item,
      axis === 'horizontal'
        ? { x: roundPosition(-item.x), scaleX: -item.scaleX, rotation: normalizeDegrees(-item.rotation) }
        : { y: roundPosition(-item.y), scaleY: -item.scaleY, rotation: normalizeDegrees(-item.rotation) }
    )
  );
}

export function roleWithChosenBodyPart(
  current: RoleDocument,
  tab: BodyPartTab,
  option: PartOption
): RoleDocument {
  return {
    ...current,
    parts: {
      ...current.parts,
      [tab]: option.id
    },
    partFrames: {
      ...current.partFrames,
      [tab]: getPartFrame(option) ?? current.partFrames?.[tab] ?? 1
    },
    partScales: {
      ...current.partScales,
      [tab]: current.partScales?.[tab] ?? 1
    }
  };
}

export function roleWithDragDelta(
  current: RoleDocument,
  selectedDecorationIds: string[],
  dx: number,
  dy: number
): RoleDocument {
  if (!selectedDecorationIds.length || (Math.abs(dx) <= Number.EPSILON && Math.abs(dy) <= Number.EPSILON)) {
    return current;
  }
  const selectedSet = new Set(selectedDecorationIds);
  return {
    ...current,
    decorations: current.decorations.map((item) => {
      if (!selectedSet.has(item.id)) return item;
      return { ...item, x: item.x + dx, y: item.y + dy };
    }),
    updatedAt: new Date().toISOString()
  };
}
