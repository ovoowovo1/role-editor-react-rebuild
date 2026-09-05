import type { BodyPartTab, DecorationLayer, EditorClipboardItem, PartOption, RoleDocument } from '../../types/role';
import { getPartFrame } from '../runtime/twlibPartRuntime';
import { normalizeDegrees } from '../math';
import { copyDecoration } from './editorImportMerge';
import { pasteClipboardIntoRole } from './editorDecorationMutations';
import { insertDecorations, type InsertDraftSettings } from './editorInsertSettings';
import {
  captureDecorationTransforms,
  makeRoleHistoryEntry,
  roundPosition,
  validSelectionIds,
  type DecorationTransformTarget,
  type HistoryIdPool,
  type LocalHistoryEntry
} from './editorTransformHistory';

const BASE_CLIPBOARD_PASTE_OFFSET_STEP = 8;

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

export function selectionIdsToRestoreForRole(role: RoleDocument, ids: string[]): string[] {
  return validSelectionIds(role, [...new Set(ids.filter(Boolean))]);
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
  // Role updates clone before mutating, so this immutable role reference is
  // sufficient for the transient baseline and avoids another full copy.
  return { selectionIds, transformBefore: null, roleBefore: role };
}

export interface CommitTransientSessionResult {
  pendingTransform: { target: DecorationTransformTarget[]; selectionIds: string[] } | null;
  historyEntry: LocalHistoryEntry | null;
  restoreSelectionIds: string[];
  commitBaseTransient: boolean;
}

export function commitTransientSession(
  roleBefore: RoleDocument | null,
  transformBefore: DecorationTransformTarget[] | null,
  selectionBefore: string[],
  currentRole: RoleDocument,
  fallbackSelectedIds: string[],
  idPool?: HistoryIdPool
): CommitTransientSessionResult {
  if (transformBefore) {
    return {
      pendingTransform: { target: transformBefore, selectionIds: selectionBefore },
      historyEntry: null,
      restoreSelectionIds: selectionBefore,
      commitBaseTransient: false
    };
  }

  return {
    pendingTransform: null,
      historyEntry:
      roleBefore
        ? makeRoleHistoryEntry(
            roleBefore,
            currentRole,
            selectionBefore,
            selectionIdsForCommand(fallbackSelectedIds, selectionBefore),
            idPool
          )
        : null,
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

export interface LocalClipboardPasteResult {
  role: RoleDocument;
  pastedIds: string[];
}

export function pasteLocalClipboardIntoRole(
  current: RoleDocument,
  localClipboard: DecorationLayer[],
  settings: InsertDraftSettings
): LocalClipboardPasteResult | null {
  if (!localClipboard.length) return null;
  const copied = copyDecorationsForPaste(localClipboard);
  return {
    role: insertDecorations(current, copied, settings),
    pastedIds: copied.map((item) => item.id)
  };
}

export interface BaseClipboardPasteResult {
  pastedIds: string[];
  pasteCount: number;
  offset: number;
}

export function pasteBaseClipboardIntoRole(
  current: RoleDocument,
  baseClipboard: EditorClipboardItem[],
  selectedDecorationIds: string[],
  pasteCount: number
): BaseClipboardPasteResult | null {
  if (!baseClipboard.length) return null;
  const nextPasteCount = pasteCount + 1;
  const offset = nextPasteCount * BASE_CLIPBOARD_PASTE_OFFSET_STEP;
  return {
    pastedIds: pasteClipboardIntoRole(current, baseClipboard, selectedDecorationIds, offset),
    pasteCount: nextPasteCount,
    offset
  };
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
