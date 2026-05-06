import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationGroup, RoleDocument } from '../types/role';
import { getHeadLayerIndex } from './layerOrdering';

export interface LegacyDecoGroup {
  id: string;
  name: string;
  visible: boolean;
  collapsed: boolean;
  itemIndexes: number[];
}

interface LegacyDecoGroupInput {
  id?: unknown;
  name?: unknown;
  visible?: unknown;
  collapsed?: unknown;
  itemIndexes?: unknown;
  itemIds?: unknown;
  items?: unknown;
}

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

export function exportLegacyDecoGroups(role: RoleDocument): LegacyDecoGroup[] {
  const indexByLayerId = new Map<string, number>();
  bottomToTopLayerIds(role).forEach((id, index) => indexByLayerId.set(id, index));

  return (role.groups ?? [])
    .map((group): LegacyDecoGroup | null => {
      const itemIndexes = group.itemIds
        .map((id) => indexByLayerId.get(id))
        .filter((index): index is number => typeof index === 'number')
        .sort((a, b) => a - b);
      if (itemIndexes.length < 2) return null;
      return {
        id: group.id,
        name: group.name,
        visible: group.visible !== false,
        collapsed: group.collapsed === true,
        itemIndexes
      };
    })
    .filter((group): group is LegacyDecoGroup => group !== null);
}

export function normalizeLegacyDecoGroups(rawGroups: unknown, role: RoleDocument): DecorationGroup[] {
  if (!Array.isArray(rawGroups)) return [];
  const claimedIds = new Set<string>();

  return rawGroups
    .map((raw, index): DecorationGroup | null => {
      if (!raw || typeof raw !== 'object') return null;
      const group = raw as LegacyDecoGroupInput;
      const itemIds = normalizeItemIdsFromLegacyGroup(group, role).filter((id) => !claimedIds.has(id));
      if (itemIds.length < 2) return null;
      itemIds.forEach((id) => claimedIds.add(id));
      return {
        id: typeof group.id === 'string' && group.id ? group.id : `group_${Date.now()}_${index}`,
        name: typeof group.name === 'string' && group.name.trim() ? group.name : `Group ${index + 1}`,
        visible: group.visible !== false,
        collapsed: group.collapsed === true,
        itemIds
      };
    })
    .filter((group): group is DecorationGroup => group !== null);
}
