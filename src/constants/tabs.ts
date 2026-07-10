import { PART_TABS, type PartTab } from '../types/role';

export type TopBarMode = PartTab | 'colorBlock' | 'extra';

export const PART_TAB_I18N_KEYS: Record<PartTab, string> = {
  deco: 'tabs.deco',
  head: 'tabs.head',
  hand: 'tabs.hand',
  foot: 'tabs.foot',
  cape: 'tabs.cape'
};

export const TOP_BAR_I18N_KEYS: Record<TopBarMode, string> = {
  ...PART_TAB_I18N_KEYS,
  colorBlock: 'tabs.colorBlock',
  extra: 'tabs.extra'
};

export const TOP_BAR_MODES: readonly TopBarMode[] = [...PART_TABS, 'colorBlock', 'extra'];
