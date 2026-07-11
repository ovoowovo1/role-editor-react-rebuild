import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type UIEvent as ReactUIEvent
} from 'react';
import { t } from '../../i18n';
import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer, HeadLayerTransform } from '../../types/role';
import type { LayerReorderOptions } from '../../lib/editor/editorLayerDrag';
import { GroupHeaderRow, HeadRow, LayerItemRow } from './LayerRows';
import { buildLayerRowModels } from './layerListModels';
import { SelectLayerDialog } from './SelectLayerDialog';
import { useLayerListDrag } from './useLayerListDrag';
import {
  VIRTUAL_DRAG_OVERSCAN_ROWS,
  buildVirtualGeometry,
  virtualItemsInViewport,
  type VirtualLayerRow
} from './layerListVirtualization';

interface LayerListProps {
  decorations: DecorationLayer[];
  headLayer: HeadLayerTransform;
  headLayerIndex: number;
  headOptionId: string;
  groups: DecorationGroup[];
  selectedIds: string[];
  canGroupSelected: boolean;
  onSelect(id: string, additive: boolean): void;
  onSelectMany?(ids: string[]): void;
  onSelectGroup(groupId: string, additive: boolean): void;
  onGroupSelected(): void;
  onToggleGroupCollapsed(groupId: string): void;
  onToggleGroupVisibility(groupId: string): void;
  onRenameGroup(groupId: string, name: string): void;
  onUngroup(groupId: string): void;
  onReorder(activeId: string, overId: string, options?: LayerReorderOptions): void;
  onToggleVisibility(id: string): void;
  onDelete(id: string): void;
  onClearSelection(): void;
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
  onSelectMany,
  onSelectGroup,
  onGroupSelected,
  onToggleGroupCollapsed,
  onToggleGroupVisibility,
  onRenameGroup,
  onUngroup,
  onReorder,
  onToggleVisibility,
  onDelete,
  onClearSelection
}: LayerListProps) {
  const [selectItemsOpen, setSelectItemsOpen] = useState(false);
  const [scrollState, setScrollState] = useState({ scrollTop: 0, viewportHeight: 0 });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const rowModels = useMemo(
    () => buildLayerRowModels({ decorations, groups, headLayerIndex, selectedIds }),
    [decorations, groups, headLayerIndex, selectedIds]
  );

  const selectableLayerNumbers = useMemo(
    () => selectItemsOpen
      ? rowModels
        .filter((row) => row.type === 'head' || row.type === 'item')
        .map((row) => ({ number: (row.index ?? 0) + 1, id: row.type === 'head' ? HEAD_LAYER_ID : row.deco?.id ?? '' }))
        .filter((row) => row.id)
      : [],
    [rowModels, selectItemsOpen]
  );

  const handleScroll = useCallback((event: ReactUIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollState((current) => {
      const next = {
        scrollTop: target.scrollTop,
        viewportHeight: target.clientHeight
      };
      return current.scrollTop === next.scrollTop && current.viewportHeight === next.viewportHeight ? current : next;
    });
  }, []);

  const selectLayerIds = useCallback((ids: string[]) => {
    if (onSelectMany) {
      onSelectMany(ids);
    } else {
      onClearSelection();
      ids.forEach((id, index) => onSelect(id, index > 0));
    }
  }, [onClearSelection, onSelect, onSelectMany]);

  const layerCount = decorations.length + 1;
  const virtualRows = useMemo<VirtualLayerRow[]>(
    () => [
      ...rowModels,
      {
        key: 'layer-spacer',
        rowId: 'layer-spacer',
        type: 'spacer',
        selected: false
      }
    ],
    [rowModels]
  );
  const virtualGeometry = useMemo(
    () => buildVirtualGeometry(virtualRows),
    [virtualRows]
  );
  const { totalHeight, offsets, heights, rowIndexById, draggableTargets } = virtualGeometry;

  const {
    dragState,
    insertionIndicatorTop,
    joinTargetGroupId,
    dragHandlePropsForRow
  } = useLayerListDrag({
    scrollRef,
    virtualRows,
    offsets,
    heights,
    rowIndexById,
    draggableTargets,
    groups,
    onReorder
  });
  const visibleItems = useMemo(
    () =>
      virtualItemsInViewport(
        virtualRows,
        virtualGeometry,
        scrollState.scrollTop,
        scrollState.viewportHeight,
        VIRTUAL_DRAG_OVERSCAN_ROWS
      ),
    [scrollState.scrollTop, scrollState.viewportHeight, virtualGeometry, virtualRows]
  );

  const handleBlankListClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!selectedIds.length || dragState) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const interactiveTarget = target.closest('.layer-row, .layer-group, button, input, textarea, select, [role="dialog"]');
    if (interactiveTarget) return;
    onClearSelection();
  }, [dragState, onClearSelection, selectedIds.length]);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const updateSize = () => {
      setScrollState((current) => {
        const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        const scrollTop = Math.min(scrollEl.scrollTop, maxScrollTop);
        if (scrollEl.scrollTop !== scrollTop) {
          scrollEl.scrollTop = scrollTop;
        }
        const next = {
          scrollTop,
          viewportHeight: scrollEl.clientHeight
        };
        return current.scrollTop === next.scrollTop && current.viewportHeight === next.viewportHeight ? current : next;
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(scrollEl);
    return () => resizeObserver.disconnect();
  }, [totalHeight]);

  return (
    <aside className="edit-list" aria-label={t('layers.title')}>
      <div className="layer-list-title">
        <strong>{t('layers.title')}</strong>
        <span>{layerCount}</span>
      </div>
      <div className="layer-tools">
        <button
          type="button"
          data-testid="group-selected-button"
          disabled={!canGroupSelected}
          onClick={onGroupSelected}
          title={t('layers.groupTitle')}
        >
          {t('layers.group')}
        </button>
        <button
          type="button"
          onClick={() => setSelectItemsOpen(true)}
          title={t('layers.selectTitle')}
        >
          {t('layers.select')}
        </button>
        <small>{groups.length ? t('layers.hintGroups', { count: groups.length, plural: groups.length === 1 ? '' : 's' }) : t('layers.hintNoGroups')}</small>
      </div>

      <div
        ref={scrollRef}
        className="layer-list-scroll"
        data-testid="layer-list-scroll"
        title={t('layers.clearSelection')}
        onClick={handleBlankListClick}
        onScroll={handleScroll}
      >
        <div className="layer-list-virtual-space" style={{ height: totalHeight }}>
          {insertionIndicatorTop != null ? (
            <div
              className="layer-list-drop-indicator"
              style={{ transform: `translateY(${insertionIndicatorTop}px)` }}
            />
          ) : null}
          {visibleItems.map(({ row, top, height }) => (
            <div
              key={row.key}
              className="layer-list-virtual-row"
              style={{
                height,
                transform: `translateY(${top}px)`
              }}
            >
              {row.type === 'group' ? (
                <GroupHeaderRow
                  row={row}
                  isDragging={dragState?.activeRowId === row.rowId}
                  isJoinTarget={joinTargetGroupId === row.group?.id}
                  dragHandleProps={dragHandlePropsForRow(row.rowId)}
                  onSelectGroup={onSelectGroup}
                  onToggleGroupCollapsed={onToggleGroupCollapsed}
                  onToggleGroupVisibility={onToggleGroupVisibility}
                  onRenameGroup={onRenameGroup}
                  onUngroup={onUngroup}
                />
              ) : row.type === 'head' ? (
                <HeadRow
                  row={row}
                  headLayer={headLayer}
                  headOptionId={headOptionId}
                  isDragging={dragState?.activeRowId === row.rowId}
                  dragHandleProps={dragHandlePropsForRow(row.rowId)}
                  onSelect={onSelect}
                  onToggleVisibility={onToggleVisibility}
                />
              ) : row.type === 'item' && row.deco ? (
                <LayerItemRow
                  row={row}
                  isDragging={dragState?.activeRowId === row.rowId}
                  dragHandleProps={dragHandlePropsForRow(row.rowId)}
                  onSelect={onSelect}
                  onToggleVisibility={onToggleVisibility}
                  onDelete={onDelete}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <SelectLayerDialog
        open={selectItemsOpen}
        selectableLayerNumbers={selectableLayerNumbers}
        onConfirm={selectLayerIds}
        onClose={() => setSelectItemsOpen(false)}
      />
    </aside>
  );
}
