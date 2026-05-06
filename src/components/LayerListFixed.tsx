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
import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, HeadLayerTransform } from '../types/role';
import { GroupHeaderRow, HeadRow, LayerItemRow } from './layers/LayerRows';
import { buildLayerRowModels, type LayerRowModel } from './layers/layerListModels';

const ITEM_ROW_HEIGHT = 77;
const GROUP_ROW_HEIGHT = 60;
const SPACER_ROW_HEIGHT = 98;
const VIRTUAL_OVERSCAN_ROWS = 8;
const VIRTUAL_DRAG_OVERSCAN_ROWS = 20;

type VirtualLayerRow = LayerRowModel | {
  key: string;
  rowId: string;
  type: 'spacer';
  selected: false;
};

interface VirtualRenderItem {
  row: VirtualLayerRow;
  index: number;
  top: number;
  height: number;
}

interface VirtualLayout {
  totalHeight: number;
  visibleItems: VirtualRenderItem[];
  offsets: number[];
  heights: number[];
}

interface LayerDragState {
  activeRowId: string;
  overRowId: string;
  mode: 'pointer' | 'keyboard';
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

function layerRowHeight(row: VirtualLayerRow): number {
  if (row.type === 'group') return GROUP_ROW_HEIGHT;
  if (row.type === 'spacer') return SPACER_ROW_HEIGHT;
  return ITEM_ROW_HEIGHT;
}

function isDraggableRow(row: VirtualLayerRow): row is LayerRowModel {
  return row.type !== 'spacer';
}

function buildVirtualItems(rows: VirtualLayerRow[], scrollTop: number, viewportHeight: number, overscanRows: number): {
  totalHeight: number;
  visibleItems: VirtualRenderItem[];
  offsets: number[];
  heights: number[];
} {
  const offsets: number[] = [];
  const heights: number[] = [];
  let totalHeight = 0;

  rows.forEach((row) => {
    const height = layerRowHeight(row);
    offsets.push(totalHeight);
    heights.push(height);
    totalHeight += height;
  });

  const viewportBottom = scrollTop + Math.max(viewportHeight, 1);
  let startIndex = 0;
  while (startIndex < rows.length && offsets[startIndex] + heights[startIndex] < scrollTop) {
    startIndex += 1;
  }
  startIndex = Math.max(0, startIndex - overscanRows);

  let endIndex = startIndex;
  while (endIndex < rows.length && offsets[endIndex] <= viewportBottom) {
    endIndex += 1;
  }
  endIndex = Math.min(rows.length, endIndex + overscanRows);

  const visibleItems: VirtualRenderItem[] = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    visibleItems.push({
      row: rows[index],
      index,
      top: offsets[index],
      height: heights[index]
    });
  }

  return { totalHeight, visibleItems, offsets, heights };
}

function closestDraggableRowId(rows: VirtualLayerRow[], offsets: number[], heights: number[], virtualY: number): string | null {
  let closestId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  rows.forEach((row, index) => {
    if (!isDraggableRow(row)) return;
    const center = offsets[index] + heights[index] / 2;
    const distance = Math.abs(center - virtualY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestId = row.rowId;
    }
  });

  return closestId;
}

function rowIndexById(rows: VirtualLayerRow[], rowId: string): number {
  return rows.findIndex((row) => row.rowId === rowId);
}

function nextDraggableRowId(rows: VirtualLayerRow[], startIndex: number, direction: 1 | -1): string | null {
  for (let index = startIndex + direction; index >= 0 && index < rows.length; index += direction) {
    const row = rows[index];
    if (isDraggableRow(row)) return row.rowId;
  }
  return null;
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
  onSelectMany?(ids: string[]): void;
  onSelectGroup(groupId: string, additive: boolean): void;
  onGroupSelected(): void;
  onToggleGroupCollapsed(groupId: string): void;
  onToggleGroupVisibility(groupId: string): void;
  onRenameGroup(groupId: string, name: string): void;
  onUngroup(groupId: string): void;
  onReorder(activeId: string, overId: string): void;
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
      setSelectInputError('Please enter at least one item number.');
      return;
    }
    if (missing.length) {
      setSelectInputError(`Layer number not found: ${missing.join(', ')}`);
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
  const { totalHeight, visibleItems, offsets, heights } = virtualLayout;

  const scrollRowIntoView = useCallback(
    (rowId: string) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const index = rowIndexById(virtualRows, rowId);
      if (index < 0) return;
      const top = offsets[index];
      const bottom = top + heights[index];
      if (top < scrollEl.scrollTop) {
        scrollEl.scrollTop = top;
      } else if (bottom > scrollEl.scrollTop + scrollEl.clientHeight) {
        scrollEl.scrollTop = bottom - scrollEl.clientHeight;
      }
    },
    [heights, offsets, virtualRows]
  );

  const updatePointerOver = useCallback(
    (clientY: number) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const rect = scrollEl.getBoundingClientRect();
      const virtualY = clientY - rect.top + scrollEl.scrollTop;
      const overRowId = closestDraggableRowId(virtualRows, offsets, heights, virtualY);
      if (!overRowId) return;
      setDragState((current) => {
        if (!current || current.overRowId === overRowId) return current;
        const next = { ...current, overRowId };
        dragStateRef.current = next;
        return next;
      });
    },
    [heights, offsets, virtualRows]
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
        onReorder(current.activeRowId, current.overRowId);
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
      const next = { activeRowId: rowId, overRowId: rowId, mode: 'pointer' as const };
      dragStateRef.current = next;
      setDragState(next);
    },
    []
  );

  const startKeyboardDrag = useCallback((rowId: string) => {
    const next = { activeRowId: rowId, overRowId: rowId, mode: 'keyboard' as const };
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
      onReorder(current.activeRowId, current.overRowId);
    }
  }, [onReorder]);

  const moveKeyboardTarget = useCallback(
    (direction: 1 | -1) => {
      const current = dragStateRef.current;
      if (!current) return;
      const currentIndex = rowIndexById(virtualRows, current.overRowId);
      const nextRowId = nextDraggableRowId(virtualRows, currentIndex, direction);
      if (!nextRowId) return;
      const next = { ...current, overRowId: nextRowId };
      dragStateRef.current = next;
      setDragState(next);
      scrollRowIntoView(nextRowId);
    },
    [scrollRowIntoView, virtualRows]
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
    const activeIndex = rowIndexById(virtualRows, dragState.activeRowId);
    const overIndex = rowIndexById(virtualRows, dragState.overRowId);
    if (overIndex < 0) return null;
    const overTop = offsets[overIndex];
    const overBottom = overTop + heights[overIndex];
    return activeIndex >= 0 && activeIndex < overIndex ? overBottom : overTop;
  }, [dragState, heights, offsets, virtualRows]);

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
                  {decorations.length ? 'Click empty area to clear selection' : 'Add a Deco to create more layers'}
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
              Enter item numbers separated by commas or ranges, for example 1-5,8,9.
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
