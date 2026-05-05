import type { MouseEvent as ReactMouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { optionById } from '../../mock/options';
import type { HeadLayerTransform } from '../../types/role';
import { AssetPreview } from '../AssetPreview';
import type { LayerRowModel } from './layerListModels';

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

export function LayerItemRow({
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

export function HeadRow({
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

export function GroupHeaderRow({
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

