import type { DecorationGroup, RoleDocument } from '../types/role';
import { createId } from './math';
import {
  descendantLayerIdsForGroup,
  directParentGroup,
  groupForLayer,
  membersForGroup,
  withGroupMembers
} from './groupTree';

export function makeGroupMap(groups: DecorationGroup[]): Map<string, DecorationGroup> {
  const map = new Map<string, DecorationGroup>();
  groups.forEach((group) => membersForGroup(group).forEach((member) => {
    if (member.type === 'layer') map.set(member.id, group);
  }));
  return map;
}

export function groupForItem(groups: DecorationGroup[], itemId: string): DecorationGroup | undefined {
  return groupForLayer(groups, itemId);
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
      members: itemIds.map((id) => ({ type: 'layer', id })),
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
  const groups = current.groups ?? [];
  const itemIds = new Set(descendantLayerIdsForGroup(groups, groupId));
  const groupIds = new Set<string>([groupId]);
  const collectGroups = (id: string) => {
    const currentGroup = groups.find((item) => item.id === id);
    if (!currentGroup) return;
    for (const member of membersForGroup(currentGroup)) {
      if (member.type === 'group' && !groupIds.has(member.id)) {
        groupIds.add(member.id);
        collectGroups(member.id);
      }
    }
  };
  collectGroups(groupId);
  current.groups = groups.map((item) => (groupIds.has(item.id) ? { ...item, visible } : item));
  current.decorations = current.decorations.map((item) => (itemIds.has(item.id) ? { ...item, visible } : item));
}

export function ungroupInRole(current: RoleDocument, groupId: string): void {
  const groups = current.groups ?? [];
  const group = groups.find((item) => item.id === groupId);
  const itemIds = new Set(group ? descendantLayerIdsForGroup(groups, group.id) : []);
  const groupMembers = group ? membersForGroup(group) : [];
  const parent = group ? directParentGroup(groups, { type: 'group', id: groupId }) : undefined;
  current.groups = groups
    .filter((item) => item.id !== groupId)
    .map((item) => {
      if (parent && item.id === parent.id) {
        const members = membersForGroup(item).flatMap((member) =>
          member.type === 'group' && member.id === groupId ? groupMembers : [member]
        );
        return withGroupMembers(item, members, groups);
      }
      return item;
    });
  current.decorations = current.decorations.map((item) => (itemIds.has(item.id) ? { ...item, visible: true } : item));
}
