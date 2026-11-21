import { afterEach, describe, expect, it, vi } from 'vitest';

const validRuntime = {
  elements: {},
  timelinesById: { '1': { id: '1' } },
  timelinesByLinkage: { sample: '1' },
  matrixPool: [[1, 0, 0, 1, 0, 0]]
};

afterEach(() => vi.unstubAllGlobals());

describe('on-demand weapon GAF runtime', () => {
  it('resolves availability immediately and shares one actual request at first use', async () => {
    vi.resetModules();
    const fetchRuntime = vi.fn<typeof fetch>().mockResolvedValue(Response.json(validRuntime));
    vi.stubGlobal('fetch', fetchRuntime);
    const runtime = await import('./weaponRuntimeManifest');

    expect(runtime.weaponRuntimeHasTimeline('lib_bow')).toBe(true);
    expect(runtime.weaponRuntimeHasTimeline('not-a-real-timeline')).toBe(false);
    expect(runtime.getLoadedWeaponRuntimeManifest()).toBeUndefined();
    expect(fetchRuntime).not.toHaveBeenCalled();

    const request = runtime.loadWeaponRuntimeManifest();
    expect(runtime.loadWeaponRuntimeManifest()).toBe(request);
    const result = await request;
    expect(result).toEqual(validRuntime);
    expect(runtime.getLoadedWeaponRuntimeManifest()).toBe(result);
    await expect(runtime.loadWeaponRuntimeManifest()).resolves.toBe(result);
    expect(fetchRuntime).toHaveBeenCalledTimes(1);
    expect(fetchRuntime.mock.calls[0][0]).toMatch(/gaf(?:WeaponRuntimeManifest|-weapon-[\w-]+)\.json(?:\?no-inline)?$/);
  });

  it('retries the same hashed URL after network and parse failures', async () => {
    vi.resetModules();
    const fetchRuntime = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(Response.json({ unexpected: true }))
      .mockResolvedValueOnce(Response.json(validRuntime));
    vi.stubGlobal('fetch', fetchRuntime);
    const runtime = await import('./weaponRuntimeManifest');

    await expect(runtime.loadWeaponRuntimeManifest()).rejects.toThrow('offline');
    await expect(runtime.loadWeaponRuntimeManifest()).rejects.toThrow('Invalid GAF weapon runtime manifest.');
    expect(runtime.getLoadedWeaponRuntimeManifest()).toBeUndefined();
    await expect(runtime.loadWeaponRuntimeManifest()).resolves.toEqual(validRuntime);
    expect(fetchRuntime.mock.calls.map(([url]) => url)).toEqual(Array(3).fill(fetchRuntime.mock.calls[0][0]));
  });
});
