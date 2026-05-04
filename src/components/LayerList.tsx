import type { MouseEvent as ReactMouseEvent } from 'react';
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
import type { DecorationGroup, DecorationLayer } from '../types/role';
import { optionById } from '../mock/options';
import { AssetPreview } from './AssetPreview';

const GROUP_ROW_PREFIX = 'group:';
const ITEM_ROW_PREFIX = 'item:';

function groupRowId(groupId: string): string {
  return `${GROUP_ROW_PREFIX}${groupId}`;
}

function itemRowId(itemId: string): string {
  return `${ITEM_ROW_PREFIX}${itemId}`;
}

interface LayerListProps {
  decorations: DecorationLayer[];
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

interface SortableGroupHeaderProps {
  group: DecorationGroup;
  itemCount: number;
  selected: boolean;
  onSelectGroup(groupId: string, additive: boolean): void;
  onToggleGroupCollapsed(groupId: string): void;
  onToggleGroupVisibility(groupId: string): void;
  onUngroup(groupId: string): void;
}

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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const selectedSet = new Set(selectedIds);
  const decoById = new Map(decorations.map((deco) => [deco.id, deco]));
  const groupByItemId = new Map<string, DecorationGroup>();
  groups.forEach((group) => group.itemIds.forEach((id) => groupByItemId.set(id, group)));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  const renderedGroupIds = new Set<string>();
  const rowIds: string[] = [];
  const rows: JSX.Element[] = [];

  decorations.forEach((deco, index) => {
    const group = groupByItemId.get(deco.id);
    if (!group) {
      rowIds.push(itemRowId(deco.id));
      rows.push(
        <SortableLayer
          key={deco.id}
          deco={deco}
          index={index}
          selected={selectedSet.has(deco.id)}
          onSelect={onSelect}
          onToggleVisibility={onToggleVisibility}
          onDelete={onDelete}
        />
      );
      return;
    }

    if (renderedGroupIds.has(group.id)) return;
    renderedGroupIds.add(group.id);
    const groupItems = decorations.filter((item) => group.itemIds.includes(item.id));
    const selected = groupItems.length > 0 && groupItems.every((item) => selectedSet.has(item.id));
    rowIds.push(groupRowId(group.id));
    rows.push(
      <SortableGroupHeader
        key={group.id}
        group={group}
        itemCount={groupItems.length}
        selected={selected}
        onSelectGroup={onSelectGroup}
        onToggleGroupCollapsed={onToggleGroupCollapsed}
        onToggleGroupVisibility={onToggleGroupVisibility}
        onUngroup={onUngroup}
      />
    );

    if (!group.collapsed) {
      groupItems.forEach((item) => {
        rowIds.push(itemRowId(item.id));
        rows.push(
          <SortableLayer
            key={item.id}
            deco={item}
            index={decorations.findIndex((candidate) => candidate.id === item.id)}
            selected={selectedSet.has(item.id)}
            grouped
            onSelect={onSelect}
            onToggleVisibility={onToggleVisibility}
            onDelete={onDelete}
          />
        );
      });
    }
  });

  return (
    <aside className="edit-list" aria-label="Layer list">
      <div className="layer-list-title">
        <strong>Layers</strong>
        <span>{decorations.length}</span>
      </div>
      <div className="layer-tools">
        <button type="button" disabled={!canGroupSelected} onClick={onGroupSelected} title="Create group from selected ungrouped layers">
          Group
        </button>
        <small>{groups.length ? `${groups.length} group${groups.length === 1 ? '' : 's'} · drag header to move group` : 'Ctrl / Cmd click for multi-select'}</small>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="layer-list-scroll">
            {rows}
            <button className="layer-spacer" type="button" onClick={onClearSelection}>
              {decorations.length ? 'Click empty area to clear selection' : 'Add a Deco to create layers'}
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </aside>
  );
}
