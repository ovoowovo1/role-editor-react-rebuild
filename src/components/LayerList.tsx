import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DecorationGroup, DecorationLayer, HeadLayerTransform } from '../types/role';
import { optionById } from '../mock/options';
import { AssetPreview } from './AssetPreview';

const GROUP_ROW_PREFIX = 'group:';
const ITEM_ROW_PREFIX = 'item:';
const HEAD_ROW_ID = 'head:singleton';
export const HEAD_LAYER_ID = '__head_layer__';

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

interface LayerListProps {
  decorations: DecorationLayer[];
  headLayer: HeadLayerTransform;
  headLayerIndex: number;
  headOptionId: string;
  groups: DecorationGroup[];
  selectedIds: string[];
  canGroupSelected: boolean;
  onSelect(id: string, additive: boolean): void;
  onSelectGroup(groupId: string, additive: boolean): void;
  onGroupSelected(): void;
  onToggleGroupCollapsed(groupId: string): void;
  onToggleGroupVisibility(groupId: string): void;
  onUngroup(groupId: string): void;
  onReorder(activeId: string, overId: string): void;
  onToggleVisibility(id: string): void;
  onDelete(id: string): void;
  onClearSelection(): void;
}

interface SortableLayerProps {
  deco: DecorationLayer;
  index: number;
  selected: boolean;
  grouped?: boolean;
  onSelect(id: string, additive: boolean): void;
  onToggleVisibility(id: string): void;
  onDelete(id: string): void;
}

interface HeadLayerRowProps {
  headLayer: HeadLayerTransform;
  headOptionId: string;
  index: number;
  selected: boolean;
  grouped?: boolean;
  onSelect(id: string, additive: boolean): void;
  onToggleVisibility(id: string): void;
}

interface SortableGroupHeaderProps {
  group: DecorationGroup;
  itemCount: number;
  selected: boolean;
  onSelectGroup(groupId: string, additive: boolean): void;
  onToggleGroupCollapsed(groupId: string): void;
  onToggleGroupVisibility(groupId: string): void;
  onUngroup(groupId: string): void;
}

interface VirtualLayerModel {
  id: string;
  rowId: string;
  type: 'item' | 'head';
  deco?: DecorationLayer;
}

interface LayerRowModel {
  key: string;
  rowId: string;
  type: 'item' | 'group' | 'head';
  deco?: DecorationLayer;
  group?: DecorationGroup;
  index?: number;
  grouped?: boolean;
  selected: boolean;
  itemCount?: number;
}

const ROW_HEIGHT = 78;
const OVERSCAN_ROWS = 10;

function SortableLayer({ deco, index, selected, grouped = false, onSelect, onToggleVisibility, onDelete }: SortableLayerProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: itemRowId(deco.id) });
  const option = optionById[deco.assetId];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`layer-row ${grouped ? 'group-child' : ''} ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${!deco.visible ? 'muted' : ''}`}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelect(deco.id, event.ctrlKey || event.metaKey)}
      data-layer-id={deco.id}
    >
      <button className="drag-handle" type="button" {...attributes} {...listeners} title="Drag layer to reorder or move between groups">
        ⋮⋮
      </button>
      <div className="layer-badge">{index + 1}</div>
      <div className="layer-thumb">
        <AssetPreview option={option} size={50} />
      </div>
      <div className="layer-meta">
        <strong>{deco.name}</strong>
        <span>{deco.code}</span>
      </div>
      <button
        className="layer-icon-button"
        type="button"
        title={deco.visible ? 'Hide layer' : 'Show layer'}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleVisibility(deco.id);
        }}
      >
        {deco.visible ? '◉' : '○'}
      </button>
      <button
        className="layer-delete"
        type="button"
        title="Delete layer"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onDelete(deco.id);
        }}
      >
        ×
      </button>
    </div>
  );
}

function HeadLayerRow({ headLayer, headOptionId, index, selected, grouped = false, onSelect, onToggleVisibility }: HeadLayerRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: HEAD_ROW_ID });
  const option = optionById[headOptionId];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`layer-row head-layer ${grouped ? 'group-child' : ''} ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${headLayer.visible === false ? 'muted' : ''}`}
      data-layer-id="head"
      title="Head is a singleton virtual layer from the original RoleDeco HEAD_CODE entry"
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelect(HEAD_LAYER_ID, event.ctrlKey || event.metaKey)}
    >
      <button className="drag-handle" type="button" {...attributes} {...listeners} title="Drag Head layer to change its order or move it into groups">
        ⋮⋮
      </button>
      <div className="layer-badge">{index + 1}</div>
      <div className="layer-thumb">
        <AssetPreview option={option} size={50} />
      </div>
      <div className="layer-meta">
        <strong>Head</strong>
        <span>head · singleton</span>
      </div>
      <button
        className="layer-icon-button"
        type="button"
        title={headLayer.visible === false ? 'Show Head layer' : 'Hide Head layer'}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleVisibility(HEAD_LAYER_ID);
        }}
      >
        {headLayer.visible === false ? '○' : '◉'}
      </button>
      <button className="layer-delete" type="button" disabled title="Head cannot be deleted or duplicated">
        ×
      </button>
    </div>
  );
}

function SortableGroupHeader({
  group,
  itemCount,
  selected,
  onSelectGroup,
  onToggleGroupCollapsed,
  onToggleGroupVisibility,
  onUngroup
}: SortableGroupHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: groupRowId(group.id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`layer-group ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${group.visible === false ? 'muted' : ''}`}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelectGroup(group.id, event.ctrlKey || event.metaKey)}
      data-group-id={group.id}
    >
      <button className="group-drag-handle" type="button" {...attributes} {...listeners} title="Drag group as one block">
        ⋮⋮
      </button>
      <button
        className="group-toggle"
        type="button"
        title={group.collapsed ? 'Expand group' : 'Collapse group'}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleGroupCollapsed(group.id);
        }}
      >
        {group.collapsed ? '▸' : '▾'}
      </button>
      <div className="group-meta">
        <strong>{group.name}</strong>
        <span>{itemCount} layer{itemCount === 1 ? '' : 's'}</span>
      </div>
      <button
        className="layer-icon-button"
        type="button"
        title={group.visible === false ? 'Show group' : 'Hide group'}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleGroupVisibility(group.id);
        }}
      >
        {group.visible === false ? '○' : '◉'}
      </button>
      <button
        className="group-ungroup"
        type="button"
        title="Ungroup"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onUngroup(group.id);
        }}
      >
        Ungroup
      </button>
    </div>
  );
}

export function LayerList({
  decorations,
  headLayer,
  headLayerIndex,
  headOptionId,
  groups,
  selectedIds,
  canGroupSelected,
  onSelect,
  onSelectGroup,
  onGroupSelected,
  onToggleGroupCollapsed,
  onToggleGroupVisibility,
  onUngroup,
  onReorder,
  onToggleVisibility,
  onDelete,
  onClearSelection
}: LayerListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  useLayoutEffect(() => {
    const node = parentRef.current;
    if (!node) return;
    const update = () => setViewportHeight(node.clientHeight || 520);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rowModels = useMemo(() => {
    const normalizedHeadIndex = clampHeadLayerIndex(headLayerIndex, decorations.length);
    const virtualLayers: VirtualLayerModel[] = [];

    decorations.forEach((deco, decorationIndex) => {
      if (decorationIndex === normalizedHeadIndex) {
        virtualLayers.push({ id: HEAD_LAYER_ID, rowId: HEAD_ROW_ID, type: 'head' });
      }
      virtualLayers.push({ id: deco.id, rowId: itemRowId(deco.id), type: 'item', deco });
    });

    if (!virtualLayers.some((layer) => layer.id === HEAD_LAYER_ID)) {
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

    const renderedGroupIds = new Set<string>();
    const models: LayerRowModel[] = [];

    virtualLayers.forEach((layer) => {
      const group = groupByLayerId.get(layer.id);
      if (!group) {
        if (layer.type === 'head') {
          models.push({
            key: HEAD_ROW_ID,
            rowId: HEAD_ROW_ID,
            type: 'head',
            index: models.length,
            selected: selectedSet.has(HEAD_LAYER_ID)
          });
        } else if (layer.deco) {
          models.push({
            key: layer.deco.id,
            rowId: itemRowId(layer.deco.id),
            type: 'item',
            deco: layer.deco,
            index: models.length,
            selected: selectedSet.has(layer.deco.id)
          });
        }
        return;
      }

      if (renderedGroupIds.has(group.id)) return;
      renderedGroupIds.add(group.id);
      const stableGroup = groupById.get(group.id) ?? group;
      const groupLayers = layersByGroupId.get(group.id) ?? [];
      const selected = groupLayers.length > 0 && groupLayers.every((item) => selectedSet.has(item.id));
      models.push({
        key: stableGroup.id,
        rowId: groupRowId(stableGroup.id),
        type: 'group',
        group: stableGroup,
        selected,
        itemCount: groupLayers.length
      });

      if (!stableGroup.collapsed) {
        for (const item of groupLayers) {
          if (item.type === 'head') {
            models.push({
              key: HEAD_ROW_ID,
              rowId: HEAD_ROW_ID,
              type: 'head',
              index: models.length,
              grouped: true,
              selected: selectedSet.has(HEAD_LAYER_ID)
            });
          } else if (item.deco) {
            models.push({
              key: item.deco.id,
              rowId: itemRowId(item.deco.id),
              type: 'item',
              deco: item.deco,
              index: models.length,
              grouped: true,
              selected: selectedSet.has(item.deco.id)
            });
          }
        }
      }
    });

    return models;
  }, [decorations, groups, headLayerIndex, selectedSet]);

  const totalRows = rowModels.length + 1;
  const totalHeight = totalRows * ROW_HEIGHT;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_ROWS);
  const visibleRows = rowModels.slice(startRow, Math.min(endRow, rowModels.length));
  const visibleRowIds = visibleRows.map((row) => row.rowId);
  const layerCount = decorations.length + 1;

  return (
    <aside className="edit-list" aria-label="Layer list">
      <div className="layer-list-title">
        <strong>Layers</strong>
        <span>{layerCount}</span>
      </div>
      <div className="layer-tools">
        <button type="button" disabled={!canGroupSelected} onClick={onGroupSelected} title="Create group from selected ungrouped layers">
          Group
        </button>
        <small>{groups.length ? `${groups.length} group${groups.length === 1 ? '' : 's'} · drag header to move group` : 'Head is a singleton layer · Ctrl / Cmd click for multi-select'}</small>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleRowIds} strategy={verticalListSortingStrategy}>
          <div className="layer-list-scroll" ref={parentRef} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
            <div className="layer-list-virtual-space" style={{ height: totalHeight }}>
              {visibleRows.map((row, offset) => {
                const rowIndex = startRow + offset;
                const top = rowIndex * ROW_HEIGHT;
                return (
                  <div key={row.key} className="layer-list-virtual-row" style={{ top, height: ROW_HEIGHT }}>
                    {row.type === 'head' ? (
                      <HeadLayerRow
                        headLayer={headLayer}
                        headOptionId={headOptionId}
                        index={row.index ?? rowIndex}
                        selected={row.selected}
                        grouped={row.grouped}
                        onSelect={onSelect}
                        onToggleVisibility={onToggleVisibility}
                      />
                    ) : row.type === 'group' && row.group ? (
                      <SortableGroupHeader
                        group={row.group}
                        itemCount={row.itemCount ?? 0}
                        selected={row.selected}
                        onSelectGroup={onSelectGroup}
                        onToggleGroupCollapsed={onToggleGroupCollapsed}
                        onToggleGroupVisibility={onToggleGroupVisibility}
                        onUngroup={onUngroup}
                      />
                    ) : row.deco ? (
                      <SortableLayer
                        deco={row.deco}
                        index={row.index ?? 0}
                        selected={row.selected}
                        grouped={row.grouped}
                        onSelect={onSelect}
                        onToggleVisibility={onToggleVisibility}
                        onDelete={onDelete}
                      />
                    ) : null}
                  </div>
                );
              })}
              {endRow > rowModels.length ? (
                <div className="layer-list-virtual-row" style={{ top: rowModels.length * ROW_HEIGHT, height: ROW_HEIGHT }}>
                  <button className="layer-spacer" type="button" onClick={onClearSelection}>
                    {decorations.length ? 'Click empty area to clear selection' : 'Add a Deco to create more layers'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </aside>
  );
}
