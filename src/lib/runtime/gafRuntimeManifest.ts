import generatedRuntimeManifest from '../../generated/gafRuntimeManifest.json';
import type { GafRuntimeManifest } from '../../types/gafRuntime';

interface GeneratedGafRuntimeManifest {
  decorationRuntime?: GafRuntimeManifest;
  assetsRuntime?: GafRuntimeManifest;
  actorRuntime?: GafRuntimeManifest;
}

const manifest = generatedRuntimeManifest as unknown as GeneratedGafRuntimeManifest;

export const decorationRuntimeManifest = manifest.decorationRuntime;
export const assetsRuntimeManifest = manifest.assetsRuntime;
export const actorRuntimeManifest = manifest.actorRuntime;
