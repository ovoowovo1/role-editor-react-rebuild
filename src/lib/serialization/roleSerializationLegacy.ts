import type { DecorationLayer, HeadLayerTransform } from '../../types/role';
import { SAFE_SCALE_FALLBACK } from '../../constants/legacy';
import { normalizeDegrees, safeNumber } from '../math';

export interface LegacyCompactDecoEntry {
  c: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  r: number;
}

export interface LegacyCompactRoleConfig {
  head: { f: number; s: number };
  cape: { f: number; s: number };
  hand: { f: number; s: number };
  foot: { f: number; s: number };
  deco: LegacyCompactDecoEntry[];
}

interface LegacyRotationHint {
  radians: number;
  degrees: number;
}

const HEAD_DECO_CODES = new Set(['head', 'HEAD', 'lib_actor_head', 'actor_head', 'role_head', '__head__']);
const MISSING_ASSET_ID_PREFIX = 'deco:missing:';
const legacyDecorationRotationHints = new Map<string, LegacyRotationHint>();

export const TWROLE_HEADER = [0, 1] as const;

export function makeMissingDecoAssetId(code: string): string {
  return `${MISSING_ASSET_ID_PREFIX}${code || 'unknown'}`;
}

export function isMissingDecoAssetId(assetId: string | undefined | null): boolean {
  return typeof assetId === 'string' && assetId.startsWith(MISSING_ASSET_ID_PREFIX);
}

export function isHeadDecoCode(code: unknown): boolean {
  const normalized = String(code ?? '');
  return HEAD_DECO_CODES.has(normalized) || normalized.toLowerCase() === 'head';
}

export function radiansToDegrees(raw: unknown): number {
  const value = safeNumber(raw, 0);
  return normalizeDegrees((value * 180) / Math.PI);
}

export function degreesToNormalized(raw: unknown): number {
  return normalizeDegrees(safeNumber(raw, 0));
}

export function readRotationDegrees(input: any): number {
  if (input && Object.prototype.hasOwnProperty.call(input, 'r')) return radiansToDegrees(input.r);
  return degreesToNormalized(input?.rotation);
}

export function rememberLegacyDecorationRotation(id: string, rawRadians: unknown, rotationDegrees: number): void {
  const radians = typeof rawRadians === 'number' ? rawRadians : typeof rawRadians === 'string' ? Number(rawRadians) : NaN;
  if (!Number.isFinite(radians)) return;
  legacyDecorationRotationHints.set(id, { radians, degrees: rotationDegrees });
}

export function rotationRadiansForExport(layer: DecorationLayer): number {
  const hint = legacyDecorationRotationHints.get(layer.id);
  if (hint && normalizeDegrees(layer.rotation) === hint.degrees) {
    return hint.radians;
  }
  return (layer.rotation * Math.PI) / 180;
}

function readScaleNumber(scale: unknown): number | null {
  const numeric = typeof scale === 'number' ? scale : typeof scale === 'string' ? Number(scale) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

export function readImportedScale(value: unknown, fallback = SAFE_SCALE_FALLBACK): number {
  const numeric = readScaleNumber(value);
  return numeric == null ? fallback : numeric;
}

export function readImportedScales(rawScaleX: unknown, rawScaleY: unknown, fallbackScale = SAFE_SCALE_FALLBACK): { scaleX: number; scaleY: number } {
  const fallback = Math.abs(readImportedScale(fallbackScale, SAFE_SCALE_FALLBACK)) || SAFE_SCALE_FALLBACK;
  return {
    scaleX: readImportedScale(rawScaleX, fallback),
    scaleY: readImportedScale(rawScaleY, fallback)
  };
}

export function defaultHeadLayer(scale = SAFE_SCALE_FALLBACK): HeadLayerTransform {
  return {
    x: 0,
    y: 0,
    scaleX: scale,
    scaleY: scale,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

export function normalizeHeadLayerIndex(raw: unknown, decorationCount: number, fallback = decorationCount): number {
  const numeric = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(numeric)) return Math.max(0, Math.min(decorationCount, fallback));
  return Math.max(0, Math.min(decorationCount, Math.round(numeric)));
}
