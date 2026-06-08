import { PART_TABS, type PartTab } from '../types/role';
import { t } from '../i18n';

export type TopBarMode = PartTab | 'colorBlock' | 'extra';

const tabI18nKeys: Record<TopBarMode, string> = {
  deco: 'tabs.deco',
  head: 'tabs.head',
  hand: 'tabs.hand',
  foot: 'tabs.foot',
  cape: 'tabs.cape',
  colorBlock: 'tabs.colorBlock',
  extra: 'tabs.extra'
};

interface TabBarProps {
  value: TopBarMode;
  onChange(tab: TopBarMode): void;
}

export function TabBar({ value, onChange }: TabBarProps) {
  return (
    <nav className="top-bar" aria-label={t('tabs.rolePart')}>
      {PART_TABS.map((tab) => (
        <button
          key={tab}
          className={`top-bar-button ${value === tab ? 'selected' : ''}`}
          type="button"
          onClick={() => onChange(tab)}
        >
          {t(tabI18nKeys[tab])}
        </button>
      ))}
      <button
        key="colorBlock"
        className={`top-bar-button ${value === 'colorBlock' ? 'selected' : ''}`}
        type="button"
        data-testid="tab-color-block-button"
        onClick={() => onChange('colorBlock')}
      >
        {t('tabs.colorBlock')}
      </button>
      <button
        key="extra"
        className={`top-bar-button ${value === 'extra' ? 'selected' : ''}`}
        type="button"
        onClick={() => onChange('extra')}
      >
        {t('tabs.extra')}
      </button>
    </nav>
  );
}
