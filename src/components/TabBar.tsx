import { PART_TABS, type PartTab } from '../types/role';
import { tabLabels } from '../mock/options';

interface TabBarProps {
  value: PartTab;
  onChange(tab: PartTab): void;
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
    </nav>
  );
}
