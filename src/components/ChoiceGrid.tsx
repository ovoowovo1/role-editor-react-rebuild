import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PartOption, PartTab } from '../types/role';
import { tabLabels } from '../mock/options';
import { AssetPreview } from './AssetPreview';

interface ChoiceGridProps {
  tab: PartTab;
  options: PartOption[];
  selectedOptionId?: string;
  onPick(option: PartOption): void;
}

interface VirtualRow {
  index: number;
  key: string;
  start: number;
}

const ITEM_WIDTH = 86;
const ROW_HEIGHT = 86;
const OVERSCAN_ROWS = 6;

export function ChoiceGrid({ tab, options, selectedOptionId, onPick }: ChoiceGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(4);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);

  useLayoutEffect(() => {
    const node = parentRef.current;
    if (!node) return;
    const update = () => {
      setColumns(Math.max(2, Math.floor(node.clientWidth / ITEM_WIDTH)));
      setViewportHeight(node.clientHeight || 520);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(options.length / columns);
  const totalHeight = rowCount * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const endIndex = Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_ROWS);
  const rows: VirtualRow[] = useMemo(
    () =>
      Array.from({ length: Math.max(endIndex - startIndex, 0) }, (_, offset) => {
        const index = startIndex + offset;
        return { index, key: `${tab}-${index}`, start: index * ROW_HEIGHT };
      }),
    [endIndex, startIndex, tab]
  );

  const visibleSummary = useMemo(() => {
    const gafCount = options.filter((option) => option.source === 'gaf').length;
    return gafCount ? `${options.length} GAF symbols` : `${options.length} mock assets`;
  }, [options]);

  return (
    <section
      className="choice-list"
      aria-label={`${tabLabels[tab]} choices`}
      ref={parentRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="choice-list-header">
        <strong>{tabLabels[tab]}</strong>
        <span>{visibleSummary}</span>
      </div>
      <div className="choice-virtual-space" style={{ height: totalHeight }}>
        {rows.map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowItems = options.slice(start, start + columns);
          return (
            <div
              key={virtualRow.key}
              className="choice-row"
              style={{ transform: `translateY(${virtualRow.start}px)`, height: ROW_HEIGHT }}
            >
              {rowItems.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`choice-block ${selectedOptionId === option.id ? 'selected' : ''}`}
                  title={`${option.label} (${option.code})`}
                  onClick={() => onPick(option)}
                >
                  <AssetPreview option={option} size={50} />
                  {option.source === 'gaf' && <small className="asset-source-badge">GAF</small>}
                  <span>{option.label.replace(/\s+/g, ' ')}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
