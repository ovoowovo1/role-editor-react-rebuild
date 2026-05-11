import { GROUP_ROW_PREFIX, HEAD_LAYER_ID, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer } from '../../types/role';
import { descendantLayerIdsForGroup, membersForGroup, topLevelGroupIds } from '../../lib/groupTree';

interface VirtualLayerModel {
  id: string;
  rowId: string;
  type: 'item' | 'head';
  deco?: DecorationLayer;
}

export interface LayerRowModel {
  key: string;
  rowId: string;
  type: 'item' | 'group' | 'head' | 'spacer';
  deco?: DecorationLayer;
  group?: DecorationGroup;
  index?: number;
  grouped?: boolean;
  depth: number;
  selected: boolean;
  itemCount?: number;
}

function groupRowId(groupId: string): string {
  return `${GROUP_ROW_PREFIX}${groupId}`;
}

function itemRowId(itemId: string): string {
  return `${ITEM_ROW_PREFIX}${itemId}`;
}

function clampHeadLayerIndex(headLayerIndex: number | undefined, decorationCount: number): number {
  const n = typeof headLayerIndex === 'number' ? headLayerIndex : decorationCount;
  if (!Number.isFinite(n)) return decorationCount;
  return Math.max(0, Math.min(decorationCount, Math.round(n)));
}

export function buildLayerRowModels({
  decorations,
  groups,
  headLayerIndex,
  selectedIds
}: {
  decorations: DecorationLayer[];
  groups: DecorationGroup[];
  headLayerIndex: number;
  selectedIds: string[];
}): LayerRowModel[] {
  const normalizedHeadIndex = clampHeadLayerIndex(headLayerIndex, decorations.length);
  const isLargeSelection = selectedIds.length > 500;
  const selectedSet = isLargeSelection ? null : new Set(selectedIds);

  const isSelected = (id: string) => selectedSet ? selectedSet.has(id) : id === HEAD_LAYER_ID || selectedIds.length > 0;

  const virtualLayers: VirtualLayerModel[] = [];

  // Track HEAD_LAYER_ID insertion during the first pass to avoid the .some() scan.
  let headLayerAdded = false;
  decorations.forEach((deco, decorationIndex) => {
    if (decorationIndex === normalizedHeadIndex) {
      virtualLayers.push({ id: HEAD_LAYER_ID, rowId: HEAD_ROW_ID, type: 'head' });
      headLayerAdded = true;
    }
    virtualLayers.push({ id: deco.id, rowId: itemRowId(deco.id), type: 'item', deco });
  });

  if (!headLayerAdded) {
    virtualLayers.push({ id: HEAD_LAYER_ID, rowId: HEAD_ROW_ID, type: 'head' });
  }

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const directGroupByLayerId = new Map<string, DecorationGroup>();
  groups.forEach((group) => {
    membersForGroup(group).forEach((member) => {
      if (member.type === 'layer') directGroupByLayerId.set(member.id, group);
    });
  });
  const virtualLayerById = new Map(virtualLayers.map((layer) => [layer.id, layer]));
  const virtualLayerIndexById = new Map(virtualLayers.map((layer, index) => [layer.id, index]));
  const topLevelGroups = topLevelGroupIds(groups);
  const rootGroupByLayerId = new Map<string, DecorationGroup>();
  groups.forEach((group) => {
    if (!topLevelGroups.has(group.id)) return;
    descendantLayerIdsForGroup(groups, group.id).forEach((id) => rootGroupByLayerId.set(id, group));
  });

  const models: LayerRowModel[] = [];
  const renderedGroupIds = new Set<string>();
  let layerIndex = 0;

  const pushLayer = (layer: VirtualLayerModel, grouped = false, group?: DecorationGroup, depth = 0) => {
    if (layer.type === 'head') {
      models.push({
        key: `${HEAD_ROW_ID}-${grouped ? 'grouped' : 'free'}`,
        rowId: HEAD_ROW_ID,
        type: 'head',
        index: layerIndex++,
        grouped,
        group,
        depth,
        selected: isSelected(HEAD_LAYER_ID)
      });
    } else if (layer.deco) {
      models.push({
        key: `${layer.deco.id}-${grouped ? 'grouped' : 'free'}`,
        rowId: itemRowId(layer.deco.id),
        type: 'item',
        deco: layer.deco,
        index: layerIndex++,
        grouped,
        group,
        depth,
        selected: isSelected(layer.deco.id)
      });
    }
  };

  const pushGroup = (group: DecorationGroup, depth: number) => {
    if (renderedGroupIds.has(group.id)) return;
    renderedGroupIds.add(group.id);
    const descendants = descendantLayerIdsForGroup(groups, group.id);
    const selected = descendants.length > 0 && (isLargeSelection || descendants.every((id) => isSelected(id)));
    models.push({
      key: group.id,
      rowId: groupRowId(group.id),
      type: 'group',
      group,
      grouped: depth > 0,
      depth,
      selected,
      itemCount: descendants.length
    });

    if (group.collapsed) return;
    const orderedMembers = membersForGroup(group)
      .map((member, index) => ({ member, index }))
      .sort((left, right) => {
        const firstIndex = (entry: typeof left): number => {
          if (entry.member.type === 'layer') return virtualLayerIndexById.get(entry.member.id) ?? Number.MAX_SAFE_INTEGER;
          const firstDescendant = descendantLayerIdsForGroup(groups, entry.member.id)
            .map((id) => virtualLayerIndexById.get(id) ?? Number.MAX_SAFE_INTEGER)
            .sort((a, b) => a - b)[0];
          return firstDescendant ?? Number.MAX_SAFE_INTEGER;
        };
        const diff = firstIndex(left) - firstIndex(right);
        return diff || left.index - right.index;
      })
      .map((entry) => entry.member);

    orderedMembers.forEach((member) => {
      if (member.type === 'group') {
        const child = groupById.get(member.id);
        if (child) pushGroup(child, depth + 1);
        return;
      }
      const layer = virtualLayerById.get(member.id);
      if (layer) pushLayer(layer, true, group, depth + 1);
    });
  };

  virtualLayers.forEach((layer) => {
    const group = directGroupByLayerId.get(layer.id);
    if (!group) {
      const topGroup = rootGroupByLayerId.get(layer.id);
      if (topGroup) {
        pushGroup(topGroup, 0);
      } else {
        pushLayer(layer, false, undefined, 0);
      }
      return;
    }

    const rootGroup = topLevelGroups.has(group.id)
      ? group
      : rootGroupByLayerId.get(layer.id);
    if (rootGroup) pushGroup(rootGroup, 0);
  });

  return models;
}
