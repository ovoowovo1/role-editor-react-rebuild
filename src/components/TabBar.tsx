import { PART_TABS, type PartTab } from '../types/role';
import { tabLabels } from '../mock/options';

export type TopBarMode = PartTab | 'colorBlock';

interface TabBarProps {
  value: TopBarMode;
  onChange(tab: TopBarMode): void;
}

export function TabBar({ value, onChange }: TabBarProps) {
  return (
    <nav className="top-bar" aria-label="Role part tabs">
      {PART_TABS.map((tab) => (
        <button
          key={tab}
          className={`top-bar-button ${value === tab ? 'selected' : ''}`}
          type="button"
          onClick={() => onChange(tab)}
        >
          {tabLabels[tab]}
        </button>
      ))}
      <button
        key="colorBlock"
        className={`top-bar-button ${value === 'colorBlock' ? 'selected' : ''}`}
        type="button"
        onClick={() => onChange('colorBlock')}
      >
        Color Block
      </button>
    </nav>
  );
}
