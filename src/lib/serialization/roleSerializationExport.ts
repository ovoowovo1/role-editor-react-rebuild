import type { DecorationLayer, RoleDocument } from '../../types/role';
import { createTwroleBlobWithThumb } from './legacyTwroleExport';
import { normalizeRoleDocument } from './roleSchemaV1';
import {
  rotationRadiansForExport,
  type LegacyCompactDecoEntry,
  type LegacyCompactRoleConfig
} from './roleSerializationLegacy';

export const createTwroleBlob = createTwroleBlobWithThumb;

function exportOldEditorDecolist(role: RoleDocument): LegacyCompactDecoEntry[] {
  const normalized = normalizeRoleDocument(role);
  const topFirstLayers: Array<DecorationLayer | 'head'> = [...normalized.decorations];
  topFirstLayers.splice(normalized.headLayerIndex, 0, 'head');
  return topFirstLayers.reverse().map((layer) => {
    if (layer === 'head') {
      return {
        c: 'head',
        x: normalized.headLayer.x,
        y: normalized.headLayer.y,
        sx: normalized.headLayer.scaleX,
        sy: normalized.headLayer.scaleY,
        r: (normalized.headLayer.rotation * Math.PI) / 180
      };
    }

    return {
      c: layer.code,
      x: layer.x,
      y: layer.y,
      sx: layer.scaleX,
      sy: layer.scaleY,
      r: rotationRadiansForExport(layer)
    };
  });
}

export function exportOriginalLikeRoleConfig(role: RoleDocument): LegacyCompactRoleConfig {
  const normalized = normalizeRoleDocument(role);
  const deco = exportOldEditorDecolist(normalized);

  return {
    head: { f: normalized.partFrames.head, s: normalized.headLayer.scaleX },
    cape: { f: normalized.partFrames.cape, s: normalized.partScales.cape },
    hand: { f: normalized.partFrames.hand, s: normalized.partScales.hand },
    foot: { f: normalized.partFrames.foot, s: normalized.partScales.foot },
    deco
  };
}
