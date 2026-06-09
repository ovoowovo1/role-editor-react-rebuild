import { gzip } from 'pako';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { DEFAULT_LEGACY_DR } from '../../constants/legacy';
import type { DecorationLayer, HeadLayerTransform, RoleDocument } from '../../types/role';
import { getHeadLayerIndex } from '../editor/layerOrdering';
import type { FullRoleRenderResult } from '../stage/fullRoleRenderer';
import { exportLegacyDecoGroups, type LegacyDecoGroup } from './legacyDecoGroups';
import { md5Hex } from './md5';

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

export interface LegacyTwroleThumb {
  dataUrl: string;
  pivot: {
    x: number;
    y: number;
  };
}

interface LegacyTwrolePayload {
  data: {
    dr: number;
    cr: LegacyCompactRoleConfig;
  };
  hash: string;
  thumb: LegacyTwroleThumb | null;
  decoGroups: LegacyDecoGroup[];
}

type VirtualLayer =
  | { kind: 'head'; layer: HeadLayerTransform; id: typeof HEAD_LAYER_ID }
  | { kind: 'deco'; layer: DecorationLayer; id: string };

const TWROLE_HEADER = [0, 1] as const;

const LEGACY_DR_BY_CAMP: Record<string, number> = {
  skydow: 0,
  camp1: 0,
  '天影十字軍': 0,
  royal: 4,
  camp2: 4,
  '皇家騎士團': 4,
  third: 8,
  camp3: 8,
  '第三勢力': 8,
  civil: 13,
  camp4: 13,
  '無關陣營': 13
};

function asFiniteNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getLegacyDr(role: RoleDocument): number {
  const baseDr = LEGACY_DR_BY_CAMP[String(role.camp ?? '').trim()] ?? DEFAULT_LEGACY_DR;
  return baseDr + (role.gender === 'female' ? 1 : 0);
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

function getTopFirstVirtualLayers(role: RoleDocument): VirtualLayer[] {
  const layers: VirtualLayer[] = role.decorations.map((layer) => ({ kind: 'deco', layer, id: layer.id }));
  layers.splice(getHeadLayerIndex(role), 0, { kind: 'head', layer: role.headLayer, id: HEAD_LAYER_ID });
  return layers;
}

function getBottomToTopVirtualLayers(role: RoleDocument): VirtualLayer[] {
  return getTopFirstVirtualLayers(role).slice().reverse();
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
  return getBottomToTopVirtualLayers(role)
    .map((item) => (item.kind === 'head' ? exportHead(item.layer) : exportDeco(item.layer)))
    .filter((item): item is LegacyCompactDecoEntry => item !== null);
}

export function buildLegacyCompactPayload(role: RoleDocument): LegacyTwrolePayload {
  return {
    data: {
      dr: getLegacyDr(role),
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
    decoGroups: exportLegacyDecoGroups(role)
  };
}

function cropRenderedDataUrl(rendered: FullRoleRenderResult): string | null {
  const bounds = rendered.nonTransparentBounds;
  if (!bounds || !rendered.imageData || typeof document === 'undefined') return null;

  const width = Math.max(1, bounds.maxX - bounds.minX + 1);
  const height = Math.max(1, bounds.maxY - bounds.minY + 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const output = context.createImageData(width, height);
  const source = rendered.imageData.data;
  const target = output.data;
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = ((bounds.minY + y) * rendered.width + bounds.minX) * 4;
    const targetOffset = y * width * 4;
    target.set(source.subarray(sourceOffset, sourceOffset + width * 4), targetOffset);
  }
  context.putImageData(output, 0, 0);
  return canvas.toDataURL('image/png');
}

function thumbFromRenderedRole(rendered: FullRoleRenderResult): LegacyTwroleThumb {
  const bounds = rendered.nonTransparentBounds;
  if (!bounds) {
    return {
      dataUrl: rendered.dataUrl,
      pivot: { x: 0, y: 0 }
    };
  }

  return {
    dataUrl: cropRenderedDataUrl(rendered) ?? rendered.dataUrl,
    pivot: {
      x: rendered.width / 2 - bounds.minX,
      y: rendered.height / 2 - bounds.minY
    }
  };
}

export async function renderLegacyExportThumb(role: RoleDocument): Promise<LegacyTwroleThumb> {
  const { renderFullRoleToDataUrl } = await import('../stage/fullRoleRenderer');
  const rendered = await renderFullRoleToDataUrl(role, {
    imageSize: 256,
    background: 'transparent',
    includeImageData: true
  });
  return thumbFromRenderedRole(rendered);
}

export async function buildLegacyCompactPayloadWithThumb(role: RoleDocument): Promise<LegacyTwrolePayload> {
  const payload = buildLegacyCompactPayload(role);
  const thumb = await renderLegacyExportThumb(role);
  return {
    ...payload,
    hash: md5Hex(thumb.dataUrl),
    thumb
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

export async function createRoleJsonBlobWithThumb(role: RoleDocument): Promise<Blob> {
  return new Blob([JSON.stringify(await buildLegacyCompactPayloadWithThumb(role), null, 2)], { type: 'application/json' });
}

export async function createTwroleBlobWithThumb(role: RoleDocument): Promise<Blob> {
  const json = JSON.stringify(await buildLegacyCompactPayloadWithThumb(role));
  const compressed = gzip(json, { level: 1 });
  const header = new Uint8Array(TWROLE_HEADER);
  return new Blob([header, compressed], { type: 'application/octet-stream' });
}
