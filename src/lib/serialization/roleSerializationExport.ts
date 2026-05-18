import { gzip } from 'pako';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../../types/role';
import { exportLegacyDecoGroups, type LegacyDecoGroup } from './legacyDecoGroups';
import { normalizeRoleDocument } from './roleSerializationImport';
import {
  TWROLE_HEADER,
  rotationRadiansForExport,
  type LegacyCompactDecoEntry,
  type LegacyCompactRoleConfig
} from './roleSerializationLegacy';

interface ExportEnvelope {
  source: string;
  schemaVersion: 1;
  exportedAt: string;
  data: RoleDocument;
  thumb: null;
  decoGroups: DecorationGroup[];
  mockAdapters: string[];
}

interface LegacyTwrolePayload {
  data: {
    dr: number;
    cr: LegacyCompactRoleConfig;
  };
  hash: string;
  thumb: null | { dataUrl: string; pivot: { x: number; y: number } };
  decoGroups: LegacyDecoGroup[];
}

function cloneRole(role: RoleDocument): RoleDocument {
  return JSON.parse(JSON.stringify(role)) as RoleDocument;
}

export function roleToEnvelope(role: RoleDocument): ExportEnvelope {
  const cleanRole = normalizeRoleDocument(role);
  return {
    source: 'tw-role-editor-react-rebuild',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      ...cleanRole,
      updatedAt: new Date().toISOString()
    },
    thumb: null,
    decoGroups: cloneRole(cleanRole).groups ?? [],
    mockAdapters: ['Base.resourceManager', 'TwilightWarsLib.ActorClip', 'TWLibLib.ActorPart', 'RoleDecosList', 'GLT/auth']
  };
}

function buildLegacyCompactPayload(role: RoleDocument): LegacyTwrolePayload {
  const normalized = normalizeRoleDocument(role);
  const legacyConfig = exportOriginalLikeRoleConfig(normalized);
  return {
    data: {
      dr: 8,
      cr: legacyConfig
    },
    hash: '',
    thumb: null,
    decoGroups: exportLegacyDecoGroups(role)
  };
}

export function createRoleJsonBlob(role: RoleDocument): Blob {
  return new Blob([JSON.stringify(buildLegacyCompactPayload(role), null, 2)], { type: 'application/json' });
}

export function createTwroleBlob(role: RoleDocument): Blob {
  const payload = buildLegacyCompactPayload(role);
  const json = JSON.stringify(payload);
  const compressed = gzip(json, { level: 1 });
  const header = new Uint8Array(TWROLE_HEADER);
  return new Blob([header, compressed], { type: 'application/octet-stream' });
}

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

