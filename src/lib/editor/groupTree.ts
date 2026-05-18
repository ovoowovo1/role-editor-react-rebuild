import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationGroupMember, RoleDocument } from '../../types/role';
import { orderedLayerIds } from './layerOrdering';

function groupMembers(group: DecorationGroup): DecorationGroupMember[] {
  if (Array.isArray(group.members)) {
    return group.members
      .map((member) => {
        if (!member || typeof member !== 'object') return null;
        const type = member.type === 'group' ? 'group' : member.type === 'layer' ? 'layer' : null;
        const id = typeof member.id === 'string' ? member.id : '';
        return type && id ? { type, id } : null;
      })
      .filter((member): member is DecorationGroupMember => member !== null);
  }
  return group.itemIds.map((id) => ({ type: 'layer', id }));
}

export function membersForGroup(group: DecorationGroup): DecorationGroupMember[] {
  return groupMembers(group).map((member) => ({ ...member }));
}

export function groupById(groups: DecorationGroup[]): Map<string, DecorationGroup> {
  return new Map(groups.map((group) => [group.id, group]));
}

export function directParentGroupId(groups: DecorationGroup[], member: DecorationGroupMember): string | null {
  for (const group of groups) {
    if (groupMembers(group).some((item) => item.type === member.type && item.id === member.id)) {
      return group.id;
    }
  }
  return null;
}

export function directParentGroup(groups: DecorationGroup[], member: DecorationGroupMember): DecorationGroup | undefined {
  const parentId = directParentGroupId(groups, member);
  return parentId ? groups.find((group) => group.id === parentId) : undefined;
}

export function groupForLayer(groups: DecorationGroup[], layerId: string): DecorationGroup | undefined {
  return directParentGroup(groups, { type: 'layer', id: layerId });
}

export function isGroupDescendant(groups: DecorationGroup[], ancestorId: string, candidateId: string): boolean {
  const byId = groupById(groups);
  const seen = new Set<string>();

  const visit = (groupId: string): boolean => {
    if (seen.has(groupId)) return false;
    seen.add(groupId);
    const group = byId.get(groupId);
    if (!group) return false;
    for (const member of groupMembers(group)) {
      if (member.type !== 'group') continue;
      if (member.id === candidateId || visit(member.id)) return true;
    }
    return false;
  };

  return visit(ancestorId);
}

export function descendantLayerIdsForGroup(groups: DecorationGroup[], groupId: string): string[] {
  const byId = groupById(groups);
  const ids: string[] = [];
  const seenGroups = new Set<string>();
  const seenLayers = new Set<string>();

  const visit = (id: string) => {
    if (seenGroups.has(id)) return;
    seenGroups.add(id);
    const group = byId.get(id);
    if (!group) return;
    for (const member of groupMembers(group)) {
      if (member.type === 'group') {
        visit(member.id);
      } else if (!seenLayers.has(member.id)) {
        seenLayers.add(member.id);
        ids.push(member.id);
      }
    }
  };

  visit(groupId);
  return ids;
}

export function layerIdsForMember(groups: DecorationGroup[], member: DecorationGroupMember): string[] {
  return member.type === 'group' ? descendantLayerIdsForGroup(groups, member.id) : [member.id];
}

export function topLevelMembersForRole(role: RoleDocument): DecorationGroupMember[] {
  const groups = role.groups ?? [];
  const nestedGroupIds = new Set<string>();
  const groupedLayerIds = new Set<string>();
  const topGroupByLayerId = new Map<string, DecorationGroup>();
  for (const group of groups) {
    for (const member of groupMembers(group)) {
      if (member.type === 'group') nestedGroupIds.add(member.id);
      else groupedLayerIds.add(member.id);
    }
  }
  groups
    .filter((group) => !nestedGroupIds.has(group.id))
    .forEach((group) => {
      descendantLayerIdsForGroup(groups, group.id).forEach((id) => topGroupByLayerId.set(id, group));
    });

  const members: DecorationGroupMember[] = [];
  const addedGroups = new Set<string>();
  for (const id of orderedLayerIds(role, role.decorations.map((item) => item.id).concat(HEAD_LAYER_ID))) {
    const group = topGroupByLayerId.get(id);
    if (group && !addedGroups.has(group.id)) {
      addedGroups.add(group.id);
      members.push({ type: 'group', id: group.id });
      continue;
    }
    if (!groupedLayerIds.has(id)) members.push({ type: 'layer', id });
  }

  return members;
}

export function topLevelGroupIds(groups: DecorationGroup[]): Set<string> {
  const nested = new Set<string>();
  for (const group of groups) {
    for (const member of groupMembers(group)) {
      if (member.type === 'group') nested.add(member.id);
    }
  }
  return new Set(groups.filter((group) => !nested.has(group.id)).map((group) => group.id));
}

export function withGroupMembers(group: DecorationGroup, members: DecorationGroupMember[], groups: DecorationGroup[]): DecorationGroup {
  const layerIds = members.flatMap((member) => layerIdsForMember(groups, member));
  return {
    ...group,
    members: members.map((member) => ({ ...member })),
    itemIds: layerIds
  };
}

export function removeMembersFromAllGroups(
  groups: DecorationGroup[],
  movingMembers: DecorationGroupMember[],
  keepGroupIds: Set<string> = new Set()
): DecorationGroup[] {
  const directGroups = groups.map((group) => {
    const members = groupMembers(group).filter(
      (member) =>
        !movingMembers.some((moving) => moving.type === member.type && moving.id === member.id) ||
        keepGroupIds.has(group.id)
    );
    return { ...group, members: members.map((member) => ({ ...member })) };
  });
  return directGroups.map((group) => withGroupMembers(group, membersForGroup(group), directGroups));
}

export function normalizeGroupsForRole(role: RoleDocument): DecorationGroup[] {
  const validLayerIds = new Set(role.decorations.map((item) => item.id));
  validLayerIds.add(HEAD_LAYER_ID);
  const rawGroups = role.groups ?? [];
  const byId = groupById(rawGroups);
  const claimedLayers = new Set<string>();
  const claimedGroups = new Set<string>();
  const normalizing = new Set<string>();
  const normalized = new Map<string, DecorationGroup>();
  const invalidGroups = new Set<string>();

  const normalizeGroup = (group: DecorationGroup): DecorationGroup | null => {
    const cached = normalized.get(group.id);
    if (cached) return cached;
    if (normalizing.has(group.id)) {
      invalidGroups.add(group.id);
      return null;
    }
    normalizing.add(group.id);

    const members: DecorationGroupMember[] = [];
    const localLayerIds = new Set<string>();
    for (const member of groupMembers(group)) {
      if (member.type === 'layer') {
        if (!validLayerIds.has(member.id) || claimedLayers.has(member.id) || localLayerIds.has(member.id)) continue;
        members.push({ ...member });
        localLayerIds.add(member.id);
        continue;
      }

      if (member.id === group.id || claimedGroups.has(member.id)) continue;
      const child = byId.get(member.id);
      if (!child) continue;
      const normalizedChild = normalizeGroup(child);
      if (!normalizedChild || invalidGroups.has(member.id)) continue;
      members.push({ ...member });
    }

    normalizing.delete(group.id);
    const layerIdsForNormalizedMember = (member: DecorationGroupMember): string[] => {
      if (member.type === 'layer') return [member.id];
      return normalized.get(member.id)?.itemIds ?? descendantLayerIdsForGroup(rawGroups, member.id);
    };
    const itemIds = members.flatMap(layerIdsForNormalizedMember);
    if (itemIds.length < 2) {
      invalidGroups.add(group.id);
      return null;
    }

    members.forEach((member) => {
      if (member.type === 'group') claimedGroups.add(member.id);
      else claimedLayers.add(member.id);
    });
    const next = {
      ...group,
      members: members.map((member) => ({ ...member })),
      itemIds
    };
    normalized.set(group.id, next);
    return next;
  };

  return rawGroups
    .map((group) => normalizeGroup(group))
    .filter((group): group is DecorationGroup => group !== null && !invalidGroups.has(group.id));
}

export function cloneGroup(group: DecorationGroup): DecorationGroup {
  return {
    ...group,
    itemIds: [...group.itemIds],
    members: groupMembers(group)
  };
}

export function groupsContainHead(groups: DecorationGroup[], groupId: string): boolean {
  return descendantLayerIdsForGroup(groups, groupId).includes(HEAD_LAYER_ID);
}
