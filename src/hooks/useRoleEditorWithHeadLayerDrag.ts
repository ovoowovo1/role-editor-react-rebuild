import { useCallback } from 'react';
import type { DecorationGroup, RoleDocument } from '../types/role';
import { HEAD_LAYER_ID } from '../components/LayerList';
import { useRoleEditor as useBaseRoleEditor } from './useRoleEditor';

const HEAD_ROW_ID = 'head:singleton';
const HEAD_ATOM = '__HEAD_LAYER__';
const GROUP_ROW_PREFIX = 'group:';
const ITEM_ROW_PREFIX = 'item:';

type LayerDragTarget =
  | { kind: 'head' }
  | { kind: 'group'; id: string }
  | { kind: 'item'; id: string };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseLayerDragTarget(rawId: string): LayerDragTarget {
  if (rawId === HEAD_ROW_ID) return { kind: 'head' };
  if (rawId.startsWith(GROUP_ROW_PREFIX)) return { kind: 'group', id: rawId.slice(GROUP_ROW_PREFIX.length) };
  if (rawId.startsWith(ITEM_ROW_PREFIX)) return { kind: 'item', id: rawId.slice(ITEM_ROW_PREFIX.length) };
  return { kind: 'item', id: rawId };
}

function getHeadLayerIndex(role: RoleDocument): number {
  return clamp(Math.round(role.headLayerIndex ?? role.decorations.length), 0, role.decorations.length);
}

function groupForItem(groups: DecorationGroup[], itemId: string): DecorationGroup | undefined {
  return groups.find((group) => group.itemIds.includes(itemId));
}

function orderedIds(role: RoleDocument, ids: string[]): string[] {
  const wanted = new Set(ids);
  return role.decorations.filter((item) => wanted.has(item.id)).map((item) => item.id);
}

function atomsForRole(role: RoleDocument): string[] {
  const headIndex = getHeadLayerIndex(role);
  const atoms = role.decorations.map((item) => item.id);
  atoms.splice(headIndex, 0, HEAD_ATOM);
  return atoms;
}

function atomsForTarget(role: RoleDocument, target: LayerDragTarget): string[] {
  if (target.kind === 'head') return [HEAD_ATOM];
  if (target.kind === 'group') {
    const group = role.groups?.find((item) => item.id === target.id);
    return group ? orderedIds(role, group.itemIds) : [];
  }
  return role.decorations.some((item) => item.id === target.id) ? [target.id] : [];
}

function atomsForActive(role: RoleDocument, target: LayerDragTarget, selectedIds: string[]): string[] {
  if (target.kind === 'head') return [HEAD_ATOM];
  if (target.kind === 'group') return atomsForTarget(role, target);

  const activeExists = role.decorations.some((item) => item.id === target.id);
  if (!activeExists) return [];

  const sourceGroup = groupForItem(role.groups ?? [], target.id);
  const selected = new Set(selectedIds);
  if (!sourceGroup && selected.has(target.id)) {
    return role.decorations.filter((item) => selected.has(item.id)).map((item) => item.id);
  }
  return [target.id];
}

function deriveRoleFromAtoms(role: RoleDocument, atoms: string[]): RoleDocument {
  const decorationById = new Map(role.decorations.map((item) => [item.id, item]));
  const decorations = atoms
    .filter((id) => id !== HEAD_ATOM)
    .map((id) => decorationById.get(id))
    .filter(Boolean) as RoleDocument['decorations'];
  const headAtomIndex = atoms.indexOf(HEAD_ATOM);
  const headLayerIndex = atoms.slice(0, headAtomIndex < 0 ? atoms.length : headAtomIndex).filter((id) => id !== HEAD_ATOM).length;
  return {
    ...role,
    decorations,
    headLayerIndex: clamp(headLayerIndex, 0, decorations.length),
    updatedAt: new Date().toISOString()
  };
}

function removeSingleItemFromGroups(role: RoleDocument, active: LayerDragTarget, movingAtoms: string[], over: LayerDragTarget): void {
  if (active.kind !== 'item' || over.kind !== 'head' || movingAtoms.length !== 1) return;
  role.groups = (role.groups ?? [])
    .map((group) => ({ ...group, itemIds: group.itemIds.filter((id) => id !== active.id) }))
    .filter((group) => group.itemIds.length >= 2);
}

function reorderIncludingHead(role: RoleDocument, activeRowId: string, overRowId: string, selectedIds: string[]): RoleDocument | null {
  const active = parseLayerDragTarget(activeRowId);
  const over = parseLayerDragTarget(overRowId);
  if (active.kind !== 'head' && over.kind !== 'head') return null;

  const movingAtoms = atomsForActive(role, active, selectedIds);
  const overAtoms = atomsForTarget(role, over);
  if (!movingAtoms.length || !overAtoms.length) return role;

  const originalAtoms = atomsForRole(role);
  if (movingAtoms.some((id) => overAtoms.includes(id))) return role;

  const movingSet = new Set(movingAtoms);
  const overSet = new Set(overAtoms);
  const sourceIndexes = originalAtoms.map((id, index) => (movingSet.has(id) ? index : -1)).filter((index) => index >= 0);
  const overIndexes = originalAtoms.map((id, index) => (overSet.has(id) ? index : -1)).filter((index) => index >= 0);
  if (!sourceIndexes.length || !overIndexes.length) return role;

  const sourceStart = Math.min(...sourceIndexes);
  const overStart = Math.min(...overIndexes);
  const remainingAtoms = originalAtoms.filter((id) => !movingSet.has(id));
  const remainingOverIndexes = remainingAtoms.map((id, index) => (overSet.has(id) ? index : -1)).filter((index) => index >= 0);
  if (!remainingOverIndexes.length) return role;

  const targetIndex = sourceStart < overStart ? Math.max(...remainingOverIndexes) + 1 : Math.min(...remainingOverIndexes);
  const nextAtoms = [...remainingAtoms.slice(0, targetIndex), ...movingAtoms, ...remainingAtoms.slice(targetIndex)];
  const nextRole = deriveRoleFromAtoms(role, nextAtoms);
  removeSingleItemFromGroups(nextRole, active, movingAtoms, over);
  return nextRole;
}

function toggleHeadVisibility(role: RoleDocument): RoleDocument {
  return {
    ...role,
    headLayer: {
      ...role.headLayer,
      visible: role.headLayer.visible === false
    },
    updatedAt: new Date().toISOString()
  };
}

export function useRoleEditor() {
  const editor = useBaseRoleEditor();

  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string) => {
      const nextRole = reorderIncludingHead(editor.role, activeRowId, overRowId, editor.selectedDecorationIds);
      if (nextRole) {
        editor.importRole(nextRole);
        return;
      }
      editor.reorderDecorations(activeRowId, overRowId);
    },
    [editor]
  );

  const toggleDecorationVisibility = useCallback(
    (id: string) => {
      if (id === HEAD_LAYER_ID) {
        editor.importRole(toggleHeadVisibility(editor.role));
        return;
      }
      editor.toggleDecorationVisibility(id);
    },
    [editor]
  );

  return {
    ...editor,
    reorderDecorations,
    toggleDecorationVisibility
  };
}
