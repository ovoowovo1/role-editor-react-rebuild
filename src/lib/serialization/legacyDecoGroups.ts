import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationGroupMember, RoleDocument } from '../../types/role';
import { descendantLayerIdsForGroup, membersForGroup, normalizeGroupsForRole } from '../editor/groupTree';
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

function normalizeItemIdsFromLegacyGroup(group: LegacyDecoGroupInput, role: RoleDocument): string[] {
  if (Array.isArray(group.itemIndexes)) {
    const byLegacyIndex = bottomToTopLayerIds(role);
    return group.itemIndexes
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < byLegacyIndex.length)
      .map((index) => byLegacyIndex[index])
      .filter((id, index, ids) => Boolean(id) && ids.indexOf(id) === index);
  }

  if (Array.isArray(group.itemIds)) {
    const valid = new Set(role.decorations.map((item) => item.id));
    valid.add(HEAD_LAYER_ID);
    return group.itemIds
      .map((value) => String(value))
      .filter((id, index, ids) => valid.has(id) && ids.indexOf(id) === index);
  }

  if (Array.isArray(group.items)) {
    const itemsAreIndexes = group.items.every((item) => typeof item === 'number' || /^\d+$/.test(String(item)));
    if (itemsAreIndexes) return normalizeItemIdsFromLegacyGroup({ itemIndexes: group.items }, role);
    return normalizeItemIdsFromLegacyGroup({ itemIds: group.items }, role);
  }

  return [];
}

function normalizeMembersFromLegacyGroup(group: LegacyDecoGroupInput, role: RoleDocument): DecorationGroupMember[] {
  if (Array.isArray(group.members)) {
    const validLayers = new Set(role.decorations.map((item) => item.id));
    validLayers.add(HEAD_LAYER_ID);
    const byLegacyIndex = bottomToTopLayerIds(role);
    return group.members
      .map((raw): DecorationGroupMember | null => {
        if (!raw || typeof raw !== 'object') return null;
        const member = raw as { type?: unknown; id?: unknown; itemIndex?: unknown };
        const id = typeof member.id === 'string' ? member.id : '';
        if (member.type === 'group') return id ? { type: 'group', id } : null;
        if (member.type !== 'layer') return null;
        if (id && validLayers.has(id)) return { type: 'layer', id };
        const itemIndex = Number(member.itemIndex);
        if (Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < byLegacyIndex.length) {
          const indexedId = byLegacyIndex[itemIndex];
          if (validLayers.has(indexedId)) return { type: 'layer', id: indexedId };
        }
        return null;
      })
      .filter((member): member is DecorationGroupMember => member !== null)
      .filter((member, index, members) => members.findIndex((item) => item.type === member.type && item.id === member.id) === index);
  }
  return normalizeItemIdsFromLegacyGroup(group, role).map((id) => ({ type: 'layer', id }));
}

function legacyMembersForExport(group: DecorationGroup, indexByLayerId: Map<string, number>): LegacyDecoGroupMember[] {
  return membersForGroup(group)
    .map((member): LegacyDecoGroupMember | null => {
      if (member.type === 'group') return { type: 'group', id: member.id };
      const itemIndex = indexByLayerId.get(member.id);
      return {
        type: 'layer',
        id: member.id,
        ...(typeof itemIndex === 'number' ? { itemIndex } : {})
      };
    })
    .filter((member): member is LegacyDecoGroupMember => member !== null);
}

export function exportLegacyDecoGroups(role: RoleDocument): LegacyDecoGroup[] {
  const indexByLayerId = new Map<string, number>();
  bottomToTopLayerIds(role).forEach((id, index) => indexByLayerId.set(id, index));

  return (role.groups ?? [])
    .map((group): LegacyDecoGroup | null => {
      const itemIndexes = descendantLayerIdsForGroup(role.groups ?? [], group.id)
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
  if (!Array.isArray(rawGroups)) return [];
  const claimedIds = new Set<string>();

  const groups = rawGroups
    .map((raw, index): DecorationGroup | null => {
      if (!raw || typeof raw !== 'object') return null;
      const group = raw as LegacyDecoGroupInput;
      const members = normalizeMembersFromLegacyGroup(group, role);
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
