import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent as ReactUIEvent
} from 'react';
import { t } from '../../i18n';
import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer, HeadLayerTransform } from '../../types/role';
import type { LayerReorderOptions } from '../../lib/editor/editorLayerDrag';
import { GroupHeaderRow, HeadRow, LayerItemRow } from './LayerRows';
import { buildLayerRowModels } from './layerListModels';
import {
  VIRTUAL_DRAG_OVERSCAN_ROWS,
  VIRTUAL_OVERSCAN_ROWS,
  buildVirtualItems,
  canJoinTargetGroup,
  closestDraggableTarget,
  dropStateForTarget,
  nextDraggableRowId,
  parseLayerNumberInput,
  type LayerDragState,
  type VirtualLayerRow,
  type VirtualLayout
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
  const [selectInputValue, setSelectInputValue] = useState('');
  const [selectInputError, setSelectInputError] = useState('');
  const [scrollState, setScrollState] = useState({ scrollTop: 0, viewportHeight: 0 });
  const [dragState, setDragState] = useState<LayerDragState | null>(null);
  const selectInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<LayerDragState | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const latestPointerYRef = useRef(0);
  const autoScrollFrameRef = useRef<number | null>(null);

  const rowModels = useMemo(
    () => buildLayerRowModels({ decorations, groups, headLayerIndex, selectedIds }),
    [decorations, groups, headLayerIndex, selectedIds]
  );

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const selectableLayerNumbers = useMemo(
    () =>
      rowModels
        .filter((row) => row.type === 'head' || row.type === 'item')
        .map((row) => ({ number: (row.index ?? 0) + 1, id: row.type === 'head' ? HEAD_LAYER_ID : row.deco?.id ?? '' }))
        .filter((row) => row.id),
    [rowModels]
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
      setSelectInputError(t('layers.enterOne'));
      return;
    }
    if (missing.length) {
      setSelectInputError(t('layers.layerNotFound', { missing: missing.join(', ') }));
      return;
    }

    const ids = numbers.map((number) => idByNumber.get(number)).filter((id): id is string => Boolean(id));
    if (onSelectMany) {
      onSelectMany(ids);
    } else {
      onClearSelection();
      ids.forEach((id, index) => onSelect(id, index > 0));
    }
    setSelectInputError('');
    setSelectItemsOpen(false);
  };

  const handleSelectInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') handleSelectItemsConfirm();
    if (event.key === 'Escape') setSelectItemsOpen(false);
  };

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
  const virtualLayout: VirtualLayout = useMemo(
    () =>
      buildVirtualItems(
        virtualRows,
        scrollState.scrollTop,
        scrollState.viewportHeight,
        dragState ? VIRTUAL_DRAG_OVERSCAN_ROWS : VIRTUAL_OVERSCAN_ROWS
      ),
    [!!dragState, scrollState.scrollTop, scrollState.viewportHeight, virtualRows]
  );
  const { totalHeight, visibleItems, offsets, heights, rowIndexById, draggableTargets } = virtualLayout;

  const scrollRowIntoView = useCallback(
    (rowId: string) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const index = rowIndexById.get(rowId) ?? -1;
      if (index < 0) return;
      const top = offsets[index];
      const bottom = top + heights[index];
      if (top < scrollEl.scrollTop) {
        scrollEl.scrollTop = top;
      } else if (bottom > scrollEl.scrollTop + scrollEl.clientHeight) {
        scrollEl.scrollTop = bottom - scrollEl.clientHeight;
      }
    },
    [heights, offsets, rowIndexById]
  );

  const updatePointerOver = useCallback(
    (clientY: number) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const rect = scrollEl.getBoundingClientRect();
      const virtualY = clientY - rect.top + scrollEl.scrollTop;
      const target = closestDraggableTarget(draggableTargets, virtualY);
      if (!target) return;
      const currentDrag = dragStateRef.current;
      const dropState = dropStateForTarget(
        target,
        virtualY,
        'pointer',
        currentDrag ? canJoinTargetGroup(currentDrag.activeRowId, target, groups) : false,
        currentDrag?.activeRowId,
        groups
      );
      setDragState((current) => {
        if (
          !current ||
          (
            current.overRowId === dropState.overRowId &&
            current.intent === dropState.intent &&
            current.placement === dropState.placement &&
            current.joinGroupId === dropState.joinGroupId &&
            current.parentGroupId === dropState.parentGroupId &&
            current.anchorGroupId === dropState.anchorGroupId
          )
        ) {
          return current;
        }
        const next = {
          ...current,
          overRowId: dropState.overRowId,
          intent: dropState.intent,
          placement: dropState.placement,
          joinGroupId: dropState.joinGroupId,
          parentGroupId: dropState.parentGroupId,
          anchorGroupId: dropState.anchorGroupId
        };
        dragStateRef.current = next;
        return next;
      });
    },
    [draggableTargets, groups]
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current != null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current != null) return;

    const tick = () => {
      const scrollEl = scrollRef.current;
      if (!scrollEl || dragPointerIdRef.current == null) {
        autoScrollFrameRef.current = null;
        return;
      }

      const rect = scrollEl.getBoundingClientRect();
      const y = latestPointerYRef.current;
      const edgeSize = Math.min(64, rect.height / 3);
      const topDistance = y - rect.top;
      const bottomDistance = rect.bottom - y;
      let delta = 0;

      if (topDistance < edgeSize) {
        delta = -Math.ceil((edgeSize - topDistance) / 4);
      } else if (bottomDistance < edgeSize) {
        delta = Math.ceil((edgeSize - bottomDistance) / 4);
      }

      if (delta !== 0) {
        scrollEl.scrollTop += delta;
        updatePointerOver(y);
        autoScrollFrameRef.current = requestAnimationFrame(tick);
      } else {
        autoScrollFrameRef.current = null;
      }
    };

    autoScrollFrameRef.current = requestAnimationFrame(tick);
  }, [updatePointerOver]);

  const finishPointerDrag = useCallback(
    (commit: boolean) => {
      stopAutoScroll();
      dragPointerIdRef.current = null;
      dragHandleRef.current = null;
      const current = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      if (commit && current && current.activeRowId !== current.overRowId) {
        onReorder(current.activeRowId, current.overRowId, {
          intent: current.intent,
          placement: current.placement,
          parentGroupId: current.parentGroupId,
          anchorGroupId: current.anchorGroupId
        });
      }
    },
    [onReorder, stopAutoScroll]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      latestPointerYRef.current = event.clientY;
      updatePointerOver(event.clientY);
      startAutoScroll();
    },
    [startAutoScroll, updatePointerOver]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      finishPointerDrag(true);
    },
    [finishPointerDrag]
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      finishPointerDrag(false);
    },
    [finishPointerDrag]
  );

  const startPointerDrag = useCallback(
    (rowId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      dragPointerIdRef.current = event.pointerId;
      dragHandleRef.current = event.currentTarget;
      latestPointerYRef.current = event.clientY;
      const next = { activeRowId: rowId, overRowId: rowId, mode: 'pointer' as const, intent: 'sort' as const };
      dragStateRef.current = next;
      setDragState(next);
    },
    []
  );

  const startKeyboardDrag = useCallback((rowId: string) => {
    const next = { activeRowId: rowId, overRowId: rowId, mode: 'keyboard' as const, intent: 'sort' as const };
    dragStateRef.current = next;
    setDragState(next);
    scrollRowIntoView(rowId);
  }, [scrollRowIntoView]);

  const cancelKeyboardDrag = useCallback(() => {
    dragStateRef.current = null;
    setDragState(null);
  }, []);

  const commitKeyboardDrag = useCallback(() => {
    const current = dragStateRef.current;
    dragStateRef.current = null;
    setDragState(null);
    if (current && current.activeRowId !== current.overRowId) {
      onReorder(current.activeRowId, current.overRowId, {
        intent: current.intent,
        placement: current.placement,
        parentGroupId: current.parentGroupId,
        anchorGroupId: current.anchorGroupId
      });
    }
  }, [onReorder]);

  const moveKeyboardTarget = useCallback(
    (direction: 1 | -1) => {
      const current = dragStateRef.current;
      if (!current) return;
      const currentIndex = rowIndexById.get(current.overRowId) ?? -1;
      const nextRowId = nextDraggableRowId(virtualRows, currentIndex, direction);
      if (!nextRowId) return;
      const next = {
        ...current,
        overRowId: nextRowId,
        intent: 'sort' as const,
        placement: undefined,
        joinGroupId: undefined,
        parentGroupId: undefined,
        anchorGroupId: undefined
      };
      dragStateRef.current = next;
      setDragState(next);
      scrollRowIntoView(nextRowId);
    },
    [rowIndexById, scrollRowIntoView, virtualRows]
  );

  const dragHandlePropsForRow = useCallback(
    (rowId: string) => ({
      'aria-pressed': dragState?.activeRowId === rowId,
      tabIndex: 0,
      onClick: (event: ReactMouseEvent<HTMLButtonElement>) => event.stopPropagation(),
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => startPointerDrag(rowId, event),
      onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (!dragState) {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            startKeyboardDrag(rowId);
          }
          return;
        }

        if (dragState.activeRowId !== rowId) return;
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveKeyboardTarget(-1);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveKeyboardTarget(1);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          commitKeyboardDrag();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancelKeyboardDrag();
        }
      }
    }),
    [cancelKeyboardDrag, commitKeyboardDrag, dragState, moveKeyboardTarget, startKeyboardDrag, startPointerDrag]
  );

  const insertionIndicatorTop = useMemo(() => {
    if (!dragState) return null;
    const activeIndex = rowIndexById.get(dragState.activeRowId) ?? -1;
    const overIndex = rowIndexById.get(dragState.overRowId) ?? -1;
    if (overIndex < 0) return null;
    const overTop = offsets[overIndex];
    const overBottom = overTop + heights[overIndex];
    if (dragState.intent === 'join-group' && !dragState.placement) return null;
    if (dragState.placement === 'before') return overTop;
    if (dragState.placement === 'after') return overBottom;
    return activeIndex >= 0 && activeIndex < overIndex ? overBottom : overTop;
  }, [dragState, heights, offsets, rowIndexById]);

  const joinTargetGroupId = dragState?.intent === 'join-group' && !dragState.placement ? dragState.joinGroupId : undefined;

  useEffect(() => {
    if (dragState?.mode !== 'pointer') return;
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [dragState?.mode, handlePointerCancel, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

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
        <button type="button" disabled={!canGroupSelected} onClick={onGroupSelected} title={t('layers.groupTitle')}>
          {t('layers.group')}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectInputError('');
            setSelectItemsOpen(true);
            window.setTimeout(() => selectInputRef.current?.focus(), 0);
          }}
          title={t('layers.selectTitle')}
        >
          {t('layers.select')}
        </button>
        <small>{groups.length ? t('layers.hintGroups', { count: groups.length, plural: groups.length === 1 ? '' : 's' }) : t('layers.hintNoGroups')}</small>
      </div>

      <div ref={scrollRef} className="layer-list-scroll" onScroll={handleScroll}>
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
              ) : (
                <button className="layer-spacer" type="button" onClick={onClearSelection}>
                  {decorations.length ? t('layers.clearSelection') : t('layers.addDeco')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

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
              {t('layers.selectItems')}
            </h3>
            <label style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <span>{t('layers.itemNumbers')}</span>
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
              {t('layers.selectHelp')}
            </p>
            {selectInputError ? <p style={{ color: '#ffb4b4', fontSize: 12, marginTop: 8 }}>{selectInputError}</p> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setSelectItemsOpen(false)}>
                {t('layers.cancel')}
              </button>
              <button type="button" onClick={handleSelectItemsConfirm}>
                {t('layers.selectButton')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
