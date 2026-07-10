import { t } from '../../i18n';
import { formatNumber, type SourceTitleItem } from './autoCreatePanelUtils';

interface AutoCreateSourceFilterProps {
  sourceTitleItems: SourceTitleItem[];
  visibleSourceTitleItems: SourceTitleItem[];
  excludedTitleSet: ReadonlySet<string>;
  filteredOptionCount: number;
  totalOptionCount: number;
  usedTitleCount: number;
  search: string;
  running: boolean;
  onSearchChange(value: string): void;
  onUseAll(): void;
  onUseVisible(): void;
  onExcludeVisible(): void;
  onToggleTitle(title: string, enabled: boolean): void;
}

export function AutoCreateSourceFilter({
  sourceTitleItems,
  visibleSourceTitleItems,
  excludedTitleSet,
  filteredOptionCount,
  totalOptionCount,
  usedTitleCount,
  search,
  running,
  onSearchChange,
  onUseAll,
  onUseVisible,
  onExcludeVisible,
  onToggleTitle
}: AutoCreateSourceFilterProps) {
  return (
    <div className="extra-section auto-create-source-filter">
      <div className="extra-section-title">{t('autoCreate.section.sourceFilter')}</div>
      <div className="auto-create-filter-summary">
        <span>{t('autoCreate.filter.sourceSummary', { enabled: filteredOptionCount, total: totalOptionCount })}</span>
        <span>{t('autoCreate.filter.titleSummary', { enabled: usedTitleCount, total: sourceTitleItems.length })}</span>
      </div>
      <input
        className="auto-create-filter-search"
        type="search"
        value={search}
        disabled={running}
        placeholder={t('autoCreate.filter.searchPlaceholder')}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
      />
      <div className="auto-create-filter-actions">
        <button type="button" className="primary-button subtle" disabled={running || excludedTitleSet.size === 0} onClick={onUseAll}>
          {t('autoCreate.filter.useAll')}
        </button>
        <button type="button" className="primary-button subtle" disabled={running || visibleSourceTitleItems.length === 0} onClick={onUseVisible}>
          {t('autoCreate.filter.useVisible')}
        </button>
        <button type="button" className="primary-button subtle" disabled={running || visibleSourceTitleItems.length === 0} onClick={onExcludeVisible}>
          {t('autoCreate.filter.excludeVisible')}
        </button>
      </div>
      <div className="auto-create-title-list" role="list" aria-label={t('autoCreate.filter.listLabel')}>
        {visibleSourceTitleItems.length ? (
          visibleSourceTitleItems.map((item) => {
            const checked = !excludedTitleSet.has(item.title);
            return (
              <label key={item.title} role="listitem" className={checked ? 'auto-create-title-row' : 'auto-create-title-row excluded'} title={item.title}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={running}
                  onChange={(event) => onToggleTitle(item.title, event.currentTarget.checked)}
                />
                <span className="auto-create-title-name">{item.title}</span>
                <span className="auto-create-title-count">{formatNumber(item.count)}</span>
              </label>
            );
          })
        ) : (
          <div className="auto-create-title-empty">{t('autoCreate.filter.noMatch')}</div>
        )}
      </div>
      {filteredOptionCount === 0 ? (
        <div className="extra-message warning auto-create-filter-warning">{t('autoCreate.filter.emptyWarning')}</div>
      ) : null}
    </div>
  );
}
