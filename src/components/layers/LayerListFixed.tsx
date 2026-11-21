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
import type { ReferenceImageLayer } from '../../types/referenceImage';
import type { LayerReorderOptions } from '../../lib/editor/editorLayerDrag';
import { GroupHeaderRow, HeadRow, LayerItemRow, ReferenceImageRow } from './LayerRows';
import {
  applyLayerSelection,
  buildLayerRowModels,
  createLayerSelectionState,
  mergeReferenceImageRows,
} from './layerListModels';
import { SelectLayerDialog } from './SelectLayerDialog';
import { useLayerListDrag } from './useLayerListDrag';
import { sameDecorationRow, sameReferenceImageRow, useStableLayerListInput } from './useStableLayerListInput';
import {
  VIRTUAL_DRAG_OVERSCAN_ROWS,
  buildVirtualGeometry,
  updateVirtualWindow,
  virtualItemsInWindow,
  type VirtualLayerRow,
  type VirtualWindow
} from './layerListVirtualization';

interface LayerListProps {
  decorations: DecorationLayer[];
  headLayer: HeadLayerTransform;
  headLayerIndex: number;
  headOptionId: string;
  groups: DecorationGroup[];
  selectedIds: string[];
  referenceImages?: ReferenceImageLayer[];
  selectedReferenceImageId?: string | null;
  layerOrder?: readonly string[];
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
  onSelectReferenceImage?(id: string): void;
  onToggleReferenceImageVisibility?(id: string): void;
  onDeleteReferenceImage?(id: string): void;
}

const EMPTY_REFERENCE_IMAGES: ReferenceImageLayer[] = [];
const EMPTY_LAYER_ORDER: readonly string[] = [];
const LAYER_SPACER: VirtualLayerRow = {
  key: 'layer-spacer',
  rowId: 'layer-spacer',
  type: 'spacer',
  selected: false
};

export function LayerList({
  decorations,
  headLayer,
  headLayerIndex,
  headOptionId,
  groups,
  selectedIds,
  referenceImages = EMPTY_REFERENCE_IMAGES,
  selectedReferenceImageId = null,
  layerOrder = EMPTY_LAYER_ORDER,
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
  onClearSelection,
  onSelectReferenceImage = () => undefined,
  onToggleReferenceImageVisibility = () => undefined,
  onDeleteReferenceImage = () => undefined
}: LayerListProps) {
  const [selectItemsOpen, setSelectItemsOpen] = useState(false);
  const [viewportWindow, setViewportWindow] = useState<VirtualWindow>(() => ({
    startIndex: 0,
    endIndex: VIRTUAL_DRAG_OVERSCAN_ROWS + 1
  }));
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const decorationRows = useStableLayerListInput(decorations, sameDecorationRow);
  const imageRows = useStableLayerListInput(referenceImages, sameReferenceImageRow);
  const rowModels = useMemo(
    () => buildLayerRowModels({ decorations: decorationRows, groups, headLayerIndex }),
    [decorationRows, groups, headLayerIndex]
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

  const selectLayerIds = useCallback((ids: string[]) => {
    if (onSelectMany) {
      onSelectMany(ids);
    } else {
      onClearSelection();
      ids.forEach((id, index) => onSelect(id, index > 0));
    }
  }, [onClearSelection, onSelect, onSelectMany]);

  const layerCount = decorations.length + 1 + referenceImages.length;
  const virtualRows = useMemo<VirtualLayerRow[]>(
    () => [...mergeReferenceImageRows(rowModels, imageRows, layerOrder), LAYER_SPACER],
    [layerOrder, imageRows, rowModels]
  );
  const virtualGeometry = useMemo(
    () => buildVirtualGeometry(virtualRows),
    [virtualRows]
  );
  const { totalHeight, offsets, heights, rowIndexById, draggableTargets } = virtualGeometry;

  const updateWindow = useCallback((scrollTop: number, viewportHeight: number) => {
    setViewportWindow((previous) => updateVirtualWindow(
      previous, virtualGeometry, scrollTop, viewportHeight, VIRTUAL_DRAG_OVERSCAN_ROWS
    ));
  }, [virtualGeometry]);

  const handleScroll = useCallback((event: ReactUIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight } = event.currentTarget;
    updateWindow(scrollTop, clientHeight);
  }, [updateWindow]);

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
  const visibleStructureItems = useMemo(
    () => virtualItemsInWindow(virtualRows, virtualGeometry, viewportWindow),
    [viewportWindow, virtualGeometry, virtualRows]
  );
  const selectionState = useMemo(
    () => createLayerSelectionState(selectedIds),
    [selectedIds]
  );
  const visibleItems = useMemo(
    () => visibleStructureItems.map((item) => item.row.type === 'spacer'
      ? item
      : {
        ...item,
        row: item.row.type === 'reference-image'
          ? (item.row.referenceImage?.id === selectedReferenceImageId ? { ...item.row, selected: true } : item.row)
          : applyLayerSelection(item.row, selectionState)
      }),
    [selectedReferenceImageId, selectionState, visibleStructureItems]
  );

  const handleBlankListClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if ((!selectedIds.length && !selectedReferenceImageId) || dragState) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const interactiveTarget = target.closest('.layer-row, .layer-group, button, input, textarea, select, [role="dialog"]');
    if (interactiveTarget) return;
    onClearSelection();
  }, [dragState, onClearSelection, selectedIds.length, selectedReferenceImageId]);

  const updateSizeRef = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const updateSize = () => {
      const viewportHeight = scrollEl.clientHeight;
      const maxScrollTop = Math.max(0, scrollEl.scrollHeight - viewportHeight);
      if (scrollEl.scrollTop > maxScrollTop) scrollEl.scrollTop = maxScrollTop;
      updateWindow(scrollEl.scrollTop, viewportHeight);
    };

    updateSizeRef.current = updateSize;
    updateSize();
  }, [updateWindow]);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const resizeObserver = new ResizeObserver(() => updateSizeRef.current());
    resizeObserver.observe(scrollEl);
    return () => resizeObserver.disconnect();
  }, []);

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
              {row.type === 'reference-image' && row.referenceImage ? (
                <ReferenceImageRow
                  row={row}
                  isDragging={dragState?.activeRowId === row.rowId}
                  dragHandleProps={dragHandlePropsForRow(row.rowId)}
                  onSelect={onSelectReferenceImage}
                  onToggleVisibility={onToggleReferenceImageVisibility}
                  onDelete={onDeleteReferenceImage}
                />
              ) : row.type === 'group' ? (
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
