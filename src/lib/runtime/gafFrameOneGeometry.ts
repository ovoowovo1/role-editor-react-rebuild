import type { GafMatrixSerialized, GafRuntimeManifest } from '../../types/gafRuntime';
import { resolveGafFrameOneDisplayList } from './gafFrameDisplayList';
import { decorationRuntimeManifest } from './gafRuntimeManifest';

export interface GafFrameOneGeometry {
  readonly elementId: string;
  readonly alpha: number;
  readonly matrix: Readonly<GafMatrixSerialized>;
}

const generatedDecorationGeometry = new Map<string, readonly GafFrameOneGeometry[]>();

/**
 * Share geometry for the one static decoration manifest at its authored scale.
 * The cache cannot grow beyond that manifest's canonical timelines. Custom or
 * mutable manifests and scale overrides still resolve from their current data.
 * This cache never owns a Pixi sprite, texture, mutable Matrix or failure state.
 */
export function resolveGafFrameOneGeometry(
  manifest: GafRuntimeManifest,
  timelineId: string,
  timelineScale: number
): readonly GafFrameOneGeometry[] {
  if (manifest !== decorationRuntimeManifest || timelineScale !== (manifest.timelineScale ?? 1)) {
    return resolveGafFrameOneDisplayList(manifest, timelineId, { timelineScale });
  }

  const cached = generatedDecorationGeometry.get(timelineId);
  if (cached !== undefined) return cached;
  if (!Object.prototype.hasOwnProperty.call(manifest.timelinesById, timelineId)) {
    return resolveGafFrameOneDisplayList(manifest, timelineId, { timelineScale });
  }

  const geometry = Object.freeze(resolveGafFrameOneDisplayList(manifest, timelineId, { timelineScale })
    .map(({ elementId, alpha, matrix }) => Object.freeze({
      elementId,
      alpha,
      matrix: Object.freeze(matrix)
    })));
  generatedDecorationGeometry.set(timelineId, geometry);
  return geometry;
}
