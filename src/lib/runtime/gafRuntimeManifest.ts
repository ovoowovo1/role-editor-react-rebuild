import generatedRuntimeManifest from '../../generated/gafRuntimeManifest.json';
import type { GafRuntimeManifest } from '../../types/gafRuntime';

interface GeneratedGafRuntimeManifest {
  decorationRuntime?: GafRuntimeManifest;
  weaponRuntimeTimelineKeys?: string[];
  actorRuntime?: GafRuntimeManifest;
}

const manifest = generatedRuntimeManifest as unknown as GeneratedGafRuntimeManifest;

export const decorationRuntimeManifest = manifest.decorationRuntime;
export const weaponRuntimeTimelineKeys = manifest.weaponRuntimeTimelineKeys ?? [];
export const actorRuntimeManifest = manifest.actorRuntime;
