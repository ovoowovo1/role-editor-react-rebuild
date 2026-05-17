import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ColorBlockPreset } from '../mock/colorBlocks';
import {
  clearColorBlockPresetCache,
  fetchColorBlockPresets,
  getColorBlockPresetCacheKey,
  isColorBlockPreset
} from './colorBlockApi';

const preset: ColorBlockPreset = {
  id: 'p1',
  camp: 'third',
  name: 'Third Block',
  label: 'Third Block',
  color: '#35d0ff',
  deco: []
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

describe('color block API helpers', () => {
  afterEach(() => {
    clearColorBlockPresetCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps camps to cache keys and rejects unsupported camps', () => {
    expect(getColorBlockPresetCacheKey('third')).toBe('third');
    expect(getColorBlockPresetCacheKey(' royal ')).toBe('royal');
    expect(getColorBlockPresetCacheKey('civil')).toBe('all');
    expect(getColorBlockPresetCacheKey('')).toBe('all');
    expect(getColorBlockPresetCacheKey('unknown')).toBeNull();
  });

  it('validates preset response shape', () => {
    expect(isColorBlockPreset(preset)).toBe(true);
    expect(isColorBlockPreset({ ...preset, deco: null })).toBe(false);
    expect(isColorBlockPreset({ ...preset, id: 123 })).toBe(false);
  });

  it('dedupes pending requests and caches successful responses', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([preset]));
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([
      fetchColorBlockPresets('third'),
      fetchColorBlockPresets('third')
    ]);
    const third = await fetchColorBlockPresets('third');

    expect(first).toEqual([preset]);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as unknown as [URL | string, RequestInit?];
    const url = new URL(String(firstCall[0]));
    expect(url.pathname).toBe('/api/color-block-presets');
    expect(url.searchParams.get('camp')).toBe('third');
  });

  it('does not poison cache after fetch or validation failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('temporary failure', { status: 503 }))
      .mockResolvedValueOnce(jsonResponse([{ ...preset, deco: null }]))
      .mockResolvedValueOnce(jsonResponse([preset]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchColorBlockPresets('royal')).rejects.toThrow('temporary failure');
    await expect(fetchColorBlockPresets('royal')).rejects.toThrow('invalid preset list');
    await expect(fetchColorBlockPresets('royal')).resolves.toEqual([preset]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns an empty list without fetching for unsupported camps', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchColorBlockPresets('not-real')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
