import { gzip, ungzip } from 'pako';
import { createDefaultRole, findOptionByCode, normalizeCampCode, partOptions } from '../mock/options';
import type {
  BodyPartTab,
  DecorationGroup,
  DecorationLayer,
  GenderCode,
  HeadLayerTransform,
  ImportResult,
  PartOption,
  RoleDocument,
  RolePartFrames,
  RolePartScales
} from '../types/role';
import { createId, normalizeDegrees, safeNumber } from './math';
import {
  BODY_PART_TABS,
  defaultPartFrames,
  defaultPartScales,
  getPartFrame,
  sanitizePartFrame,
  sanitizePartScale
} from './twlibPartRuntime';

interface ExportEnvelope {
  source: string;
  schemaVersion: 1;
  exportedAt: string;
  data: RoleDocument;
  thumb: null;
  decoGroups: DecorationGroup[];
  mockAdapters: string[];
}

interface PartSelection {
  id: string;
  frame: number;
  scale: number;
}

interface DecorationImportResult {
  decorations: DecorationLayer[];
  originalIndexToId: Array<string | null>;
  headLayerIndex: number;
  headLayer: HeadLayerTransform;
}

const HEAD_DECO_CODES = new Set(['head', 'HEAD', 'lib_actor_head', 'actor_head', 'role_head', '__head__']);
const TWROLE_HEADER = [0, 1] as const;

/**
 * Prefix applied to the `assetId` of a DecorationLayer whose original `code`
 * cannot be matched against the current `partOptions.deco` manifest. Using a
 * distinguishable prefix lets render code (CharacterStage) skip or draw a
 * placeholder instead of silently substituting another symbol.
 */
const MISSING_ASSET_ID_PREFIX = 'deco:missing:';

export function makeMissingDecoAssetId(code: string): string {
  return `${MISSING_ASSET_ID_PREFIX}${code || 'unknown'}`;
}

export function isMissingDecoAssetId(assetId: string | undefined | null): boolean {
  return typeof assetId === 'string' && assetId.startsWith(MISSING_ASSET_ID_PREFIX);
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

export function createRoleJsonBlob(role: RoleDocument): Blob {
  return new Blob([JSON.stringify(roleToEnvelope(role), null, 2)], { type: 'application/json' });
}

export function createTwroleBlob(role: RoleDocument): Blob {
  const json = JSON.stringify(roleToEnvelope(role));
  const compressed = gzip(json, { level: 1 });
  const header = new Uint8Array(TWROLE_HEADER);
  return new Blob([header, compressed], { type: 'application/octet-stream' });
}

function resolvePart(tab: BodyPartTab, raw: unknown, fallbackScale = 1): PartSelection {
  const frameValue =
    typeof raw === 'object' && raw !== null && 'f' in raw
      ? (raw as { f?: unknown }).f
      : typeof raw === 'object' && raw !== null && 'frame' in raw
        ? (raw as { frame?: unknown }).frame
        : raw;
  const code = String(frameValue ?? '');
  const option = findOptionByCode(tab, code) ?? partOptions[tab][0];
  const frame = getPartFrame(option) ?? sanitizePartFrame(tab, frameValue);
  const scale =
    typeof raw === 'object' && raw !== null
      ? sanitizePartScale((raw as { s?: unknown; scale?: unknown }).s ?? (raw as { scale?: unknown }).scale, fallbackScale)
      : fallbackScale;

  return {
    id: option.id,
    frame,
    scale
  };
}

/**
 * Look up a PartOption for a deco `code` or `assetId` without silently falling
 * back to the first entry. The old TWRoleCgEditor drops unknown symbols via
 * `fixIngameRoleDesign`, so replacing them with a random valid deco changes
 * the visible composition. Returning `null` lets the import path mark the
 * layer as missing instead of overriding its sx/sy/r onto an unrelated asset.
 */
function resolveDecoOption(code: unknown): PartOption | null {
  const normalized = String(code ?? '').trim();
  if (!normalized) return null;
  return findOptionByCode('deco', normalized) ?? null;
}

function isHeadDecoCode(code: unknown): boolean {
  const normalized = String(code ?? '');
  return HEAD_DECO_CODES.has(normalized) || normalized.toLowerCase() === 'head';
}

function radiansToDegrees(raw: unknown): number {
  const value = safeNumber(raw, 0);
  return normalizeDegrees((value * 180) / Math.PI);
}

function degreesToNormalized(raw: unknown): number {
  return normalizeDegrees(safeNumber(raw, 0));
}

function readRotationDegrees(input: any): number {
  // Original RoleDeco stores `r` as PIXI radians. The rebuild schema stores
  // `rotation` in degrees. Do not auto-detect by magnitude: small degree values
  // like 3deg were previously misread as 3 radians.
  if (input && Object.prototype.hasOwnProperty.call(input, 'r')) return radiansToDegrees(input.r);
  return degreesToNormalized(input?.rotation);
}

const SAFE_SCALE_FALLBACK = 1;

function readScaleNumber(scale: unknown): number | null {
  const numeric = typeof scale === 'number' ? scale : typeof scale === 'string' ? Number(scale) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function readImportedScale(value: unknown, fallback = SAFE_SCALE_FALLBACK): number {
  const numeric = readScaleNumber(value);
  return numeric == null ? fallback : numeric;
}

function readImportedScales(rawScaleX: unknown, rawScaleY: unknown, fallbackScale = SAFE_SCALE_FALLBACK): { scaleX: number; scaleY: number } {
  const fallback = Math.abs(readImportedScale(fallbackScale, SAFE_SCALE_FALLBACK)) || SAFE_SCALE_FALLBACK;
  return {
    // RoleDeco.importSyncJson copies sx/sy directly into PIXI scale. Do not
    // clamp imported values here, otherwise old role files render with a
    // different visual size/ratio from the original game editor.
    scaleX: readImportedScale(rawScaleX, fallback),
    scaleY: readImportedScale(rawScaleY, fallback)
  };
}

function defaultHeadLayer(scale = SAFE_SCALE_FALLBACK): HeadLayerTransform {
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

function normalizeHeadLayerIndex(raw: unknown, decorationCount: number, fallback = decorationCount): number {
  const numeric = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(numeric)) return Math.max(0, Math.min(decorationCount, fallback));
  return Math.max(0, Math.min(decorationCount, Math.round(numeric)));
}

function readHeadLayer(input: any, fallbackScale = SAFE_SCALE_FALLBACK): HeadLayerTransform {
  if (!input || typeof input !== 'object') return defaultHeadLayer(fallbackScale);
  // Same object-detection as normalizeDecoration: nested {position, scale}
  // only counts when it is actually an object, otherwise legacy flat fields
  // (x/y/sx/sy) win without aliasing.
  const position = typeof input.position === 'object' && input.position !== null ? input.position : null;
  const { scaleX, scaleY } = readHeadScaleFields(input, fallbackScale);
  return {
    x: safeNumber(position?.x ?? input.x, 0),
    y: safeNumber(position?.y ?? input.y, 0),
    scaleX,
    scaleY,
    rotation: readRotationDegrees(input),
    visible: input.visible !== false,
    opacity: safeNumber(input.opacity ?? input.alpha, 1)
  };
}

function normalizeDecoration(input: any, index: number): DecorationLayer {
  const rawCode = input?.code ?? input?.c ?? input?.assetId;
  const code = String(rawCode ?? '').trim() || 'unknown';
  const option = resolveDecoOption(rawCode);
  // For LEGACY input (no nested `position` object), treat `position` as null so
  // downstream code falls through to `input.x` / `input.y`. Using
  // `input?.position ?? input` previously aliased scale.x to the flat `x` field
  // because `scale?.x` picked up the position value. That aliasing clobbered
  // imported sx/sy with x/y, which is the visible "Scale/Ratio look wrong"
  // regression triggered by D:\code\twroleEditor saves.
  const position = typeof input?.position === 'object' && input.position !== null ? input.position : null;
  const scale = typeof input?.scale === 'object' && input.scale !== null ? input.scale : null;
  const { scaleX, scaleY } = readImportedScales(
    scale?.x ?? input?.scaleX ?? input?.sx,
    scale?.y ?? input?.scaleY ?? input?.sy,
    1
  );

  // Preserve the original `code` even when `resolveDecoOption` has no match.
  // The old editor fixIngameRoleDesign drops unknown symbols, but it NEVER
  // replaces `sx/sy/r` onto a different asset. Falling back to partOptions[0]
  // is how the earlier rebuild introduced the visible transform mismatch for
  // `third_halloween_deco_*` / `skydow_halloween_deco_*` legacy saves.
  const resolvedId = option?.id
    ?? (typeof input?.assetId === 'string' && !isMissingDecoAssetId(input.assetId) ? input.assetId : null)
    ?? makeMissingDecoAssetId(code);
  const resolvedName = typeof input?.name === 'string'
    ? input.name
    : option
      ? `${option.label} ${index + 1}`
      : `Missing: ${code}`;

  return {
    id: typeof input?.id === 'string' ? input.id : createId('deco'),
    code,
    assetId: resolvedId,
    name: resolvedName,
    x: safeNumber(position?.x ?? input?.x, 0),
    y: safeNumber(position?.y ?? input?.y, 0),
    scaleX,
    scaleY,
    rotation: readRotationDegrees(input),
    visible: input?.visible !== false,
    opacity: safeNumber(input?.opacity ?? input?.alpha, 1)
  };
}

function readHeadScaleFields(input: any, fallbackScale: number) {
  const scale = typeof input?.scale === 'object' && input.scale !== null ? input.scale : null;
  return readImportedScales(
    scale?.x ?? input?.scaleX ?? input?.sx,
    scale?.y ?? input?.scaleY ?? input?.sy,
    fallbackScale
  );
}

function normalizeLegacyDecorations(rawList: unknown, fallbackHeadScale = 1): DecorationImportResult {
  const list = Array.isArray(rawList) ? rawList : [];
  const decorationsBottomToTop: DecorationLayer[] = [];
  const originalIndexToId: Array<string | null> = [];
  let headOriginalIndex = -1;
  let headLayer = defaultHeadLayer(fallbackHeadScale);

  list.forEach((item, originalIndex) => {
    const raw = item as any;
    const code = raw?.code ?? raw?.c ?? raw?.assetId;
    if (!code) {
      originalIndexToId[originalIndex] = null;
      return;
    }

    if (isHeadDecoCode(code)) {
      headOriginalIndex = originalIndex;
      headLayer = readHeadLayer(raw, fallbackHeadScale);
      originalIndexToId[originalIndex] = null;
      return;
    }

    // Do not override `code`/`assetId` here. normalizeDecoration() now keeps the
    // original `c` value and marks the layer as missing when no PartOption is
    // available, so legacy exports with unknown `third_halloween_deco_*` /
    // `skydow_halloween_deco_*` symbols render as placeholders rather than as
    // the first deco with the imported sx/sy/r forced on top.
    const deco = normalizeDecoration(raw, decorationsBottomToTop.length);
    decorationsBottomToTop.push(deco);
    originalIndexToId[originalIndex] = deco.id;
  });

  // RoleDecosConfig.generateDisguise() adds children in saved order
  // (bottom-to-top). The React editor keeps normal decorations top-first, so
  // reverse only the real deco list and keep a separate virtual index for the
  // original HEAD_CODE layer.
  const decorations = decorationsBottomToTop.slice().reverse();
  const nonHeadAbove = headOriginalIndex >= 0
    ? list.slice(headOriginalIndex + 1).filter((item) => {
      const raw = item as any;
      const code = raw?.code ?? raw?.c ?? raw?.assetId;
      return code && !isHeadDecoCode(code);
    }).length
    : 0;
  const headLayerIndex = headOriginalIndex >= 0
    ? normalizeHeadLayerIndex(nonHeadAbove, decorations.length, decorations.length)
    : decorations.length;

  return { decorations, originalIndexToId, headLayerIndex, headLayer };
}

function normalizeGroups(input: unknown, decorations: DecorationLayer[], originalIndexToId?: Array<string | null>): DecorationGroup[] {
  if (!Array.isArray(input)) return [];
  const existingIds = new Set(decorations.map((item) => item.id));
  const claimedIds = new Set<string>();

  return input
    .map((raw, index) => {
      const group = raw as Partial<DecorationGroup> & { items?: unknown[]; itemIndexes?: unknown[] };
      const mapIndexes = (indexes: unknown[]) => indexes.map((itemIndex) => {
        const numericIndex = Number(itemIndex);
        return originalIndexToId ? originalIndexToId[numericIndex] : decorations[numericIndex]?.id;
      });
      const rawIds = Array.isArray(group.itemIds)
        ? group.itemIds
        : Array.isArray(group.itemIndexes)
          ? mapIndexes(group.itemIndexes)
          : Array.isArray(group.items)
            ? group.items.every((item) => typeof item === 'number' || /^\d+$/.test(String(item)))
              ? mapIndexes(group.items)
              : group.items
            : [];
      const itemIds = rawIds
        .map((id) => String(id ?? ''))
        .filter((id) => existingIds.has(id) && !claimedIds.has(id));
      itemIds.forEach((id) => claimedIds.add(id));
      if (itemIds.length < 2) return null;
      return {
        id: typeof group.id === 'string' ? group.id : createId('group'),
        name: typeof group.name === 'string' && group.name.trim() ? group.name : `Group ${index + 1}`,
        itemIds,
        visible: group.visible !== false,
        collapsed: !!group.collapsed
      } satisfies DecorationGroup;
    })
    .filter(Boolean) as DecorationGroup[];
}

function normalizeGender(value: unknown, fallback: GenderCode = 'male'): GenderCode {
  if (value === true || value === 'female' || value === 'FEMALE' || value === 'f') return 'female';
  if (value === false || value === 'male' || value === 'MALE' || value === 'm') return 'male';
  return fallback;
}

function extractDefaultRole(raw: any) {
  return raw?.defaultRole ?? raw?.data?.defaultRole ?? raw?.role?.defaultRole ?? raw?.default ?? null;
}

function extractConfig(raw: any) {
  return (
    raw?.customRoleConfig ??
    raw?.cr ??
    raw?.data?.customRoleConfig ??
    raw?.data?.cr ??
    raw?.role?.customRoleConfig ??
    raw?.role?.cr ??
    raw?.config ??
    raw
  );
}

function getLegacyDecoList(config: any): unknown[] {
  if (Array.isArray(config?.decolist)) return config.decolist;
  if (Array.isArray(config?.deco)) return config.deco;
  if (Array.isArray(config?.decorations)) return config.decorations;
  if (Array.isArray(config?.items)) return config.items;
  return [];
}

function normalizeRoleDocument(rawRole: Partial<RoleDocument> & any, envelope?: any): RoleDocument {
  const normalizedCamp = normalizeCampCode(rawRole.camp);
  const base = createDefaultRole(normalizedCamp, normalizeGender(rawRole.gender));
  const partFrames = { ...defaultPartFrames(), ...(rawRole.partFrames ?? {}) } as RolePartFrames;
  const partScales = { ...defaultPartScales(), ...(rawRole.partScales ?? {}) } as RolePartScales;
  const parts = { ...base.parts, ...(rawRole.parts ?? {}) };

  BODY_PART_TABS.forEach((tab) => {
    const resolved = resolvePart(tab, parts[tab] ?? partFrames[tab], partScales[tab]);
    parts[tab] = resolved.id;
    partFrames[tab] = resolved.frame;
    partScales[tab] = sanitizePartScale(partScales[tab], resolved.scale);
  });

  const decorations = Array.isArray(rawRole.decorations)
    ? (rawRole.decorations as unknown[]).map((item, index) => normalizeDecoration(item, index))
    : [];
  const headLayer = readHeadLayer(rawRole.headLayer, partScales.head);
  const headLayerIndex = normalizeHeadLayerIndex(rawRole.headLayerIndex, decorations.length, decorations.length);
  const prRaw = rawRole.positionRange;
  const prNum = typeof prRaw === 'number' ? prRaw : typeof prRaw === 'string' ? Number(prRaw) : NaN;
  const positionRange =
    Number.isFinite(prNum) && prNum > 0 ? Math.min(prNum, 10000) : base.positionRange ?? 60;

  return {
    ...base,
    ...rawRole,
    schemaVersion: 1,
    camp: String(normalizedCamp ?? base.camp),
    gender: normalizeGender(rawRole.gender, base.gender),
    parts,
    partFrames,
    partScales,
    headLayerIndex,
    headLayer,
    positionRange,
    decorations,
    groups: normalizeGroups(rawRole.groups ?? envelope?.decoGroups, decorations),
    updatedAt: new Date().toISOString()
  };
}

function convertLegacyRole(raw: any, envelope?: any): RoleDocument {
  const defaultRole = extractDefaultRole(raw);
  const campRaw = defaultRole?.defaultCamp?.code ?? defaultRole?.camp?.code ?? defaultRole?.defaultCamp ?? defaultRole?.camp;
  const camp = normalizeCampCode(campRaw);
  const gender = normalizeGender(defaultRole?.female ?? defaultRole?.gender ?? raw?.female ?? raw?.gender);
  const base = createDefaultRole(camp, gender);
  const config = extractConfig(raw) ?? {};

  const selections = BODY_PART_TABS.reduce((acc, tab) => {
    acc[tab] = resolvePart(tab, config?.[tab], 1);
    return acc;
  }, {} as Record<BodyPartTab, PartSelection>);

  const partFrames = BODY_PART_TABS.reduce((acc, tab) => {
    acc[tab] = selections[tab].frame;
    return acc;
  }, {} as RolePartFrames);

  const partScales = BODY_PART_TABS.reduce((acc, tab) => {
    acc[tab] = selections[tab].scale;
    return acc;
  }, {} as RolePartScales);

  const importedDecos = normalizeLegacyDecorations(getLegacyDecoList(config), partScales.head);

  return {
    ...base,
    camp: String(camp ?? base.camp),
    gender,
    parts: {
      head: selections.head.id,
      hand: selections.hand.id,
      foot: selections.foot.id,
      cape: selections.cape.id
    },
    partFrames,
    partScales,
    headLayerIndex: importedDecos.headLayerIndex,
    headLayer: importedDecos.headLayer,
    decorations: importedDecos.decorations,
    groups: normalizeGroups(raw?.decoGroups ?? envelope?.decoGroups, importedDecos.decorations, importedDecos.originalIndexToId),
    positionRange: base.positionRange ?? 60,
    updatedAt: new Date().toISOString()
  };
}

function collectMissingDecoCodes(role: RoleDocument): string[] {
  const missing = new Set<string>();
  for (const deco of role.decorations) {
    if (isMissingDecoAssetId(deco.assetId)) missing.add(deco.code);
  }
  return [...missing];
}

export function normalizeImportedRole(raw: unknown): ImportResult {
  const warnings: string[] = [];
  const envelope = raw as any;
  const candidate = envelope?.data?.schemaVersion === 1 ? envelope.data : envelope?.role?.schemaVersion === 1 ? envelope.role : envelope;

  let role: RoleDocument;
  if (candidate?.schemaVersion === 1 && candidate?.parts && Array.isArray(candidate?.decorations)) {
    role = normalizeRoleDocument(candidate, envelope);
  } else {
    warnings.push('Imported a legacy or foreign role file. Original ActorPart frames/scales and deco sx/sy/r were preserved when present.');
    role = convertLegacyRole(envelope?.data ?? envelope, envelope);
  }

  const missingCodes = collectMissingDecoCodes(role);
  if (missingCodes.length) {
    const preview = missingCodes.slice(0, 5).join(', ');
    const suffix = missingCodes.length > 5 ? `, …(${missingCodes.length - 5} more)` : '';
    warnings.push(`Missing deco symbols preserved as placeholders: ${preview}${suffix}.`);
  }

  return { role, warnings };
}

function tryParseJsonText(bytes: Uint8Array): unknown | null {
  const text = new TextDecoder().decode(bytes).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function tryDecodeBase64(text: string): Uint8Array | null {
  try {
    const binary = atob(text.trim());
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function parseRoleFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let raw: unknown | null = null;

  if (bytes.length > 2 && bytes[0] === TWROLE_HEADER[0] && bytes[1] === TWROLE_HEADER[1]) {
    const text = ungzip(bytes.slice(2), { to: 'string' }) as string;
    raw = JSON.parse(text);
  } else {
    raw = tryParseJsonText(bytes);

    if (!raw) {
      try {
        // The original RoleEditor reads .twrole by dropping the first two bytes before gzip.
        // Some files use the same envelope with a different header value, so try this before raw gzip.
        const text = ungzip(bytes.slice(2), { to: 'string' }) as string;
        raw = JSON.parse(text);
      } catch {
        try {
          const text = ungzip(bytes, { to: 'string' }) as string;
          raw = JSON.parse(text);
        } catch {
          const text = new TextDecoder().decode(bytes).trim();
          const decoded = tryDecodeBase64(text);
          if (decoded) {
            const jsonText = ungzip(decoded, { to: 'string' }) as string;
            raw = JSON.parse(jsonText);
          }
        }
      }
    }
  }

  if (!raw) {
    throw new Error('Unsupported role file. Expected JSON, .twrole header+gzip, raw gzip JSON, or base64 gzip JSON.');
  }

  return normalizeImportedRole(raw);
}

export function exportOriginalLikeRoleConfig(role: RoleDocument) {
  const normalized = normalizeRoleDocument(role);
  const topFirstLayers: Array<DecorationLayer | 'head'> = [...normalized.decorations];
  topFirstLayers.splice(normalized.headLayerIndex, 0, 'head');
  const deco = topFirstLayers.reverse().map((layer) => {
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
      r: (layer.rotation * Math.PI) / 180
    };
  });

  return {
    head: { f: normalized.partFrames.head, s: normalized.headLayer.scaleX },
    cape: { f: normalized.partFrames.cape, s: normalized.partScales.cape },
    hand: { f: normalized.partFrames.hand, s: normalized.partScales.hand },
    foot: { f: normalized.partFrames.foot, s: normalized.partScales.foot },
    deco
  };
}

export { normalizeRoleDocument };
