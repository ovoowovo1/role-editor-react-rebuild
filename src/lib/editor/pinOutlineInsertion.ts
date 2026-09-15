import { optionById } from '../../mock/options';
import type { DecorationLayer } from '../../types/role';
import type { PinOutlineState } from '../../types/pinOutline';
import { createId, normalizeDegrees } from '../math';
import { resolvePinOutlineAssetMetrics } from './pinOutlineAssetMetrics';
import { buildPinOutlinePlacements } from './pinOutlineGeometry';

/**
 * Converts the current runtime pin preview into normal role decorations.
 * The returned layers are copied by the existing batch insertion command, so
 * this helper never mutates the pin state or the current RoleDocument.
 */
export function buildPinOutlineDecorationLayers(state: PinOutlineState): DecorationLayer[] {
  if (state.pins.length < 3 || state.materials.length === 0) return [];
  const metricResults = [...new Set(state.materials.map((material) => material.assetId))]
    .map((assetId) => [assetId, resolvePinOutlineAssetMetrics(assetId)] as const);
  const metricsByAssetId = Object.fromEntries(metricResults.map(([assetId, result]) => [assetId, result.metrics]));
  const placements = buildPinOutlinePlacements(
    state.pins,
    state.segments,
    state.materials,
    metricsByAssetId,
    { samplesPerSegment: 32 }
  );
  return placements.map((placement) => {
    const option = optionById[placement.assetId];
    return {
      id: createId('deco'),
      code: option?.code ?? placement.assetId,
      assetId: placement.assetId,
      name: 'Pin outline',
      x: placement.x,
      y: placement.y,
      scaleX: placement.scaleX,
      scaleY: placement.scaleY,
      rotation: normalizeDegrees(placement.rotation),
      visible: true,
      opacity: 1
    };
  });
}
