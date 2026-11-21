import { Assets } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gafSources } from '../../mock/gafManifest';
import { DEFAULT_ACTOR_BODY_ANIMATION_LABEL } from './actorBodyAnimation';
import { actorAnimationUsesWeaponAtlas } from './actorClip';
import {
  clearLoadedWeaponAtlasFailure,
  prepareWeaponAtlasForAnimation,
  recordWeaponAtlasResult,
  weaponAtlasNeedsLoad
} from './weaponAtlasAvailability';

const runtimeLoader = vi.hoisted(() => ({
  getLoadedWeaponRuntimeManifest: vi.fn(),
  loadWeaponRuntimeManifest: vi.fn()
}));
vi.mock('./weaponRuntimeManifest', async (importOriginal) => ({
  ...await importOriginal<typeof import('./weaponRuntimeManifest')>(),
  ...runtimeLoader
}));
const readyRuntime = { elements: {}, timelinesById: {}, timelinesByLinkage: {} };

const ASSET_WEAPON = 'IDLE_BOW_TYPE';

beforeEach(() => {
  runtimeLoader.getLoadedWeaponRuntimeManifest.mockReset();
  runtimeLoader.loadWeaponRuntimeManifest.mockReset().mockResolvedValue(readyRuntime);
});
afterEach(() => vi.restoreAllMocks());

describe('optional weapon atlas', () => {
  it('loads only for sequences with a resolved weapon clip from that atlas', () => {
    const load = vi.spyOn(Assets, 'load');
    expect(actorAnimationUsesWeaponAtlas(ASSET_WEAPON)).toBe(true);
    expect(actorAnimationUsesWeaponAtlas('RELOAD_BOW_TYPE')).toBe(true);
    expect(actorAnimationUsesWeaponAtlas('IDLE_HANDGUN_TYPE')).toBe(false);
    expect(prepareWeaponAtlasForAnimation(DEFAULT_ACTOR_BODY_ANIMATION_LABEL)).toBeNull();
    expect(prepareWeaponAtlasForAnimation('IDLE_HANDGUN_TYPE')).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(runtimeLoader.loadWeaponRuntimeManifest).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent stage/export requests and skips cached assets', async () => {
    const has = vi.spyOn(Assets.cache, 'has').mockReturnValue(false);
    let complete: (() => void) | undefined;
    let completeRuntime: (() => void) | undefined;
    runtimeLoader.loadWeaponRuntimeManifest.mockImplementation(
      () => new Promise((resolve) => { completeRuntime = () => resolve(readyRuntime); })
    );
    const load = vi.spyOn(Assets, 'load').mockImplementation(
      () => new Promise((resolve) => { complete = () => resolve({}); })
    );

    const request = prepareWeaponAtlasForAnimation(ASSET_WEAPON);
    expect(request).toBeInstanceOf(Promise);
    expect(prepareWeaponAtlasForAnimation('RELOAD_BOW_TYPE')).toBe(request);
    // Switching to the default animation is synchronous even while a weapon load is pending.
    expect(prepareWeaponAtlasForAnimation(DEFAULT_ACTOR_BODY_ANIMATION_LABEL)).toBeNull();
    await Promise.resolve();
    expect(load).toHaveBeenCalledExactlyOnceWith(gafSources.assetsTexture);
    has.mockReturnValue(true);
    complete?.();
    expect(weaponAtlasNeedsLoad(ASSET_WEAPON)).toBe(true);
    expect(runtimeLoader.loadWeaponRuntimeManifest).toHaveBeenCalledTimes(1);
    completeRuntime?.();
    runtimeLoader.getLoadedWeaponRuntimeManifest.mockReturnValue(readyRuntime);
    await expect(request).resolves.toBe(true);

    expect(weaponAtlasNeedsLoad(ASSET_WEAPON)).toBe(false);
    expect(prepareWeaponAtlasForAnimation(ASSET_WEAPON)).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('lets a failed render fall back and allows a later retry', async () => {
    vi.spyOn(Assets.cache, 'has').mockReturnValue(false);
    const load = vi.spyOn(Assets, 'load').mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({});
    const failed = new Set(['actor.png']);

    const result = await prepareWeaponAtlasForAnimation(ASSET_WEAPON);
    expect(result).toBe(false);
    recordWeaponAtlasResult(failed, result!);
    expect(failed).toEqual(new Set(['actor.png', gafSources.assetsTexture]));

    const ready = await prepareWeaponAtlasForAnimation(ASSET_WEAPON);
    expect(ready).toBe(true);
    vi.mocked(Assets.cache.has).mockReturnValue(true);
    runtimeLoader.getLoadedWeaponRuntimeManifest.mockReturnValue(readyRuntime);
    expect(clearLoadedWeaponAtlasFailure(failed)).toBe(true);
    expect(failed).toEqual(new Set(['actor.png']));
    expect(load).toHaveBeenCalledTimes(2);
  });
});
