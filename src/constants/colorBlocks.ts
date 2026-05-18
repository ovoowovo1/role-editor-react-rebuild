export const COLOR_BLOCK_API_BASE = '/api';

export const COLOR_BLOCK_SPECIFIC_CAMP_CODES = ['third', 'royal', 'skydow'] as const;
export type ColorBlockSpecificCampCode = (typeof COLOR_BLOCK_SPECIFIC_CAMP_CODES)[number];
export type ColorBlockPresetCacheKey = 'all' | ColorBlockSpecificCampCode;

export const COLOR_BLOCK_ALL_CAMP_CODES = ['civil', 'camp4', '無關陣營'] as const;

export const COLOR_BLOCK_SPECIFIC_CAMPS: ReadonlySet<string> = new Set(COLOR_BLOCK_SPECIFIC_CAMP_CODES);
export const COLOR_BLOCK_ALL_CAMPS: ReadonlySet<string> = new Set(COLOR_BLOCK_ALL_CAMP_CODES);
