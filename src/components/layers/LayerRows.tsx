import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from 'react';
import { t } from '../../i18n';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { optionById } from '../../mock/options';
import type { HeadLayerTransform } from '../../types/role';
import { AssetPreview } from '../AssetPreview';
import type { LayerRowModel } from './layerListModels';

type DragHandleProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed' | 'onClick' | 'onKeyDown' | 'onPointerDown' | 'tabIndex'
>;

export function LayerItemRow({
  row,
  isDragging = false,
  dragHandleProps,
  onSelect,
  onToggleVisibility,
  onDelete
}: {
  row: LayerRowModel;
  isDragging?: boolean;
  dragHandleProps?: DragHandleProps;
  onSelect(id: string, additive: boolean): void;
  onToggleVisibility(id: string): void;
  onDelete(id: string): void;
}) {
  const deco = row.deco!;
  const option = optionById[deco.assetId];

  return (
    <div
      className={`layer-row ${row.grouped ? 'group-child' : ''} ${row.selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${!deco.visible ? 'muted' : ''}`}
      style={{ '--layer-depth': row.depth } as CSSProperties}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelect(deco.id, event.ctrlKey || event.metaKey)}
      data-layer-id={deco.id}
      data-testid={`layer-row-${deco.id}`}
    >
      <button className="drag-handle" type="button" data-testid={`layer-drag-${deco.id}`} {...dragHandleProps} title={t('layer.dragHandle')}>
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
        data-testid={`layer-visibility-${deco.id}`}
        title={deco.visible ? t('layer.hide') : t('layer.show')}
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
        data-testid={`layer-delete-${deco.id}`}
        title={t('layer.delete')}
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
  isDragging = false,
  dragHandleProps,
  onSelect,
  onToggleVisibility
}: {
  row: LayerRowModel;
  headLayer: HeadLayerTransform;
  headOptionId: string;
  isDragging?: boolean;
  dragHandleProps?: DragHandleProps;
  onSelect(id: string, additive: boolean): void;
  onToggleVisibility(id: string): void;
}) {
  const option = optionById[headOptionId];

  return (
    <div
      className={`layer-row head-layer ${row.grouped ? 'group-child' : ''} ${row.selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${headLayer.visible === false ? 'muted' : ''}`}
      style={{ '--layer-depth': row.depth } as CSSProperties}
      data-layer-id="head"
      data-testid="layer-row-head"
      title={t('layer.headTitle')}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelect(HEAD_LAYER_ID, event.ctrlKey || event.metaKey)}
    >
      <button className="drag-handle" type="button" data-testid="layer-drag-head" {...dragHandleProps} title={t('layer.headDrag')}>
        ⋮⋮
      </button>
      <div className="layer-badge">{(row.index ?? 0) + 1}</div>
      <div className="layer-thumb">
        <AssetPreview option={option} size={50} />
      </div>
      <div className="layer-meta">
        <strong>{t('layer.headName')}</strong>
        <span>{t('layer.headSubtitle')}</span>
      </div>
      <button
        className="layer-icon-button"
        type="button"
        data-testid="layer-visibility-head"
        title={headLayer.visible === false ? t('layer.headShow') : t('layer.headHide')}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleVisibility(HEAD_LAYER_ID);
        }}
      >
        {headLayer.visible === false ? '○' : '◉'}
      </button>
      <button className="layer-delete" type="button" data-testid="layer-delete-head" disabled title={t('layer.headCantDelete')}>
        ×
      </button>
    </div>
  );
}

export function GroupHeaderRow({
  row,
  isDragging = false,
  isJoinTarget = false,
  dragHandleProps,
  onSelectGroup,
  onToggleGroupCollapsed,
  onToggleGroupVisibility,
  onRenameGroup,
  onUngroup
}: {
  row: LayerRowModel;
  isDragging?: boolean;
  isJoinTarget?: boolean;
  dragHandleProps?: DragHandleProps;
  onSelectGroup(groupId: string, additive: boolean): void;
  onToggleGroupCollapsed(groupId: string): void;
  onToggleGroupVisibility(groupId: string): void;
  onRenameGroup(groupId: string, name: string): void;
  onUngroup(groupId: string): void;
}) {
  const group = row.group!;
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(group.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraftName(group.name);
  }, [editing, group.name]);

  useEffect(() => {
    if (editing) {
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing]);

  const startEditing = () => {
    setDraftName(group.name);
    setEditing(true);
  };

  const commitEditing = () => {
    const trimmed = draftName.trim();
    setEditing(false);
    if (trimmed && trimmed !== group.name) onRenameGroup(group.id, trimmed);
    else setDraftName(group.name);
  };

  const cancelEditing = () => {
    setDraftName(group.name);
    setEditing(false);
  };

  const handleEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') commitEditing();
    if (event.key === 'Escape') cancelEditing();
  };

  return (
    <div
      className={`layer-group ${row.selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isJoinTarget ? 'join-target' : ''} ${group.visible === false ? 'muted' : ''}`}
      style={{ '--layer-depth': row.depth } as CSSProperties}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => onSelectGroup(group.id, event.ctrlKey || event.metaKey)}
      data-group-id={group.id}
      data-testid={`group-row-${group.id}`}
      data-depth={Math.min(row.depth, 4)}
    >
      <button className="group-drag-handle" type="button" data-testid={`group-drag-${group.id}`} {...dragHandleProps} title={t('layer.groupDrag')}>
        ⋮⋮
      </button>
      <button
        className="group-toggle"
        type="button"
        data-testid={`group-toggle-${group.id}`}
        title={group.collapsed ? t('layer.groupExpand') : t('layer.groupCollapse')}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleGroupCollapsed(group.id);
        }}
      >
        {group.collapsed ? '▸' : '▾'}
      </button>
      <div className="group-meta">
        {editing ? (
          <input
            ref={inputRef}
            className="group-name-input"
            data-testid={`group-name-input-${group.id}`}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={handleEditKeyDown}
            onBlur={commitEditing}
            aria-label={t('layer.groupName')}
          />
        ) : (
          <strong onDoubleClick={(event) => {
            event.stopPropagation();
            startEditing();
          }}>
            {group.name}
          </strong>
        )}
        <span>{t('layer.groupLayers', { count: row.itemCount ?? 0, plural: (row.itemCount ?? 0) === 1 ? '' : 's' })}</span>
      </div>
      <button
        className="group-edit"
        type="button"
        data-testid={`group-edit-${group.id}`}
        title={t('layer.rename')}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          startEditing();
        }}
      >
        {t('layer.edit')}
      </button>
      <button
        className="layer-icon-button"
        type="button"
        data-testid={`group-visibility-${group.id}`}
        title={group.visible === false ? t('layer.groupShow') : t('layer.groupHide')}
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
        data-testid={`group-ungroup-${group.id}`}
        title={t('layer.ungroup')}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onUngroup(group.id);
        }}
      >
        {t('layer.ungroup')}
      </button>
    </div>
  );
}
