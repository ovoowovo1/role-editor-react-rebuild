import type { DecorationLayer, EditorClipboardItem, RoleDocument } from '../../types/role';
import { getHeadLayerIndex } from './layerOrdering';
import { createId, normalizeDegrees } from '../math';
import { shiftHeadLayerForDeletedIndexes, shiftHeadLayerForInsert } from './editorRoleUtils';
import { membersForGroup, withGroupMembers } from './groupTree';

export function insertAfterSelection(role: RoleDocument, selectedIds: string[]): number {
  const idToIndex = new Map(role.decorations.map((item, i) => [item.id, i]));
  const indexes = selectedIds
    .map((id) => idToIndex.get(id) ?? -1)
    .filter((index) => index >= 0);
  return indexes.length ? Math.max(...indexes) + 1 : 0;
}

export function setSelectedVisibleInRole(current: RoleDocument, selectedIds: string[], visible: boolean): void {
  const selected = new Set(selectedIds);
  current.decorations = current.decorations.map((item) => (selected.has(item.id) ? { ...item, visible } : item));
}

export function toggleDecorationVisibilityInRole(current: RoleDocument, id: string): void {
  current.decorations = current.decorations.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item));
}

export function deleteDecorationFromRole(current: RoleDocument, id: string): void {
  const oldHeadIndex = getHeadLayerIndex(current);
  const deletedIndex = current.decorations.findIndex((item) => item.id === id);
  current.decorations = current.decorations.filter((item) => item.id !== id);
  current.groups = (current.groups ?? []).map((group) =>
    withGroupMembers(group, membersForGroup(group).filter((member) => member.type === 'group' || member.id !== id), current.groups ?? [])
  );
  shiftHeadLayerForDeletedIndexes(current, oldHeadIndex, [deletedIndex]);
}

export function deleteSelectedFromRole(current: RoleDocument, selectedIds: string[]): void {
  const selected = new Set(selectedIds);
  const oldHeadIndex = getHeadLayerIndex(current);
  const deletedIndexes = current.decorations
    .map((item, index) => (selected.has(item.id) ? index : -1))
    .filter((index) => index >= 0);
  current.decorations = current.decorations.filter((item) => !selected.has(item.id));
  current.groups = (current.groups ?? []).map((group) =>
    withGroupMembers(group, membersForGroup(group).filter((member) => member.type === 'group' || !selected.has(member.id)), current.groups ?? [])
  );
  shiftHeadLayerForDeletedIndexes(current, oldHeadIndex, deletedIndexes);
}

export function copiedClipboardItems(selectedDecorations: DecorationLayer[]): EditorClipboardItem[] {
  return selectedDecorations.map(({ id: _id, ...rest }) => rest);
}

export function pasteClipboardIntoRole(
  current: RoleDocument,
  clipboard: EditorClipboardItem[],
  selectedIds: string[],
  offset: number
): string[] {
  const insertIndex = insertAfterSelection(current, selectedIds);
  const pasted = clipboard.map((item) => ({ ...item, id: createId('deco'), x: item.x + offset, y: item.y + offset }));
  shiftHeadLayerForInsert(current, insertIndex, pasted.length);
  current.decorations = [...current.decorations.slice(0, insertIndex), ...pasted, ...current.decorations.slice(insertIndex)];
  return pasted.map((item) => item.id);
}

export function mirrorCopySelectedInRole(current: RoleDocument, selectedIds: string[], axis: 'horizontal' | 'vertical'): string[] {
  const selectedSet = new Set(selectedIds);
  const selected = current.decorations.filter((item) => selectedSet.has(item.id));
  if (!selected.length) return [];
  const insertIndex = insertAfterSelection(current, selectedIds);
  const mirrored = selected.map((item) => ({
    ...item,
    id: createId('deco'),
    rotation: normalizeDegrees(-item.rotation),
    ...(axis === 'horizontal' ? { x: -item.x, scaleX: -item.scaleX } : { y: -item.y, scaleY: -item.scaleY })
  }));
  shiftHeadLayerForInsert(current, insertIndex, mirrored.length);
  current.decorations = [...current.decorations.slice(0, insertIndex), ...mirrored, ...current.decorations.slice(insertIndex)];
  return mirrored.map((item) => item.id);
}

export function moveSelectedToBoundaryInRole(current: RoleDocument, selectedIds: string[], boundary: 'top' | 'bottom'): void {
  const selectedSet = new Set(selectedIds);
  const moving = current.decorations.filter((item) => selectedSet.has(item.id));
  const remaining = current.decorations.filter((item) => !selectedSet.has(item.id));
  current.decorations = boundary === 'top' ? [...moving, ...remaining] : [...remaining, ...moving];
}
