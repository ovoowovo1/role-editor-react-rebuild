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

export interface GroupTreeIndex {
  readonly byId: ReadonlyMap<string, DecorationGroup>;
  readonly topLevelGroupIds: ReadonlySet<string>;
  members(group: DecorationGroup): readonly DecorationGroupMember[];
  descendantLayerIds(groupId: string): readonly string[];
}

export function createGroupTreeIndex(groups: DecorationGroup[]): GroupTreeIndex {
  const byId = groupById(groups);
  const membersById = new Map(groups.map((group) => [group.id, groupMembers(group)]));
  const nestedGroupIds = new Set<string>();
  membersById.forEach((members) => {
    members.forEach((member) => {
      if (member.type === 'group') nestedGroupIds.add(member.id);
    });
  });

  let hasCycle = false;
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const detectCycle = (groupId: string): void => {
    if (hasCycle || visited.has(groupId)) return;
    if (visiting.has(groupId)) {
      hasCycle = true;
      return;
    }
    visiting.add(groupId);
    for (const member of membersById.get(groupId) ?? []) {
      if (member.type === 'group' && byId.has(member.id)) detectCycle(member.id);
    }
    visiting.delete(groupId);
    visited.add(groupId);
  };
  groups.forEach((group) => detectCycle(group.id));

  const traverse = (rootGroupId: string): string[] => {
    const ids: string[] = [];
    const seenGroups = new Set<string>();
    const seenLayers = new Set<string>();
    const visit = (groupId: string): void => {
      if (seenGroups.has(groupId)) return;
      seenGroups.add(groupId);
      if (!byId.has(groupId)) return;
      for (const member of membersById.get(groupId) ?? []) {
        if (member.type === 'group') {
          visit(member.id);
        } else if (!seenLayers.has(member.id)) {
          seenLayers.add(member.id);
          ids.push(member.id);
        }
      }
    };
    visit(rootGroupId);
    return ids;
  };

  const descendantCache = new Map<string, readonly string[]>();
  const resolveAcyclicDescendants = (groupId: string): readonly string[] => {
    const cached = descendantCache.get(groupId);
    if (cached) return cached;
    if (!byId.has(groupId)) return [];
    const ids: string[] = [];
    const seenLayers = new Set<string>();
    for (const member of membersById.get(groupId) ?? []) {
      const memberIds = member.type === 'group' ? resolveAcyclicDescendants(member.id) : [member.id];
      for (const id of memberIds) {
        if (seenLayers.has(id)) continue;
        seenLayers.add(id);
        ids.push(id);
      }
    }
    descendantCache.set(groupId, ids);
    return ids;
  };

  return {
    byId,
    topLevelGroupIds: new Set(groups.filter((group) => !nestedGroupIds.has(group.id)).map((group) => group.id)),
    members(group) {
      return membersById.get(group.id) ?? groupMembers(group);
    },
    descendantLayerIds(groupId) {
      return hasCycle ? traverse(groupId) : resolveAcyclicDescendants(groupId);
    }
  };
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
  return descendantLayerIdsFromIndex(groupById(groups), groupId);
}

/** Reuse the lookup across roots without retaining every root's result. */
export function descendantLayerIdsFromIndex(byId: ReadonlyMap<string, DecorationGroup>, groupId: string): string[] {
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
  const movingLayers = new Set<string>();
  const movingGroups = new Set<string>();
  for (const member of movingMembers) {
    if (member.type === 'layer') movingLayers.add(member.id);
    else if (member.type === 'group') movingGroups.add(member.id);
  }

  const directGroups = groups.map((group) => {
    const members = groupMembers(group);
    if (keepGroupIds.has(group.id)) return { ...group, members };
    return {
      ...group,
      members: members.filter((member) => !(member.type === 'layer' ? movingLayers : movingGroups).has(member.id))
    };
  });

  // Descendant layer lists come from the same post-removal tree. Reuse an
  // index rather than rebuilding the ID lookup for every nested member.
  let tree: GroupTreeIndex | undefined;
  return directGroups.map((group) => {
    const members = groupMembers(group);
    const itemIds: string[] = [];
    for (const member of members) {
      if (member.type === 'layer') {
        itemIds.push(member.id);
      } else {
        tree ??= createGroupTreeIndex(directGroups);
        for (const id of tree.descendantLayerIds(member.id)) itemIds.push(id);
      }
    }
    return { ...group, members, itemIds };
  });
}

export function normalizeGroupsForRole(role: RoleDocument): DecorationGroup[] {
  const rawGroups = role.groups ?? [];
  if (rawGroups.length === 0) return [];
  const validLayerIds = new Set(role.decorations.map((item) => item.id));
  validLayerIds.add(HEAD_LAYER_ID);
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
    const itemIds: string[] = [];
    for (const member of groupMembers(group)) {
      if (member.type === 'layer') {
        if (!validLayerIds.has(member.id) || claimedLayers.has(member.id) || localLayerIds.has(member.id)) continue;
        members.push(member);
        itemIds.push(member.id);
        localLayerIds.add(member.id);
        continue;
      }

      if (member.id === group.id || claimedGroups.has(member.id)) continue;
      const child = byId.get(member.id);
      if (!child) continue;
      const normalizedChild = normalizeGroup(child);
      if (!normalizedChild || invalidGroups.has(member.id)) continue;
      members.push(member);
      // Child metadata is already normalized and final; append it where the
      // child appears to retain repeated child references and exact layer order.
      for (const id of normalizedChild.itemIds) itemIds.push(id);
    }

    normalizing.delete(group.id);
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
      // groupMembers made fresh sanitized objects, none alias the source.
      members,
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
