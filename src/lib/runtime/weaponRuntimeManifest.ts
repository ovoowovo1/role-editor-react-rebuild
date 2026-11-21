import manifestAssetUrl from '../../generated/gafWeaponRuntimeManifest.json?url&no-inline';
import type { GafRuntimeManifest } from '../../types/gafRuntime';
import { weaponRuntimeTimelineKeys } from './gafRuntimeManifest';

const timelineKeys = new Set(weaponRuntimeTimelineKeys);
let loaded: GafRuntimeManifest | undefined;
let pending: Promise<GafRuntimeManifest> | undefined;

export function weaponRuntimeHasTimeline(key: string): boolean {
  return timelineKeys.has(key);
}

export function getLoadedWeaponRuntimeManifest(): GafRuntimeManifest | undefined {
  return loaded;
}

function readWeaponRuntimeManifest(value: unknown): GafRuntimeManifest {
  if (typeof value !== 'object' || value === null ||
      !('timelinesById' in value) || !value.timelinesById || typeof value.timelinesById !== 'object' ||
      !('timelinesByLinkage' in value) || !value.timelinesByLinkage || typeof value.timelinesByLinkage !== 'object' ||
      !('elements' in value) || !value.elements || typeof value.elements !== 'object' ||
      !('matrixPool' in value) || !Array.isArray(value.matrixPool)) {
    throw new Error('Invalid GAF weapon runtime manifest.');
  }
  return value as GafRuntimeManifest;
}

/** The production asset URL is content-hashed. Failed network/parse attempts remain retryable. */
export function loadWeaponRuntimeManifest(): Promise<GafRuntimeManifest> {
  if (loaded) return Promise.resolve(loaded);
  pending ??= Promise.resolve()
    .then(() => fetch(manifestAssetUrl))
    .then(async (response) => {
      if (!response.ok) throw new Error(`GAF weapon runtime request failed (${response.status}).`);
      loaded = readWeaponRuntimeManifest(await response.json() as unknown);
      return loaded;
    })
    .finally(() => { pending = undefined; });
  return pending;
}
