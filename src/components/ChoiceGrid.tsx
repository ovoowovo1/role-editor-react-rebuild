import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PartOption, PartTab } from '../types/role';
import { PART_TAB_I18N_KEYS } from '../constants/tabs';
import { t } from '../i18n';
import { AssetPreview } from './AssetPreview';
import {
  CHOICE_ROW_HEIGHT,
  initialChoiceGridViewport,
  resizeChoiceGridViewport,
  updateChoiceGridViewport
} from './choiceGridViewport';

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

export const ChoiceGrid = memo(function ChoiceGrid({ tab, options, selectedOptionId, onPick }: ChoiceGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(initialChoiceGridViewport);
  const { columns, firstRow: startIndex, lastRowExclusive } = viewport;

  useLayoutEffect(() => {
    const node = parentRef.current;
    if (!node) return;
    const update = () => {
      const { clientWidth, clientHeight, scrollTop } = node;
      setViewport((previous) => resizeChoiceGridViewport(previous, clientWidth, clientHeight, scrollTop));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(options.length / columns);
  const totalHeight = rowCount * CHOICE_ROW_HEIGHT;
  const endIndex = Math.min(rowCount, lastRowExclusive);
  const rows: VirtualRow[] = useMemo(
    () =>
      Array.from({ length: Math.max(endIndex - startIndex, 0) }, (_, offset) => {
        const index = startIndex + offset;
        return { index, key: `${tab}-${index}`, start: index * CHOICE_ROW_HEIGHT };
      }),
    [endIndex, startIndex, tab]
  );

  const visibleSummary = useMemo(() => {
    const hasGaf = options.some((option) => option.source === 'gaf');
    return hasGaf ? t('choices.assetCountGaf', { count: options.length }) : t('choices.assetCountMock', { count: options.length });
  }, [options]);

  return (
    <section
      className="choice-list"
      aria-label={t('choices.choices', { tab: t(PART_TAB_I18N_KEYS[tab]) })}
      ref={parentRef}
      onScroll={(event) => {
        const { scrollTop } = event.currentTarget;
        setViewport((previous) => updateChoiceGridViewport(previous, scrollTop, previous.columns, previous.viewportHeight));
      }}
    >
      <div className="choice-list-header">
        <strong>{t(PART_TAB_I18N_KEYS[tab])}</strong>
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
              style={{ transform: `translateY(${virtualRow.start}px)`, height: CHOICE_ROW_HEIGHT }}
            >
              {rowItems.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`choice-block ${selectedOptionId === option.id ? 'selected' : ''}`}
                  title={`${option.label} (${option.code})`}
                  onClick={() => onPick(option)}
                >
                  <span className="choice-preview">
                    <AssetPreview option={option} size={46} />
                  </span>
                  <span className="choice-label">{option.label.replace(/\s+/g, ' ')}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
});
