import { describe, expect, it } from 'vitest';
import { PART_TABS } from '../types/role';
import { PART_TAB_I18N_KEYS, TOP_BAR_I18N_KEYS, TOP_BAR_MODES } from './tabs';

describe('tab constants', () => {
  it('keeps every part tab in the top navigation exactly once', () => {
    expect(TOP_BAR_MODES.slice(0, PART_TABS.length)).toEqual(PART_TABS);
    expect(new Set(TOP_BAR_MODES).size).toBe(TOP_BAR_MODES.length);
  });

  it('defines translation keys for every navigation mode', () => {
    expect(Object.keys(PART_TAB_I18N_KEYS).sort()).toEqual([...PART_TABS].sort());
    for (const mode of TOP_BAR_MODES) {
      expect(TOP_BAR_I18N_KEYS[mode]).toMatch(/^tabs\./);
    }
  });
});
