import { useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, HeadLayerTransform } from '../types/role';
import { GroupHeaderRow, HeadRow, LayerItemRow } from './layers/LayerRows';
import { buildLayerRowModels } from './layers/layerListModels';

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
  const selectInputRef = useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rowModels = useMemo(
    () => buildLayerRowModels({ decorations, groups, headLayerIndex, selectedIds }),
    [decorations, groups, headLayerIndex, selectedIds]
  );

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
                  onRenameGroup={onRenameGroup}
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
