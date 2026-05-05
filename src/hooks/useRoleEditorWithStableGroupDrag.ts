import { useCallback } from 'react';
import { HEAD_LAYER_ID } from '../components/LayerList';
import { useRoleEditor as useMergeSelectionEditor, type InsertDraftSettings } from './useRoleEditorWithMergeSelection';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';

export type { InsertDraftSettings };

const GROUP_ROW_PREFIX = 'group:';
const ITEM_ROW_PREFIX = 'item:';
const HEAD_ROW_ID = 'head:singleton';
const HEAD_ATOM = '__HEAD_LAYER__';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getHeadLayerIndex(role: RoleDocument): number {
  const raw = Number(role.headLayerIndex);
  const count = role.decorations.length;
  return clamp(Number.isFinite(raw) ? Math.round(raw) : count, 0, count);
}

function atomToLayerId(atom: string): string {
  return atom === HEAD_ATOM ? HEAD_LAYER_ID : atom;
}

function layerIdToAtom(id: string): string {
  return id === HEAD_LAYER_ID ? HEAD_ATOM : id;
}

function atomsForRole(role: RoleDocument): string[] {
  const atoms = role.decorations.map((item) => item.id);
  atoms.splice(getHeadLayerIndex(role), 0, HEAD_ATOM);
  return atoms;
}

function orderedLayerIds(role: RoleDocument, ids: string[]): string[] {
  const wanted = new Set(ids.map(layerIdToAtom));
  return atomsForRole(role).filter((atom) => wanted.has(atom)).map(atomToLayerId);
}

function rowIdToAtoms(role: RoleDocument, rowId: string): string[] {
  if (rowId === HEAD_ROW_ID) return [HEAD_ATOM];
  if (rowId.startsWith(ITEM_ROW_PREFIX)) return [rowId.slice(ITEM_ROW_PREFIX.length)];
  if (rowId.startsWith(GROUP_ROW_PREFIX)) {
    const groupId = rowId.slice(GROUP_ROW_PREFIX.length);
    const group = role.groups?.find((item) => item.id === groupId);
    return group ? orderedLayerIds(role, group.itemIds).map(layerIdToAtom) : [];
  }
  return [rowId];
}

function deriveRoleFromAtoms(role: RoleDocument, atoms: string[]): RoleDocument {
  const decorationById = new Map(role.decorations.map((item) => [item.id, item] as const));
  const decorations = atoms
    .filter((atom) => atom !== HEAD_ATOM)
    .map((atom) => decorationById.get(atom))
    .filter((item): item is DecorationLayer => Boolean(item));
  const headAtomIndex = atoms.indexOf(HEAD_ATOM);
  const headLayerIndex = atoms.slice(0, headAtomIndex < 0 ? atoms.length : headAtomIndex).filter((atom) => atom !== HEAD_ATOM).length;
  return {
    ...role,
    decorations,
    headLayerIndex: clamp(headLayerIndex, 0, decorations.length),
    groups: role.groups,
    updatedAt: new Date().toISOString()
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

export function useRoleEditor() {
  const editor = useMergeSelectionEditor();

  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string) => {
      const nextRole = reorderGroupWithoutUngrouping(editor.role, activeRowId, overRowId);
      if (nextRole) {
        editor.importRole(nextRole);
        return;
      }
      editor.reorderDecorations(activeRowId, overRowId);
    },
    [editor]
  );

  return {
    ...editor,
    reorderDecorations
  };
}
