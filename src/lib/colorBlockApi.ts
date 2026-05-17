import type { ColorBlockPreset } from '../mock/colorBlocks';

const DEFAULT_API_BASE = '/api';
const SPECIFIC_CAMPS = new Set(['third', 'royal', 'skydow']);
const ALL_PRESET_CAMPS = new Set(['civil', 'camp4', '無關陣營']);

type ColorBlockPresetCacheKey = 'all' | 'third' | 'royal' | 'skydow';

const presetCache = new Map<ColorBlockPresetCacheKey, ColorBlockPreset[]>();
const pendingPresetRequests = new Map<ColorBlockPresetCacheKey, Promise<ColorBlockPreset[]>>();

export function getColorBlockApiBase(): string {
  const configured = import.meta.env.VITE_COLOR_BLOCK_API_BASE;
  return (configured?.trim() || DEFAULT_API_BASE).replace(/\/+$/, '');
}

export function isColorBlockPreset(value: unknown): value is ColorBlockPreset {
  if (!value || typeof value !== 'object') return false;
  const preset = value as Partial<ColorBlockPreset>;
  return (
    typeof preset.id === 'string' &&
    typeof preset.camp === 'string' &&
    typeof preset.name === 'string' &&
    typeof preset.label === 'string' &&
    typeof preset.color === 'string' &&
    Array.isArray(preset.deco)
  );
}

export function getColorBlockPresetCacheKey(camp: string): ColorBlockPresetCacheKey | null {
  const normalizedCamp = camp.trim();
  if (SPECIFIC_CAMPS.has(normalizedCamp)) return normalizedCamp as ColorBlockPresetCacheKey;
  if (!normalizedCamp || ALL_PRESET_CAMPS.has(normalizedCamp)) return 'all';
  return null;
}

function getRequestOrigin(): string {
  return globalThis.location?.origin ?? 'http://localhost';
}

async function requestColorBlockPresets(cacheKey: ColorBlockPresetCacheKey): Promise<ColorBlockPreset[]> {
  const base = getColorBlockApiBase();
  const url = new URL(`${base}/color-block-presets`, getRequestOrigin());
  if (cacheKey !== 'all') url.searchParams.set('camp', cacheKey);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Color block API failed with ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isColorBlockPreset)) {
    throw new Error('Color block API returned an invalid preset list.');
  }

  return data;
}

export function clearColorBlockPresetCache(): void {
  presetCache.clear();
  pendingPresetRequests.clear();
}

export async function fetchColorBlockPresets(camp: string): Promise<ColorBlockPreset[]> {
  const cacheKey = getColorBlockPresetCacheKey(camp);
  if (!cacheKey) return [];

  const cachedPresets = presetCache.get(cacheKey);
  if (cachedPresets) return cachedPresets;

  const pendingRequest = pendingPresetRequests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const request = requestColorBlockPresets(cacheKey)
    .then((presets) => {
      presetCache.set(cacheKey, presets);
      return presets;
    })
    .finally(() => {
      pendingPresetRequests.delete(cacheKey);
    });

  pendingPresetRequests.set(cacheKey, request);
  return request;
}
