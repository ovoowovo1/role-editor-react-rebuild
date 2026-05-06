import type { DecorationGroup, RoleDocument } from '../types/role';
import { createId } from './math';

export function makeGroupMap(groups: DecorationGroup[]): Map<string, DecorationGroup> {
  const map = new Map<string, DecorationGroup>();
  groups.forEach((group) => group.itemIds.forEach((id) => map.set(id, group)));
  return map;
}

export function groupForItem(groups: DecorationGroup[], itemId: string): DecorationGroup | undefined {
  return groups.find((group) => group.itemIds.includes(itemId));
}

export function ungroupedSelectedIds(role: RoleDocument, selectedIds: string[]): string[] {
  const groupMap = makeGroupMap(role.groups ?? []);
  const selected = new Set(selectedIds);
  return role.decorations.filter((item) => selected.has(item.id) && !groupMap.has(item.id)).map((item) => item.id);
}

/** Early-exit version: stops scanning after finding 2 ungrouped items. */
export function hasUngroupedSelected(role: RoleDocument, selectedIds: string[]): boolean {
  if (selectedIds.length < 2) return false;
  const groupMap = makeGroupMap(role.groups ?? []);
  const selected = new Set(selectedIds);
  let found = 0;
  for (const item of role.decorations) {
    if (selected.has(item.id) && !groupMap.has(item.id)) {
      if (++found >= 2) return true;
    }
  }
  return false;
}

export function createGroupFromSelection(current: RoleDocument, selectedIds: string[]): void {
  const itemIds = ungroupedSelectedIds(current, selectedIds);
  if (itemIds.length < 2) return;
  const nextIndex = (current.groups ?? []).length + 1;
  current.groups = [
    ...(current.groups ?? []),
    {
      id: createId('group'),
      name: `Group ${nextIndex}`,
      itemIds,
      visible: true,
      collapsed: false
    }
  ];
}

export function toggleGroupCollapsedInRole(current: RoleDocument, groupId: string): void {
  current.groups = (current.groups ?? []).map((group) =>
    group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
  );
}

export function renameGroupInRole(current: RoleDocument, groupId: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  current.groups = (current.groups ?? []).map((group) =>
    group.id === groupId ? { ...group, name: trimmed } : group
  );
}

export function setGroupVisibleInRole(current: RoleDocument, groupId: string, visible: boolean): void {
  const group = current.groups?.find((item) => item.id === groupId);
  if (!group) return;
  const itemIds = new Set(group.itemIds);
  current.groups = (current.groups ?? []).map((item) => (item.id === groupId ? { ...item, visible } : item));
  current.decorations = current.decorations.map((item) => (itemIds.has(item.id) ? { ...item, visible } : item));
}

export function ungroupInRole(current: RoleDocument, groupId: string): void {
  const group = current.groups?.find((item) => item.id === groupId);
  const itemIds = new Set(group?.itemIds ?? []);
  current.groups = (current.groups ?? []).filter((item) => item.id !== groupId);
  current.decorations = current.decorations.map((item) => (itemIds.has(item.id) ? { ...item, visible: true } : item));
}
