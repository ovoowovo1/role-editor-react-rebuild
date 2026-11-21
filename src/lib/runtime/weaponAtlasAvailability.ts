import { Assets } from 'pixi.js';
import { gafSources } from '../../mock/gafManifest';
import { actorAnimationUsesWeaponAtlas } from './actorClip';
import { getLoadedWeaponRuntimeManifest, loadWeaponRuntimeManifest } from './weaponRuntimeManifest';

let pending: Promise<boolean> | null = null;

export function weaponAtlasNeedsLoad(label: string): boolean {
  const url = gafSources.assetsTexture;
  return !!url && actorAnimationUsesWeaponAtlas(label) &&
    (!getLoadedWeaponRuntimeManifest() || !Assets.cache.has(url));
}

/** Share an in-flight load across scenes/exports; a failed attempt can be retried. */
export function prepareWeaponAtlasForAnimation(label: string): Promise<boolean> | null {
  if (!weaponAtlasNeedsLoad(label)) return null;
  pending ??= Promise.resolve()
    .then(() => Promise.all([
      loadWeaponRuntimeManifest(),
      Assets.cache.has(gafSources.assetsTexture) ? null : Assets.load(gafSources.assetsTexture)
    ]))
    .then(() => true, () => false)
    .finally(() => { pending = null; });
  return pending;
}

/** Recover an older scene's failed marker if a different path has since loaded the texture. */
export function clearLoadedWeaponAtlasFailure(failedTextures: Set<string>): boolean {
  const url = gafSources.assetsTexture;
  return !!url && failedTextures.has(url) && !!getLoadedWeaponRuntimeManifest() &&
    Assets.cache.has(url) && failedTextures.delete(url);
}

export function recordWeaponAtlasResult(failedTextures: Set<string>, ready: boolean): void {
  if (ready) failedTextures.delete(gafSources.assetsTexture);
  else failedTextures.add(gafSources.assetsTexture);
}
