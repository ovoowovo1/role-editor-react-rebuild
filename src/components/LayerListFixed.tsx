import { useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
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

export const HEAD_LAYER_ID = '__head_layer__';

const GROUP_ROW_PREFIX = 'group:';
const ITEM_ROW_PREFIX = 'item:';
const HEAD_ROW_ID = 'head:singleton';

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

function parseLayerNumberInput(value: string): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  const parts = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (!parts.length) return [];

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) throw new Error(`Invalid range: ${part}`);
      const step = start <= end ? 1 : -1;
      for (let current = start; current !== end + step; current += step) {
        if (!seen.has(current)) {
          seen.add(current);
          result.push(current);
        }
      }
      continue;
    }

    if (!/^\d+$/.test(part)) throw new Error(`Invalid item number: ${part}`);
    const number = Number(part);
    if (!Number.isInteger(number) || number < 1) throw new Error(`Invalid item number: ${part}`);
    if (!seen.has(number)) {
      seen.add(number);
      result.push(number);
    }
  }

  return result;
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

interface VirtualLayerModel {
  id: string;
  rowId: string;
  type: 'item' | 'head';
  deco?: DecorationLayer;
}

interface LayerRowModel {
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

function useDragStyle(rowId: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowId });
  return {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    style: {
      transform: CSS.Transform.toString(transform),
      transition
    }
  };
}

function LayerItemRow({
  row,
  onSelect,
  onToggleVisibility,
  onDelete
}: {
  row: LayerRowModel;
  onSelect(id: string, additive: boolean): void;
  onToggleVisibility(id: string): void;
  onDelete(id: string): void;
}) {
  const deco = row.deco!;
  const option = optionById[deco.assetId];
  const drag = useDragStyle(row.rowId);

  return (
    <div
      ref={drag.setNodeRef}
      style={drag.style}
      className={`layer-row ${row.grouped ? 'group-child' : ''} ${row.selected ? 'selected' : ''} ${drag.isDragging ? 'dragging' : ''} ${!deco.visible ? 'muted' : ''}`}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelect(deco.id, event.ctrlKey || event.metaKey)}
      data-layer-id={deco.id}
    >
      <button className="drag-handle" type="button" {...drag.attributes} {...drag.listeners} title="Drag layer to reorder or move between groups">
        ⋮⋮
      </button>
      <div className="layer-badge">{(row.index ?? 0) + 1}</div>
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

function HeadRow({
  row,
  headLayer,
  headOptionId,
  onSelect,
  onToggleVisibility
}: {
  row: LayerRowModel;
  headLayer: HeadLayerTransform;
  headOptionId: string;
  onSelect(id: string, additive: boolean): void;
  onToggleVisibility(id: string): void;
}) {
  const option = optionById[headOptionId];
  const drag = useDragStyle(row.rowId);

  return (
    <div
      ref={drag.setNodeRef}
      style={drag.style}
      className={`layer-row head-layer ${row.grouped ? 'group-child' : ''} ${row.selected ? 'selected' : ''} ${drag.isDragging ? 'dragging' : ''} ${headLayer.visible === false ? 'muted' : ''}`}
      data-layer-id="head"
      title="Head is a singleton virtual layer from the original RoleDeco HEAD_CODE entry"
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelect(HEAD_LAYER_ID, event.ctrlKey || event.metaKey)}
    >
      <button className="drag-handle" type="button" {...drag.attributes} {...drag.listeners} title="Drag Head layer to change its order or move it into groups">
        ⋮⋮
      </button>
      <div className="layer-badge">{(row.index ?? 0) + 1}</div>
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

function GroupHeaderRow({
  row,
  onSelectGroup,
  onToggleGroupCollapsed,
  onToggleGroupVisibility,
  onUngroup
}: {
  row: LayerRowModel;
  onSelectGroup(groupId: string, additive: boolean): void;
  onToggleGroupCollapsed(groupId: string): void;
  onToggleGroupVisibility(groupId: string): void;
  onUngroup(groupId: string): void;
}) {
  const group = row.group!;
  const drag = useDragStyle(row.rowId);

  return (
    <div
      ref={drag.setNodeRef}
      style={drag.style}
      className={`layer-group ${row.selected ? 'selected' : ''} ${drag.isDragging ? 'dragging' : ''} ${group.visible === false ? 'muted' : ''}`}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelectGroup(group.id, event.ctrlKey || event.metaKey)}
      data-group-id={group.id}
    >
      <button className="group-drag-handle" type="button" {...drag.attributes} {...drag.listeners} title="Drag group as one block">
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
        <span>{row.itemCount ?? 0} layer{(row.itemCount ?? 0) === 1 ? '' : 's'}</span>
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
  const [selectItemsOpen, setSelectItemsOpen] = useState(false);
  const [selectInputValue, setSelectInputValue] = useState('');
  const [selectInputError, setSelectInputError] = useState('');
  const selectInputRef = useRef<HTMLInputElement | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rowModels = useMemo(() => {
    const normalizedHeadIndex = clampHeadLayerIndex(headLayerIndex, decorations.length);
    const virtualLayers: VirtualLayerModel[] = [];

    decorations.forEach((deco, decorationIndex) => {
      if (decorationIndex === normalizedHeadIndex) virtualLayers.push({ id: HEAD_LAYER_ID, rowId: HEAD_ROW_ID, type: 'head' });
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
          selected: selectedSet.has(HEAD_LAYER_ID)
        });
      } else if (layer.deco) {
        models.push({
          key: `${layer.deco.id}-${grouped ? 'grouped' : 'free'}`,
          rowId: itemRowId(layer.deco.id),
          type: 'item',
          deco: layer.deco,
          index: layerIndex++,
          grouped,
          selected: selectedSet.has(layer.deco.id)
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
        groupLayers.forEach((item) => pushLayer(item, true));
      }
    });

    return models;
  }, [decorations, groups, headLayerIndex, selectedSet]);

  const selectableLayerNumbers = useMemo(
    () =>
      rowModels
        .filter((row) => row.type === 'head' || row.type === 'item')
        .map((row) => ({ number: (row.index ?? 0) + 1, id: row.type === 'head' ? HEAD_LAYER_ID : row.deco?.id ?? '' }))
        .filter((row) => row.id),
    [rowModels]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  const handleSelectItemsConfirm = () => {
    let numbers: number[];
    try {
      numbers = parseLayerNumberInput(selectInputValue);
    } catch (error) {
      setSelectInputError(error instanceof Error ? error.message : String(error));
      return;
    }

    const idByNumber = new Map(selectableLayerNumbers.map((item) => [item.number, item.id]));
    const missing = numbers.filter((number) => !idByNumber.has(number));
    if (!numbers.length) {
      setSelectInputError('Please enter at least one item number.');
      return;
    }
    if (missing.length) {
      setSelectInputError(`Layer number not found: ${missing.join(', ')}`);
      return;
    }

    const ids = numbers.map((number) => idByNumber.get(number)).filter((id): id is string => Boolean(id));
    onClearSelection();
    ids.forEach((id, index) => onSelect(id, index > 0));
    setSelectInputError('');
    setSelectItemsOpen(false);
  };

  const handleSelectInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') handleSelectItemsConfirm();
    if (event.key === 'Escape') setSelectItemsOpen(false);
  };

  const layerCount = decorations.length + 1;
  const sortableRowIds = rowModels.map((row) => row.rowId);

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
        <button
          type="button"
          onClick={() => {
            setSelectInputError('');
            setSelectItemsOpen(true);
            window.setTimeout(() => selectInputRef.current?.focus(), 0);
          }}
          title="Select layers by item number, for example 1,2,3 or 1-5"
        >
          Select
        </button>
        <small>{groups.length ? `${groups.length} group${groups.length === 1 ? '' : 's'} · drag header to move group` : 'Head is a singleton layer · Ctrl / Cmd click for multi-select'}</small>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableRowIds} strategy={verticalListSortingStrategy}>
          <div className="layer-list-scroll">
            {rowModels.map((row) =>
              row.type === 'group' ? (
                <GroupHeaderRow
                  key={row.key}
                  row={row}
                  onSelectGroup={onSelectGroup}
                  onToggleGroupCollapsed={onToggleGroupCollapsed}
                  onToggleGroupVisibility={onToggleGroupVisibility}
                  onUngroup={onUngroup}
                />
              ) : row.type === 'head' ? (
                <HeadRow
                  key={row.key}
                  row={row}
                  headLayer={headLayer}
                  headOptionId={headOptionId}
                  onSelect={onSelect}
                  onToggleVisibility={onToggleVisibility}
                />
              ) : row.deco ? (
                <LayerItemRow
                  key={row.key}
                  row={row}
                  onSelect={onSelect}
                  onToggleVisibility={onToggleVisibility}
                  onDelete={onDelete}
                />
              ) : null
            )}
            <button className="layer-spacer" type="button" onClick={onClearSelection}>
              {decorations.length ? 'Click empty area to clear selection' : 'Add a Deco to create more layers'}
            </button>
          </div>
        </SortableContext>
      </DndContext>

      {selectItemsOpen ? (
        <div
          role="presentation"
          onClick={() => setSelectItemsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.45)'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="select-items-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(420px, calc(100vw - 32px))',
              borderRadius: 12,
              border: '1px solid rgba(174, 244, 255, 0.45)',
              background: 'linear-gradient(#08384a, #02141d)',
              boxShadow: '0 18px 60px rgba(0, 0, 0, 0.45)',
              color: 'white',
              padding: 18
            }}
          >
            <h3 id="select-items-title" style={{ margin: '0 0 14px', fontSize: 18 }}>
              Select Items
            </h3>
            <label style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <span>Item Numbers (e.g. 1,2,3 or 1-5)</span>
              <input
                ref={selectInputRef}
                value={selectInputValue}
                onChange={(event) => {
                  setSelectInputValue(event.target.value);
                  setSelectInputError('');
                }}
                onKeyDown={handleSelectInputKeyDown}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  border: '1px solid rgba(174, 244, 255, 0.45)',
                  background: 'rgba(0, 0, 0, 0.32)',
                  color: 'white',
                  outline: 'none',
                  padding: '10px 12px'
                }}
              />
            </label>
            <p style={{ marginTop: 10, fontSize: '0.8em', color: 'rgba(232, 252, 255, 0.8)' }}>
              輸入以逗號分隔的圖層編號或範圍（例如 1-5,8,9）。
            </p>
            {selectInputError ? <p style={{ color: '#ffb4b4', fontSize: 12, marginTop: 8 }}>{selectInputError}</p> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setSelectItemsOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={handleSelectItemsConfirm}>
                Select
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
