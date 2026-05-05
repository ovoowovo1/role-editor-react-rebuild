import {
  GROUP_ROW_PREFIX,
  HEAD_ATOM,
  HEAD_LAYER_ID,
  HEAD_ROW_ID,
  ITEM_ROW_PREFIX
} from '../constants/layers';
import type { DecorationGroup, RoleDocument } from '../types/role';
import { createId } from './math';
import { atomToLayerId, atomsForRole, deriveRoleFromAtoms, layerIdToAtom, orderedLayerIds } from './layerOrdering';
import { groupForItem } from './editorGroupMutations';

type LayerDragTarget =
  | { kind: 'head' }
  | { kind: 'group'; id: string }
  | { kind: 'item'; id: string };

function parseLayerDragTarget(rawId: string): LayerDragTarget {
  if (rawId === HEAD_ROW_ID) return { kind: 'head' };
  if (rawId.startsWith(GROUP_ROW_PREFIX)) return { kind: 'group', id: rawId.slice(GROUP_ROW_PREFIX.length) };
  if (rawId.startsWith(ITEM_ROW_PREFIX)) return { kind: 'item', id: rawId.slice(ITEM_ROW_PREFIX.length) };
  return { kind: 'item', id: rawId };
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

export function reorderIncludingHead(role: RoleDocument, activeRowId: string, overRowId: string, selectedIds: string[]): RoleDocument | null {
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

export function toggleHeadVisibility(role: RoleDocument): RoleDocument {
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

export function nextGroupId(): string {
  return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ungroupedSelectedLayerIds(role: RoleDocument, selectedIds: string[]): string[] {
  const selected = new Set(selectedIds);
  const grouped = new Set((role.groups ?? []).flatMap((group) => group.itemIds));
  return orderedLayerIds(role, selectedIds).filter((id) => selected.has(id) && !grouped.has(id));
}

export function createGroupFromLayerSelection(role: RoleDocument, selectedIds: string[]): RoleDocument | null {
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

export function setGroupVisibilityIncludingHead(role: RoleDocument, groupId: string, visible: boolean): RoleDocument {
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

export function ungroupIncludingHead(role: RoleDocument, groupId: string): RoleDocument {
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

export function decorationIdsFromLayerIds(role: RoleDocument, layerIds: string[]): string[] {
  const existing = new Set(role.decorations.map((item) => item.id));
  return layerIds.filter((id) => existing.has(id));
}

export function toggleLayerSelection(current: string[], ids: string[], additive: boolean): string[] {
  if (!additive) return ids;
  const next = new Set(current);
  const allSelected = ids.every((id) => next.has(id));
  ids.forEach((id) => {
    if (allSelected) next.delete(id);
    else next.add(id);
  });
  return Array.from(next);
}

