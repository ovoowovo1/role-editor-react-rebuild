import { useRef, type KeyboardEvent } from 'react';
import { t } from '../i18n';
import { TOP_BAR_I18N_KEYS, TOP_BAR_MODES, type TopBarMode } from '../constants/tabs';

export type { TopBarMode } from '../constants/tabs';

interface TabBarProps {
  value: TopBarMode;
  onChange(tab: TopBarMode): void;
}

export function TabBar({ value, onChange }: TabBarProps) {
  const tabListRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const currentIndex = Math.max(0, TOP_BAR_MODES.indexOf(value));
    let nextIndex = currentIndex;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TOP_BAR_MODES.length - 1;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TOP_BAR_MODES.length) % TOP_BAR_MODES.length;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TOP_BAR_MODES.length;

    const nextMode = TOP_BAR_MODES[nextIndex];
    onChange(nextMode);
    const nextButton = tabListRef.current?.querySelector<HTMLButtonElement>(`[data-tab-mode="${nextMode}"]`);
    window.requestAnimationFrame(() => nextButton?.focus());
  };

  return (
    <nav
      ref={tabListRef}
      className="top-bar"
      aria-label={t('tabs.rolePart')}
      role="tablist"
      onKeyDown={handleKeyDown}
    >
      {TOP_BAR_MODES.map((mode) => (
        <button
          key={mode}
          className={`top-bar-button ${value === mode ? 'selected' : ''}`}
          type="button"
          role="tab"
          aria-selected={value === mode}
          tabIndex={value === mode ? 0 : -1}
          data-tab-mode={mode}
          data-testid={mode === 'colorBlock' ? 'tab-color-block-button' : undefined}
          onClick={() => onChange(mode)}
        >
          {t(TOP_BAR_I18N_KEYS[mode])}
        </button>
      ))}
    </nav>
  );
}
