import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationGroupMember, RoleDocument } from '../../types/role';
import { createGroupTreeIndex, membersForGroup, normalizeGroupsForRole } from '../editor/groupTree';
import { getHeadLayerIndex } from '../editor/layerOrdering';

export interface LegacyDecoGroup {
  id: string;
  name: string;
  visible: boolean;
  collapsed: boolean;
  itemIndexes: number[];
  members?: LegacyDecoGroupMember[];
}

interface LegacyDecoGroupInput {
  id?: unknown;
  name?: unknown;
  visible?: unknown;
  collapsed?: unknown;
  itemIndexes?: unknown;
  itemIds?: unknown;
  items?: unknown;
  members?: unknown;
}

export type LegacyDecoGroupMember =
  | { type: 'group'; id: string }
  | { type: 'layer'; id: string; itemIndex?: number };

function bottomToTopLayerIds(role: RoleDocument): string[] {
  const topFirst = role.decorations.map((item) => item.id);
  topFirst.splice(getHeadLayerIndex(role), 0, HEAD_LAYER_ID);
  return topFirst.reverse();
}

interface LegacyLayerLookup {
  byLegacyIndex: readonly string[];
  validIds: ReadonlySet<string>;
}

function normalizeItemIdsFromLegacyGroup(group: LegacyDecoGroupInput, lookup: LegacyLayerLookup): string[] {
  const seen = new Set<string>();
  if (Array.isArray(group.itemIndexes)) {
    for (const value of group.itemIndexes) {
      const index = Number(value);
      if (!Number.isInteger(index) || index < 0 || index >= lookup.byLegacyIndex.length) continue;
      const id = lookup.byLegacyIndex[index];
      if (id) seen.add(id);
    }
  } else if (Array.isArray(group.itemIds)) {
    group.itemIds.forEach((value) => {
      const id = String(value);
      if (lookup.validIds.has(id)) seen.add(id);
    });
  } else if (Array.isArray(group.items)) {
    const itemsAreIndexes = group.items.every((item) => typeof item === 'number' || /^\d+$/.test(String(item)));
    return normalizeItemIdsFromLegacyGroup(
      itemsAreIndexes ? { itemIndexes: group.items } : { itemIds: group.items }, lookup
    );
  }
  return [...seen];
}

function normalizeMembersFromLegacyGroup(group: LegacyDecoGroupInput, lookup: LegacyLayerLookup): DecorationGroupMember[] {
  if (!Array.isArray(group.members)) {
    return normalizeItemIdsFromLegacyGroup(group, lookup).map((id) => ({ type: 'layer', id }));
  }

  const members: DecorationGroupMember[] = [];
  const seenGroups = new Set<string>();
  const seenLayers = new Set<string>();
  for (const raw of group.members) {
    if (!raw || typeof raw !== 'object') continue;
    const member = raw as { type?: unknown; id?: unknown; itemIndex?: unknown };
    const id = typeof member.id === 'string' ? member.id : '';
    if (member.type === 'group') {
      if (id && !seenGroups.has(id)) {
        seenGroups.add(id);
        members.push({ type: 'group', id });
      }
      continue;
    }
    if (member.type !== 'layer') continue;
    let layerId: string | undefined;
    if (id && lookup.validIds.has(id)) {
      layerId = id;
    } else {
      const itemIndex = Number(member.itemIndex);
      if (Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < lookup.byLegacyIndex.length) {
        const indexedId = lookup.byLegacyIndex[itemIndex];
        if (lookup.validIds.has(indexedId)) layerId = indexedId;
      }
    }
    if (layerId !== undefined && !seenLayers.has(layerId)) {
      seenLayers.add(layerId);
      members.push({ type: 'layer', id: layerId });
    }
  }
  return members;
}

function legacyMembersForExport(
  group: DecorationGroup,
  indexByLayerId: Map<string, number>
): LegacyDecoGroupMember[] {
  const members: LegacyDecoGroupMember[] = [];
  const seen = new Set<string>();
  for (const member of membersForGroup(group)) {
    const key = `${member.type}\u0000${member.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (member.type === 'group') {
      members.push({ type: 'group', id: member.id });
      continue;
    }
    const itemIndex = indexByLayerId.get(member.id);
    members.push({
      type: 'layer',
      id: member.id,
      ...(typeof itemIndex === 'number' ? { itemIndex } : {})
    });
  }
  return members;
}

export function exportLegacyDecoGroups(role: RoleDocument): LegacyDecoGroup[] {
  const groups = role.groups ?? [];
  if (!groups.length) return [];
  const indexByLayerId = new Map<string, number>();
  bottomToTopLayerIds(role).forEach((id, index) => indexByLayerId.set(id, index));
  const groupIndex = createGroupTreeIndex(groups);

  return groups
    .map((group): LegacyDecoGroup | null => {
      const itemIndexes = groupIndex.descendantLayerIds(group.id)
        .map((id) => indexByLayerId.get(id))
        .filter((index): index is number => typeof index === 'number')
        .sort((a, b) => a - b);
      if (itemIndexes.length < 2) return null;
      return {
        id: group.id,
        name: group.name,
        visible: group.visible !== false,
        collapsed: group.collapsed === true,
        ...(group.members ? { members: legacyMembersForExport(group, indexByLayerId) } : {}),
        itemIndexes
      };
    })
    .filter((group): group is LegacyDecoGroup => group !== null);
}

export function normalizeLegacyDecoGroups(rawGroups: unknown, role: RoleDocument): DecorationGroup[] {
  if (!Array.isArray(rawGroups) || rawGroups.length === 0) return [];
  const byLegacyIndex = bottomToTopLayerIds(role);
  const lookup = { byLegacyIndex, validIds: new Set(byLegacyIndex) };
  const claimedIds = new Set<string>();

  const groups = rawGroups
    .map((raw, index): DecorationGroup | null => {
      if (!raw || typeof raw !== 'object') return null;
      const group = raw as LegacyDecoGroupInput;
      const members = normalizeMembersFromLegacyGroup(group, lookup);
      const cleanMembers = members.filter((member) => {
        if (member.type === 'group') return true;
        if (claimedIds.has(member.id)) return false;
        claimedIds.add(member.id);
        return true;
      });
      if (!cleanMembers.length) return null;
      const directItemIds = cleanMembers.flatMap((member) => member.type === 'layer' ? [member.id] : []);
      return {
        id: typeof group.id === 'string' && group.id ? group.id : `group_${Date.now()}_${index}`,
        name: typeof group.name === 'string' && group.name.trim() ? group.name : `Group ${index + 1}`,
        visible: group.visible !== false,
        collapsed: group.collapsed === true,
        itemIds: directItemIds,
        members: cleanMembers
      };
    })
    .filter((group): group is DecorationGroup => group !== null);
  return normalizeGroupsForRole({ ...role, groups });
}
