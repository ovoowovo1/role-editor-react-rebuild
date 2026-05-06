import { GROUP_ROW_PREFIX, HEAD_LAYER_ID, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer } from '../../types/role';

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
  const groupByLayerId = new Map<string, DecorationGroup>();
  groups.forEach((group) => group.itemIds.forEach((id) => groupByLayerId.set(id, group)));

  const layersByGroupId = new Map<string, VirtualLayerModel[]>();
  groups.forEach((group) => layersByGroupId.set(group.id, []));
  virtualLayers.forEach((layer) => {
    const group = groupByLayerId.get(layer.id);
    if (group) layersByGroupId.get(group.id)?.push(layer);
  });

  const models: LayerRowModel[] = [];
  const renderedGroupIds = new Set<string>();
  let layerIndex = 0;

  const pushLayer = (layer: VirtualLayerModel, grouped = false) => {
    if (layer.type === 'head') {
      models.push({
        key: `${HEAD_ROW_ID}-${grouped ? 'grouped' : 'free'}`,
        rowId: HEAD_ROW_ID,
        type: 'head',
        index: layerIndex++,
        grouped,
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
        selected: isSelected(layer.deco.id)
      });
    }
  };

  virtualLayers.forEach((layer) => {
    const group = groupByLayerId.get(layer.id);
    if (!group) {
      pushLayer(layer, false);
      return;
    }

    if (renderedGroupIds.has(group.id)) return;
    renderedGroupIds.add(group.id);
    const stableGroup = groupById.get(group.id) ?? group;
    const groupLayers = layersByGroupId.get(group.id) ?? [];
    const selected = groupLayers.length > 0 && (isLargeSelection || groupLayers.every((item) => isSelected(item.id)));
    models.push({
      key: stableGroup.id,
      rowId: groupRowId(stableGroup.id),
      type: 'group',
      group: stableGroup,
      selected,
      itemCount: groupLayers.length
    });

    if (!stableGroup.collapsed) {
      groupLayers.forEach((item) => pushLayer(item, true));
    }
  });

  return models;
}

