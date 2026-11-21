import { membersForGroup } from '../../lib/editor/groupTree';
import type { DecorationGroup } from '../../types/role';

export interface LayerDragGroupQueries {
  group(groupId: string): DecorationGroup | undefined;
  parentGroup(groupId: string): DecorationGroup | undefined;
  containsLayer(group: DecorationGroup, layerId: string): boolean;
  isDescendant(ancestorId: string, candidateId: string): boolean;
}

/** Index immutable groups lazily; flat-list drags do not need any group work. */
export function createLayerDragGroupQueries(groups: DecorationGroup[]): LayerDragGroupQueries {
  function buildIndex() {
    const firstGroup = new Map<string, DecorationGroup>();
    const parentIdByGroupId = new Map<string, string>();
    const childGroupIds = new Map<string, string[]>();
    for (const group of groups) {
      if (!firstGroup.has(group.id)) firstGroup.set(group.id, group);
      const children: string[] = [];
      for (const member of membersForGroup(group)) {
        if (member.type !== 'group') continue;
        children.push(member.id);
        if (!parentIdByGroupId.has(member.id)) parentIdByGroupId.set(member.id, group.id);
      }
      // First match for parent lookups, last-added group for ancestry, as in
      // the editor's corresponding group-tree helpers.
      childGroupIds.set(group.id, children);
    }
    return { firstGroup, parentIdByGroupId, childGroupIds };
  }
  let index: ReturnType<typeof buildIndex> | undefined;
  const memberIdsByGroup = new WeakMap<DecorationGroup, Set<string>>();
  function getIndex() {
    return index ??= buildIndex();
  }

  // Pointer drag queries one active ancestor against many target groups.
  // Hold only the current ancestor's closure, not a potentially quadratic
  // all-pairs cache. The Set also prevents loops in a malformed group cycle.
  let activeAncestorId: string | undefined;
  let descendants = new Set<string>();

  return {
    group(groupId) {
      return getIndex().firstGroup.get(groupId);
    },
    parentGroup(groupId) {
      const { firstGroup, parentIdByGroupId } = getIndex();
      const parentId = parentIdByGroupId.get(groupId);
      return parentId ? firstGroup.get(parentId) : undefined;
    },
    containsLayer(group, layerId) {
      let members = memberIdsByGroup.get(group);
      if (!members) {
        members = new Set();
        for (const member of membersForGroup(group)) {
          if (member.type === 'layer') members.add(member.id);
        }
        memberIdsByGroup.set(group, members);
      }
      return members.has(layerId);
    },
    isDescendant(ancestorId, candidateId) {
      if (activeAncestorId !== ancestorId) {
        const { childGroupIds } = getIndex();
        activeAncestorId = ancestorId;
        descendants = new Set();
        const visit = [ancestorId];
        for (let i = 0; i < visit.length; i++) {
          const children = childGroupIds.get(visit[i]) ?? [];
          for (const child of children) {
            if (descendants.has(child)) continue;
            descendants.add(child);
            visit.push(child);
          }
        }
      }
      return descendants.has(candidateId);
    }
  };
}
