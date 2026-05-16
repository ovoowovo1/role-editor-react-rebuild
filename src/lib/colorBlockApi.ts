import type { ColorBlockPreset } from '../mock/colorBlocks';

const DEFAULT_API_BASE = '/api';

function getColorBlockApiBase(): string {
  const configured = import.meta.env.VITE_COLOR_BLOCK_API_BASE;
  return (configured?.trim() || DEFAULT_API_BASE).replace(/\/+$/, '');
}

function isColorBlockPreset(value: unknown): value is ColorBlockPreset {
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

export async function fetchColorBlockPresets(camp: string, signal?: AbortSignal): Promise<ColorBlockPreset[]> {
  const base = getColorBlockApiBase();
  const url = new URL(`${base}/color-block-presets`, window.location.origin);
  if (camp) url.searchParams.set('camp', camp);

  const response = await fetch(url, {
    signal,
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
