import { PART_TABS, type PartTab } from '../types/role';
import { tabLabels } from '../mock/options';
import { t } from '../i18n';

export type TopBarMode = PartTab | 'colorBlock';

const tabI18nKeys: Record<PartTab | 'colorBlock', string> = {
  deco: 'tabs.deco',
  head: 'tabs.head',
  hand: 'tabs.hand',
  foot: 'tabs.foot',
  cape: 'tabs.cape',
  colorBlock: 'tabs.colorBlock'
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
        onClick={() => onChange('colorBlock')}
      >
        {t('tabs.colorBlock')}
      </button>
    </nav>
  );
}
