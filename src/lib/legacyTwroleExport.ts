import { gzip } from 'pako';
import type { DecorationGroup, DecorationLayer, HeadLayerTransform, RoleDocument } from '../types/role';

interface LegacyCompactDecoEntry {
  c: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  r: number;
}

interface LegacyCompactRoleConfig {
  head: { f: number; s: number };
  cape: { f: number; s: number };
  hand: { f: number; s: number };
  foot: { f: number; s: number };
  deco: LegacyCompactDecoEntry[];
}

interface LegacyTwrolePayload {
  data: {
    dr: number;
    cr: LegacyCompactRoleConfig;
  };
  hash: string;
  thumb: null;
  decoGroups: DecorationGroup[];
}

type VirtualLayer =
  | { kind: 'head'; layer: HeadLayerTransform }
  | { kind: 'deco'; layer: DecorationLayer };

const TWROLE_HEADER = [0, 1] as const;

function asFiniteNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeDegrees(value: unknown): number {
  const numeric = asFiniteNumber(value, 0);
  return ((numeric % 360) + 360) % 360;
}

function degreesToRadians(value: unknown): number {
  return (normalizeDegrees(value) * Math.PI) / 180;
}

function getPartFrame(role: RoleDocument, part: 'head' | 'cape' | 'hand' | 'foot'): number {
  return Math.round(asFiniteNumber(role.partFrames?.[part], 0));
}

function getPartScale(role: RoleDocument, part: 'head' | 'cape' | 'hand' | 'foot'): number {
  return asFiniteNumber(role.partScales?.[part], 1);
}

function clampHeadLayerIndex(role: RoleDocument): number {
  const count = role.decorations.length;
  const raw = asFiniteNumber(role.headLayerIndex, count);
  return Math.max(0, Math.min(count, Math.round(raw)));
}

function getTopFirstVirtualLayers(role: RoleDocument): VirtualLayer[] {
  const layers: VirtualLayer[] = role.decorations.map((layer) => ({ kind: 'deco', layer }));
  layers.splice(clampHeadLayerIndex(role), 0, { kind: 'head', layer: role.headLayer });
  return layers;
}

function exportDeco(layer: DecorationLayer): LegacyCompactDecoEntry | null {
  if (layer.visible === false) return null;
  return {
    c: layer.code,
    x: asFiniteNumber(layer.x, 0),
    y: asFiniteNumber(layer.y, 0),
    sx: asFiniteNumber(layer.scaleX, 1),
    sy: asFiniteNumber(layer.scaleY, 1),
    r: degreesToRadians(layer.rotation)
  };
}

function exportHead(layer: HeadLayerTransform): LegacyCompactDecoEntry | null {
  if (layer.visible === false) return null;
  return {
    c: 'head',
    x: asFiniteNumber(layer.x, 0),
    y: asFiniteNumber(layer.y, 0),
    sx: asFiniteNumber(layer.scaleX, 1),
    sy: asFiniteNumber(layer.scaleY, 1),
    r: degreesToRadians(layer.rotation)
  };
}

function exportLegacyDecos(role: RoleDocument): LegacyCompactDecoEntry[] {
  // UI/runtime stores layers top-first. Original RoleDecosConfig stores deco
  // bottom-to-top. Group metadata is preserved separately in top-level
  // `decoGroups`, matching the old editor payload shape.
  return getTopFirstVirtualLayers(role)
    .slice()
    .reverse()
    .map((item) => (item.kind === 'head' ? exportHead(item.layer) : exportDeco(item.layer)))
    .filter((item): item is LegacyCompactDecoEntry => item !== null);
}

function cloneDecoGroups(role: RoleDocument): DecorationGroup[] {
  return JSON.parse(JSON.stringify(role.groups ?? [])) as DecorationGroup[];
}

export function buildLegacyCompactPayload(role: RoleDocument): LegacyTwrolePayload {
  return {
    data: {
      dr: 8,
      cr: {
        head: { f: getPartFrame(role, 'head'), s: getPartScale(role, 'head') },
        cape: { f: getPartFrame(role, 'cape'), s: getPartScale(role, 'cape') },
        hand: { f: getPartFrame(role, 'hand'), s: getPartScale(role, 'hand') },
        foot: { f: getPartFrame(role, 'foot'), s: getPartScale(role, 'foot') },
        deco: exportLegacyDecos(role)
      }
    },
    hash: '',
    thumb: null,
    decoGroups: cloneDecoGroups(role)
  };
}

export function createRoleJsonBlob(role: RoleDocument): Blob {
  return new Blob([JSON.stringify(buildLegacyCompactPayload(role), null, 2)], { type: 'application/json' });
}

export function createTwroleBlob(role: RoleDocument): Blob {
  const json = JSON.stringify(buildLegacyCompactPayload(role));
  const compressed = gzip(json, { level: 1 });
  const header = new Uint8Array(TWROLE_HEADER);
  return new Blob([header, compressed], { type: 'application/octet-stream' });
}
