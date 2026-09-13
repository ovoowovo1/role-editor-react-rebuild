import { GROUP_ROW_PREFIX, HEAD_LAYER_ID, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer } from '../../types/role';
import { referenceImageLayerToken, type ReferenceImageLayer } from '../../types/referenceImage';
import { createGroupTreeIndex } from '../../lib/editor/groupTree';

interface VirtualLayerModel {
  id: string;
  rowId: string;
  type: 'item' | 'head';
  deco?: DecorationLayer;
}

export interface LayerRowModel {
  key: string;
  rowId: string;
  type: 'item' | 'group' | 'head' | 'reference-image' | 'spacer';
  deco?: DecorationLayer;
  group?: DecorationGroup;
  index?: number;
  grouped?: boolean;
  depth: number;
  selected: boolean;
  itemCount?: number;
  descendantIds?: readonly string[];
  referenceImage?: ReferenceImageLayer;
}

export interface LayerSelectionState {
  selectedIds: ReadonlySet<string>;
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
  headLayerIndex
}: {
  decorations: DecorationLayer[];
  groups: DecorationGroup[];
  headLayerIndex: number;
}): LayerRowModel[] {
  const normalizedHeadIndex = clampHeadLayerIndex(headLayerIndex, decorations.length);

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

  const groupTree = createGroupTreeIndex(groups);
  const groupById = groupTree.byId;
  const directGroupByLayerId = new Map<string, DecorationGroup>();
  groups.forEach((group) => {
    groupTree.members(group).forEach((member) => {
      if (member.type === 'layer') directGroupByLayerId.set(member.id, group);
    });
  });
  const virtualLayerById = new Map(virtualLayers.map((layer) => [layer.id, layer]));
  const virtualLayerIndexById = new Map(virtualLayers.map((layer, index) => [layer.id, index]));
  const topLevelGroups = groupTree.topLevelGroupIds;
  const rootGroupByLayerId = new Map<string, DecorationGroup>();
  groups.forEach((group) => {
    if (!topLevelGroups.has(group.id)) return;
    groupTree.descendantLayerIds(group.id).forEach((id) => rootGroupByLayerId.set(id, group));
  });
  const firstLayerIndexByGroupId = new Map<string, number>();
  const firstLayerIndexForGroup = (groupId: string): number => {
    const cached = firstLayerIndexByGroupId.get(groupId);
    if (cached != null) return cached;
    let firstIndex = Number.MAX_SAFE_INTEGER;
    for (const id of groupTree.descendantLayerIds(groupId)) {
      firstIndex = Math.min(firstIndex, virtualLayerIndexById.get(id) ?? Number.MAX_SAFE_INTEGER);
    }
    firstLayerIndexByGroupId.set(groupId, firstIndex);
    return firstIndex;
  };

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
        selected: false
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
        selected: false
      });
    }
  };

  const pushGroup = (group: DecorationGroup, depth: number) => {
    if (renderedGroupIds.has(group.id)) return;
    renderedGroupIds.add(group.id);
    const descendants = groupTree.descendantLayerIds(group.id);
    models.push({
      key: group.id,
      rowId: groupRowId(group.id),
      type: 'group',
      group,
      grouped: depth > 0,
      depth,
      selected: false,
      itemCount: descendants.length,
      descendantIds: descendants
    });

    if (group.collapsed) return;
    const orderedMembers = groupTree.members(group)
      .map((member, index) => ({ member, index }))
      .sort((left, right) => {
        const firstIndex = (entry: typeof left): number => {
          if (entry.member.type === 'layer') return virtualLayerIndexById.get(entry.member.id) ?? Number.MAX_SAFE_INTEGER;
          return firstLayerIndexForGroup(entry.member.id);
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

export function createLayerSelectionState(selectedIds: readonly string[]): LayerSelectionState {
  return {
    selectedIds: new Set(selectedIds)
  };
}

export function applyLayerSelection(
  row: LayerRowModel,
  selection: LayerSelectionState
): LayerRowModel {
  let selected = false;
  if (row.type === 'group') {
    const descendantIds = row.descendantIds ?? [];
    selected = descendantIds.length > 0 && descendantIds.every((id) => selection.selectedIds.has(id));
  } else if (row.type === 'head') {
    selected = selection.selectedIds.has(HEAD_LAYER_ID);
  } else if (row.type === 'item' && row.deco) {
    selected = selection.selectedIds.has(row.deco.id);
  } else if (row.type === 'reference-image') {
    return row;
  }

  return row.selected === selected ? row : { ...row, selected };
}

/**
 * Inserts session-only image rows into the visual (top-to-bottom) layer list.
 * `layerOrder` is canonical bottom-to-top, so the order is reversed for rows.
 * Images that fall inside a collapsed or expanded group are clamped to the
 * outside edge of that group; they never become group members.
 */
export function mergeReferenceImageRows(
  roleRows: LayerRowModel[],
  referenceImages: readonly ReferenceImageLayer[],
  layerOrder: readonly string[]
): LayerRowModel[] {
  if (!referenceImages.length) return roleRows;
  const imageByToken = new Map(referenceImages.map((image) => [referenceImageLayerToken(image.id), image]));
  const roleRowsByToken = new Map<string, number>();
  roleRows.forEach((row, index) => {
    if (row.type === 'head') roleRowsByToken.set(HEAD_LAYER_ID, index);
    else if (row.type === 'item' && row.deco) roleRowsByToken.set(row.deco.id, index);
  });
  const groupRanges = new Map<string, { start: number; end: number }>();
  roleRows.forEach((row, index) => {
    if (row.type !== 'group' || row.grouped) return;
    let end = index;
    while (end + 1 < roleRows.length && roleRows[end + 1].grouped) end += 1;
    if (row.group) groupRanges.set(row.group.id, { start: index, end });
  });
  const rootRangeByToken = new Map<string, { start: number; end: number }>();
  roleRows.forEach((row) => {
    if (row.type !== 'group' || row.grouped || !row.group) return;
    const range = groupRanges.get(row.group.id);
    if (!range) return;
    for (const id of row.descendantIds ?? []) rootRangeByToken.set(id, range);
  });
  const fallbackRoleOrder = roleRows
    .filter((row) => row.type === 'head' || row.type === 'item')
    .map((row) => row.type === 'head' ? HEAD_LAYER_ID : row.deco?.id)
    .filter((id): id is string => Boolean(id));
  const canonicalOrder = layerOrder.length
    ? layerOrder
    : [...fallbackRoleOrder.slice().reverse(), ...referenceImages.map((image) => referenceImageLayerToken(image.id))];
  const visualOrder = canonicalOrder.slice().reverse();
  const insertionBuckets = new Map<number, LayerRowModel[]>();
  for (let index = 0; index < visualOrder.length; index += 1) {
    const token = visualOrder[index];
    const image = imageByToken.get(token);
    if (!image) continue;
    let insertionIndex = roleRows.length;
    let previousToken: string | undefined;
    let previousRoleIndex = -1;
    for (let next = index - 1; next >= 0; next -= 1) {
      const roleIndex = roleRowsByToken.get(visualOrder[next]);
      if (roleIndex == null) continue;
      previousToken = visualOrder[next];
      previousRoleIndex = roleIndex;
      break;
    }
    let nextToken: string | undefined;
    let nextRoleIndex = -1;
    for (let next = index + 1; next < visualOrder.length; next += 1) {
      const roleIndex = roleRowsByToken.get(visualOrder[next]);
      if (roleIndex == null) continue;
      nextToken = visualOrder[next];
      nextRoleIndex = roleIndex;
      break;
    }
    const previousRange = previousToken ? rootRangeByToken.get(previousToken) : undefined;
    const nextRange = nextToken ? rootRangeByToken.get(nextToken) : undefined;
    if (previousRange && (!nextRange || nextRange !== previousRange)) {
      insertionIndex = previousRange.end + 1;
    } else if (nextRange) {
      insertionIndex = nextRange.start;
    } else if (previousRoleIndex >= 0) {
      insertionIndex = previousRoleIndex + 1;
    } else if (nextRoleIndex >= 0) {
      insertionIndex = nextRoleIndex;
    }
    const row: LayerRowModel = {
      key: `reference-image:${image.id}`,
      rowId: `reference-image:${image.id}`,
      type: 'reference-image',
      referenceImage: image,
      depth: 0,
      selected: false
    };
    const bucket = insertionBuckets.get(insertionIndex) ?? [];
    bucket.push(row);
    insertionBuckets.set(insertionIndex, bucket);
  }
  const result: LayerRowModel[] = [];
  for (let index = 0; index <= roleRows.length; index += 1) {
    result.push(...(insertionBuckets.get(index) ?? []));
    if (index < roleRows.length) result.push(roleRows[index]);
  }
  return result;
}
