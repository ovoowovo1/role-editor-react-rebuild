import { useCallback, useEffect, useMemo, useState } from 'react';
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

function atomToLayerId(atom: string): string {
  return atom === HEAD_ATOM ? HEAD_LAYER_ID : atom;
}

function layerIdToAtom(id: string): string {
  return id === HEAD_LAYER_ID ? HEAD_ATOM : id;
}

function decorationIdsFromLayerIds(role: RoleDocument, layerIds: string[]): string[] {
  const existing = new Set(role.decorations.map((item) => item.id));
  return layerIds.filter((id) => existing.has(id));
}

function atomsForRole(role: RoleDocument): string[] {
  const headIndex = getHeadLayerIndex(role);
  const atoms = role.decorations.map((item) => item.id);
  atoms.splice(headIndex, 0, HEAD_ATOM);
  return atoms;
}

function orderedLayerIds(role: RoleDocument, ids: string[]): string[] {
  const wanted = new Set(ids.map(layerIdToAtom));
  return atomsForRole(role).filter((atom) => wanted.has(atom)).map(atomToLayerId);
}

function groupForItem(groups: DecorationGroup[], itemId: string): DecorationGroup | undefined {
  return groups.find((group) => group.itemIds.includes(itemId));
}

function atomsForTarget(role: RoleDocument, target: LayerDragTarget): string[] {
  if (target.kind === 'head') return [HEAD_ATOM];
  if (target.kind === 'group') {
    const group = role.groups?.find((item) => item.id === target.id);
    return group ? orderedLayerIds(role, group.itemIds).map(layerIdToAtom) : [];
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
    return atomsForRole(role).filter((atom) => selected.has(atomToLayerId(atom)));
  }
  return [target.id];
}

function groupIdForTarget(role: RoleDocument, target: LayerDragTarget): string | null {
  if (target.kind === 'group') return target.id;
  if (target.kind === 'head') return role.groups?.find((group) => group.itemIds.includes(HEAD_LAYER_ID))?.id ?? null;
  return role.groups?.find((group) => group.itemIds.includes(target.id))?.id ?? null;
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

function syncGroupsForMovedAtoms(role: RoleDocument, active: LayerDragTarget, over: LayerDragTarget, movingAtoms: string[]): void {
  const movingIds = movingAtoms.map(atomToLayerId);
  const movingSet = new Set(movingIds);
  const sourceGroupIds = new Set<string>();
  for (const group of role.groups ?? []) {
    if (group.itemIds.some((id) => movingSet.has(id))) sourceGroupIds.add(group.id);
  }
  const targetGroupId = groupIdForTarget(role, over);

  role.groups = (role.groups ?? [])
    .map((group) => {
      let itemIds = group.itemIds.filter((id) => !movingSet.has(id));
      if (targetGroupId && group.id === targetGroupId) {
        itemIds = [...itemIds, ...movingIds.filter((id) => !itemIds.includes(id))];
      }
      return { ...group, itemIds };
    })
    .filter((group) => group.itemIds.length >= 2 || sourceGroupIds.has(group.id) === false);

  role.groups = (role.groups ?? []).filter((group) => group.itemIds.length >= 2 || group.id === targetGroupId);

  if (!targetGroupId && active.kind === 'item' && over.kind === 'head' && movingAtoms.length === 1) {
    role.groups = (role.groups ?? [])
      .map((group) => ({ ...group, itemIds: group.itemIds.filter((id) => id !== active.id) }))
      .filter((group) => group.itemIds.length >= 2);
  }
}

function reorderIncludingHead(role: RoleDocument, activeRowId: string, overRowId: string, selectedIds: string[]): RoleDocument | null {
  const active = parseLayerDragTarget(activeRowId);
  const over = parseLayerDragTarget(overRowId);
  const activeAtoms = atomsForTarget(role, active);
  const overAtoms = atomsForTarget(role, over);
  const involvesHead = activeAtoms.includes(HEAD_ATOM) || overAtoms.includes(HEAD_ATOM);
  const targetGroupId = groupIdForTarget(role, over);
  const canMoveIntoGroup = Boolean(targetGroupId && activeAtoms.some((atom) => !overAtoms.includes(atom)));
  if (!involvesHead && !canMoveIntoGroup) return null;

  const movingAtoms = atomsForActive(role, active, selectedIds);
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
  syncGroupsForMovedAtoms(nextRole, active, over, movingAtoms);
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

function nextGroupName(role: RoleDocument): string {
  return `Group ${(role.groups ?? []).length + 1}`;
}

function nextGroupId(): string {
  return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ungroupedSelectedLayerIds(role: RoleDocument, selectedIds: string[]): string[] {
  const selected = new Set(selectedIds);
  const grouped = new Set((role.groups ?? []).flatMap((group) => group.itemIds));
  return orderedLayerIds(role, selectedIds).filter((id) => selected.has(id) && !grouped.has(id));
}

function createGroupFromSelection(role: RoleDocument, selectedIds: string[]): RoleDocument | null {
  const itemIds = ungroupedSelectedLayerIds(role, selectedIds);
  if (itemIds.length < 2) return null;
  return {
    ...role,
    groups: [
      ...(role.groups ?? []),
      {
        id: nextGroupId(),
        name: nextGroupName(role),
        itemIds,
        visible: true,
        collapsed: false
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

function setGroupVisibilityIncludingHead(role: RoleDocument, groupId: string, visible: boolean): RoleDocument {
  const group = role.groups?.find((item) => item.id === groupId);
  if (!group) return role;
  const ids = new Set(group.itemIds);
  return {
    ...role,
    groups: (role.groups ?? []).map((item) => (item.id === groupId ? { ...item, visible } : item)),
    decorations: role.decorations.map((item) => (ids.has(item.id) ? { ...item, visible } : item)),
    headLayer: ids.has(HEAD_LAYER_ID) ? { ...role.headLayer, visible } : role.headLayer,
    updatedAt: new Date().toISOString()
  };
}

function ungroupIncludingHead(role: RoleDocument, groupId: string): RoleDocument {
  const group = role.groups?.find((item) => item.id === groupId);
  const ids = new Set(group?.itemIds ?? []);
  return {
    ...role,
    groups: (role.groups ?? []).filter((item) => item.id !== groupId),
    decorations: role.decorations.map((item) => (ids.has(item.id) ? { ...item, visible: true } : item)),
    headLayer: ids.has(HEAD_LAYER_ID) ? { ...role.headLayer, visible: true } : role.headLayer,
    updatedAt: new Date().toISOString()
  };
}

function toggleLayerSelection(current: string[], ids: string[], additive: boolean): string[] {
  if (!additive) return ids;
  const next = new Set(current);
  const allSelected = ids.every((id) => next.has(id));
  ids.forEach((id) => {
    if (allSelected) next.delete(id);
    else next.add(id);
  });
  return Array.from(next);
}

export function useRoleEditor() {
  const editor = useBaseRoleEditor();
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(editor.selectedDecorationIds);

  useEffect(() => {
    setSelectedLayerIds((ids) => {
      const valid = new Set([...editor.role.decorations.map((item) => item.id), HEAD_LAYER_ID]);
      return ids.filter((id) => valid.has(id));
    });
  }, [editor.role.decorations]);

  const selectedDecorationIdsOnly = useMemo(
    () => decorationIdsFromLayerIds(editor.role, selectedLayerIds),
    [editor.role, selectedLayerIds]
  );

  const selectedDecorations = useMemo(
    () => editor.role.decorations.filter((item) => selectedLayerIds.includes(item.id)),
    [editor.role.decorations, selectedLayerIds]
  );

  const canGroupSelected = useMemo(
    () => ungroupedSelectedLayerIds(editor.role, selectedLayerIds).length >= 2,
    [editor.role, selectedLayerIds]
  );

  const selectDecoration = useCallback(
    (id: string, additive = false) => {
      if (id === HEAD_LAYER_ID) {
        setSelectedLayerIds((current) => toggleLayerSelection(current, [HEAD_LAYER_ID], additive));
        if (!additive) editor.clearSelection();
        return;
      }
      setSelectedLayerIds((current) => toggleLayerSelection(current, [id], additive));
      editor.selectDecoration(id, additive);
    },
    [editor]
  );

  const clearSelection = useCallback(() => {
    setSelectedLayerIds([]);
    editor.clearSelection();
  }, [editor]);

  const selectGroup = useCallback(
    (groupId: string, additive = false) => {
      const group = editor.role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      const ids = orderedLayerIds(editor.role, group.itemIds);
      setSelectedLayerIds((current) => toggleLayerSelection(current, ids, additive));
      editor.selectGroup(groupId, additive);
    },
    [editor]
  );

  const groupSelected = useCallback(() => {
    const nextRole = createGroupFromSelection(editor.role, selectedLayerIds);
    if (!nextRole) return;
    editor.importRole(nextRole);
  }, [editor, selectedLayerIds]);

  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string) => {
      const nextRole = reorderIncludingHead(editor.role, activeRowId, overRowId, selectedLayerIds);
      if (nextRole) {
        editor.importRole(nextRole);
        return;
      }
      editor.reorderDecorations(activeRowId, overRowId);
    },
    [editor, selectedLayerIds]
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

  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      const group = editor.role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      if (group.itemIds.includes(HEAD_LAYER_ID)) {
        editor.importRole(setGroupVisibilityIncludingHead(editor.role, groupId, group.visible === false));
        return;
      }
      editor.toggleGroupVisibility(groupId);
    },
    [editor]
  );

  const ungroup = useCallback(
    (groupId: string) => {
      const group = editor.role.groups?.find((item) => item.id === groupId);
      if (group?.itemIds.includes(HEAD_LAYER_ID)) {
        editor.importRole(ungroupIncludingHead(editor.role, groupId));
        return;
      }
      editor.ungroup(groupId);
    },
    [editor]
  );

  return {
    ...editor,
    selectedDecorationIds: selectedLayerIds,
    selectedDecorations,
    canGroupSelected,
    selectDecoration,
    clearSelection,
    selectGroup,
    groupSelected,
    toggleGroupVisibility,
    ungroup,
    reorderDecorations,
    toggleDecorationVisibility,
    selectedDecorationIdsOnly
  };
}
