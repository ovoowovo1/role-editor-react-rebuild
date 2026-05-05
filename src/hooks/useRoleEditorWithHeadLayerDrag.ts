import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DecorationGroup, DecorationLayer, EditorClipboardItem, PartOption, RoleDocument } from '../types/role';
import { createId, round } from '../lib/math';
import { HEAD_LAYER_ID } from '../components/LayerList';
import { useRoleEditor as useBaseRoleEditor } from './useRoleEditor';

export type InsertDraftPlacement = 'top' | 'bottom' | 'after_index';

export interface InsertDraftScopes {
  palette: boolean;
  copy: boolean;
  mergeBatch: boolean;
}

export interface InsertDraftSettings {
  placement: InsertDraftPlacement;
  index: string;
  scopes: InsertDraftScopes;
}

const HEAD_ROW_ID = 'head:singleton';
const HEAD_ATOM = '__HEAD_LAYER__';
const GROUP_ROW_PREFIX = 'group:';
const ITEM_ROW_PREFIX = 'item:';
const HISTORY_LIMIT = 200;

const DEFAULT_INSERT_SETTINGS: InsertDraftSettings = {
  placement: 'top',
  index: '1',
  scopes: {
    palette: true,
    copy: true,
    mergeBatch: true
  }
};

type LayerDragTarget =
  | { kind: 'head' }
  | { kind: 'group'; id: string }
  | { kind: 'item'; id: string };

function cloneRole(role: RoleDocument): RoleDocument {
  return JSON.parse(JSON.stringify(role)) as RoleDocument;
}

function sameRole(a: RoleDocument, b: RoleDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

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

function deriveRoleFromAtoms(role: RoleDocument, atoms: string[], extraDecorations: Map<string, DecorationLayer> = new Map()): RoleDocument {
  const decorationById = new Map(role.decorations.map((item) => [item.id, item]));
  extraDecorations.forEach((item, id) => decorationById.set(id, item));
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

function makeDecoration(option: PartOption, index: number): DecorationLayer {
  const spread = 14;
  return {
    id: createId('deco'),
    code: option.code,
    assetId: option.id,
    name: option.label,
    x: round(((index % 5) - 2) * spread, 2),
    y: round(-50 + Math.floor(index / 5) * 8, 2),
    scaleX: 0.5,
    scaleY: 0.5,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

function copyDecorationForInsert(item: DecorationLayer | EditorClipboardItem, offset = 0): DecorationLayer {
  return {
    ...item,
    id: createId('deco'),
    x: round(item.x + offset, 2),
    y: round(item.y + offset, 2)
  };
}

function getInsertVirtualIndex(role: RoleDocument, settings: InsertDraftSettings): number {
  const atoms = atomsForRole(role);
  if (settings.placement === 'top') return 0;
  if (settings.placement === 'bottom') return atoms.length;
  const numeric = Number(settings.index);
  if (!Number.isInteger(numeric) || numeric < 1) return atoms.length;
  return clamp(numeric, 0, atoms.length);
}

function settingsForScope(settings: InsertDraftSettings, enabled: boolean): InsertDraftSettings {
  return enabled ? settings : { ...settings, placement: 'bottom' };
}

function insertDecorations(role: RoleDocument, decorations: DecorationLayer[], settings: InsertDraftSettings): RoleDocument {
  if (!decorations.length) return role;
  const atoms = atomsForRole(role);
  const insertIndex = getInsertVirtualIndex(role, settings);
  const newAtoms = decorations.map((item) => item.id);
  const nextAtoms = [...atoms.slice(0, insertIndex), ...newAtoms, ...atoms.slice(insertIndex)];
  const extras = new Map(decorations.map((item) => [item.id, item]));
  return deriveRoleFromAtoms(role, nextAtoms, extras);
}

function mergeImportedRoleIntoCurrent(role: RoleDocument, incoming: RoleDocument, settings: InsertDraftSettings): { role: RoleDocument; insertedIds: string[] } {
  const idMap = new Map<string, string>();
  const copied = incoming.decorations.map((item, index) => {
    const next = copyDecorationForInsert(item, index * 2);
    idMap.set(item.id, next.id);
    return next;
  });
  const nextRole = insertDecorations(role, copied, settings);
  const importedGroups = (incoming.groups ?? [])
    .map((group): DecorationGroup | null => {
      const itemIds = group.itemIds
        .map((id) => idMap.get(id))
        .filter((id): id is string => Boolean(id));
      if (itemIds.length < 2) return null;
      return {
        id: nextGroupId(),
        name: group.name || nextGroupName(nextRole),
        visible: group.visible !== false,
        collapsed: group.collapsed === true,
        itemIds
      };
    })
    .filter((group): group is DecorationGroup => group !== null);
  return {
    role: {
      ...nextRole,
      groups: [...(nextRole.groups ?? []), ...importedGroups],
      updatedAt: new Date().toISOString()
    },
    insertedIds: copied.map((item) => item.id)
  };
}

export function useRoleEditor() {
  const editor = useBaseRoleEditor();
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(editor.selectedDecorationIds);
  const [insertDraftSettings, setInsertDraftSettingsState] = useState<InsertDraftSettings>(DEFAULT_INSERT_SETTINGS);
  const [localClipboard, setLocalClipboard] = useState<EditorClipboardItem[]>([]);
  const [localPasteCount, setLocalPasteCount] = useState(0);
  const [localPast, setLocalPast] = useState<RoleDocument[]>([]);
  const [localFuture, setLocalFuture] = useState<RoleDocument[]>([]);

  const commitRole = useCallback(
    (nextRole: RoleDocument, nextSelectionIds?: string[]) => {
      if (sameRole(editor.role, nextRole)) return;
      const previous = cloneRole(editor.role);
      setLocalPast((items) => [...items, previous].slice(-HISTORY_LIMIT));
      setLocalFuture([]);
      editor.importRole(nextRole);
      if (nextSelectionIds) setSelectedLayerIds(nextSelectionIds);
    },
    [editor]
  );

  const undo = useCallback(() => {
    if (localPast.length) {
      const previous = localPast[localPast.length - 1];
      setLocalPast((items) => items.slice(0, -1));
      setLocalFuture((items) => [cloneRole(editor.role), ...items].slice(0, HISTORY_LIMIT));
      editor.importRole(previous);
      setSelectedLayerIds([]);
      return;
    }
    editor.undo();
  }, [editor, localPast]);

  const redo = useCallback(() => {
    if (localFuture.length) {
      const next = localFuture[0];
      setLocalFuture((items) => items.slice(1));
      setLocalPast((items) => [...items, cloneRole(editor.role)].slice(-HISTORY_LIMIT));
      editor.importRole(next);
      setSelectedLayerIds([]);
      return;
    }
    editor.redo();
  }, [editor, localFuture]);

  const setInsertDraftSettings = useCallback((settings: InsertDraftSettings) => {
    setInsertDraftSettingsState({
      placement: settings.placement,
      index: settings.index,
      scopes: {
        palette: Boolean(settings.scopes.palette),
        copy: Boolean(settings.scopes.copy),
        mergeBatch: Boolean(settings.scopes.mergeBatch)
      }
    });
  }, []);

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

  const canMergeSelected = selectedDecorations.length > 0;

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
    commitRole(nextRole);
  }, [commitRole, editor.role, selectedLayerIds]);

  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string) => {
      const nextRole = reorderIncludingHead(editor.role, activeRowId, overRowId, selectedLayerIds);
      if (nextRole) {
        commitRole(nextRole);
        return;
      }
      editor.reorderDecorations(activeRowId, overRowId);
    },
    [commitRole, editor, selectedLayerIds]
  );

  const toggleDecorationVisibility = useCallback(
    (id: string) => {
      if (id === HEAD_LAYER_ID) {
        commitRole(toggleHeadVisibility(editor.role));
        return;
      }
      editor.toggleDecorationVisibility(id);
    },
    [commitRole, editor]
  );

  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      const group = editor.role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      if (group.itemIds.includes(HEAD_LAYER_ID)) {
        commitRole(setGroupVisibilityIncludingHead(editor.role, groupId, group.visible === false));
        return;
      }
      editor.toggleGroupVisibility(groupId);
    },
    [commitRole, editor]
  );

  const ungroup = useCallback(
    (groupId: string) => {
      const group = editor.role.groups?.find((item) => item.id === groupId);
      if (group?.itemIds.includes(HEAD_LAYER_ID)) {
        commitRole(ungroupIncludingHead(editor.role, groupId));
        return;
      }
      editor.ungroup(groupId);
    },
    [commitRole, editor]
  );

  const choosePart = useCallback(
    (tab: Parameters<typeof editor.choosePart>[0], option: PartOption) => {
      if (tab === 'deco' && insertDraftSettings.scopes.palette) {
        const deco = makeDecoration(option, editor.role.decorations.length);
        const nextRole = insertDecorations(editor.role, [deco], insertDraftSettings);
        commitRole(nextRole, [deco.id]);
        return;
      }
      editor.choosePart(tab, option);
    },
    [commitRole, editor, insertDraftSettings]
  );

  const copySelected = useCallback(() => {
    const copied = selectedDecorations.map(({ id: _id, ...item }) => item);
    setLocalClipboard(copied);
    editor.copySelected();
  }, [editor, selectedDecorations]);

  const pasteClipboard = useCallback(() => {
    if (!insertDraftSettings.scopes.copy || !localClipboard.length) {
      editor.pasteClipboard();
      return;
    }
    const offset = 8 + localPasteCount * 4;
    const pasted = localClipboard.map((item) => copyDecorationForInsert(item, offset));
    const nextRole = insertDecorations(editor.role, pasted, insertDraftSettings);
    commitRole(nextRole, pasted.map((item) => item.id));
    setLocalPasteCount((count) => count + 1);
  }, [commitRole, editor, insertDraftSettings, localClipboard, localPasteCount]);

  const mirrorCopyHorizontalSelected = useCallback(() => {
    if (!insertDraftSettings.scopes.copy || !selectedDecorations.length) {
      editor.mirrorCopyHorizontalSelected();
      return;
    }
    const copied = selectedDecorations.map((item) => ({ ...copyDecorationForInsert(item), x: round(-item.x, 2) }));
    const nextRole = insertDecorations(editor.role, copied, insertDraftSettings);
    commitRole(nextRole, copied.map((item) => item.id));
  }, [commitRole, editor, insertDraftSettings, selectedDecorations]);

  const mirrorCopyVerticalSelected = useCallback(() => {
    if (!insertDraftSettings.scopes.copy || !selectedDecorations.length) {
      editor.mirrorCopyVerticalSelected();
      return;
    }
    const copied = selectedDecorations.map((item) => ({ ...copyDecorationForInsert(item), y: round(-item.y, 2) }));
    const nextRole = insertDecorations(editor.role, copied, insertDraftSettings);
    commitRole(nextRole, copied.map((item) => item.id));
  }, [commitRole, editor, insertDraftSettings, selectedDecorations]);

  const mergeSelectedAsBatch = useCallback(() => {
    if (!selectedDecorations.length) return;
    const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
    const copied = selectedDecorations.map((item, index) => copyDecorationForInsert(item, index * 2));
    const nextRole = insertDecorations(editor.role, copied, settings);
    commitRole(nextRole, copied.map((item) => item.id));
  }, [commitRole, editor.role, insertDraftSettings, selectedDecorations]);

  const mergeImportedRole = useCallback(
    (incoming: RoleDocument) => {
      const settings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
      const result = mergeImportedRoleIntoCurrent(editor.role, incoming, settings);
      commitRole(result.role, result.insertedIds);
    },
    [commitRole, editor.role, insertDraftSettings]
  );

  const importRole = useCallback(
    (role: RoleDocument) => {
      setLocalPast([]);
      setLocalFuture([]);
      setSelectedLayerIds([]);
      editor.importRole(role);
    },
    [editor]
  );

  return {
    ...editor,
    role: editor.role,
    canUndo: localPast.length > 0 || editor.canUndo,
    canRedo: localFuture.length > 0 || editor.canRedo,
    undo,
    redo,
    importRole,
    selectedDecorationIds: selectedLayerIds,
    selectedDecorations,
    canGroupSelected,
    canMergeSelected,
    insertDraftSettings,
    setInsertDraftSettings,
    selectDecoration,
    clearSelection,
    selectGroup,
    groupSelected,
    toggleGroupVisibility,
    ungroup,
    reorderDecorations,
    toggleDecorationVisibility,
    choosePart,
    copySelected,
    pasteClipboard,
    mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected,
    mergeSelectedAsBatch,
    mergeImportedRole,
    selectedDecorationIdsOnly
  };
}
