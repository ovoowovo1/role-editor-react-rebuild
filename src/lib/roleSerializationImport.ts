import { ungzip } from 'pako';
import { createDefaultRole, findOptionByCode, normalizeCampCode, partOptions } from '../mock/options';
import type {
  BodyPartTab,
  DecorationLayer,
  GenderCode,
  HeadLayerTransform,
  ImportResult,
  PartOption,
  RoleDocument,
  RolePartFrames,
  RolePartScales
} from '../types/role';
import { createId, safeNumber } from './math';
import { normalizeLegacyDecoGroups } from './legacyDecoGroups';
import {
  BODY_PART_TABS,
  defaultPartFrames,
  defaultPartScales,
  getPartFrame,
  sanitizePartFrame,
  sanitizePartScale
} from './twlibPartRuntime';
import {
  TWROLE_HEADER,
  defaultHeadLayer,
  isHeadDecoCode,
  isMissingDecoAssetId,
  makeMissingDecoAssetId,
  normalizeHeadLayerIndex,
  readImportedScales,
  readRotationDegrees,
  rememberLegacyDecorationRotation
} from './roleSerializationLegacy';

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

function resolveDecoOption(code: unknown): PartOption | null {
  const normalized = String(code ?? '').trim();
  if (!normalized) return null;
  return findOptionByCode('deco', normalized) ?? null;
}

function readHeadScaleFields(input: any, fallbackScale: number) {
  const scale = typeof input?.scale === 'object' && input.scale !== null ? input.scale : null;
  return readImportedScales(
    scale?.x ?? input?.scaleX ?? input?.sx,
    scale?.y ?? input?.scaleY ?? input?.sy,
    fallbackScale
  );
}

function readHeadLayer(input: any, fallbackScale = 1): HeadLayerTransform {
  if (!input || typeof input !== 'object') return defaultHeadLayer(fallbackScale);
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
  const id = typeof input?.id === 'string' ? input.id : createId('deco');
  const rotation = readRotationDegrees(input);
  if (input && Object.prototype.hasOwnProperty.call(input, 'r')) {
    rememberLegacyDecorationRotation(id, input.r, rotation);
  }
  const position = typeof input?.position === 'object' && input.position !== null ? input.position : null;
  const scale = typeof input?.scale === 'object' && input.scale !== null ? input.scale : null;
  const { scaleX, scaleY } = readImportedScales(
    scale?.x ?? input?.scaleX ?? input?.sx,
    scale?.y ?? input?.scaleY ?? input?.sy,
    1
  );

  const resolvedId = option?.id
    ?? (typeof input?.assetId === 'string' && !isMissingDecoAssetId(input.assetId) ? input.assetId : null)
    ?? makeMissingDecoAssetId(code);
  const resolvedName = typeof input?.name === 'string'
    ? input.name
    : option
      ? `${option.label} ${index + 1}`
      : `Missing: ${code}`;

  return {
    id,
    code,
    assetId: resolvedId,
    name: resolvedName,
    x: safeNumber(position?.x ?? input?.x, 0),
    y: safeNumber(position?.y ?? input?.y, 0),
    scaleX,
    scaleY,
    rotation,
    visible: input?.visible !== false,
    opacity: safeNumber(input?.opacity ?? input?.alpha, 1)
  };
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

    const deco = normalizeDecoration(raw, decorationsBottomToTop.length);
    decorationsBottomToTop.push(deco);
    originalIndexToId[originalIndex] = deco.id;
  });

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

export function normalizeRoleDocument(rawRole: Partial<RoleDocument> & any, envelope?: any): RoleDocument {
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

  const roleWithoutGroups: RoleDocument = {
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
    groups: [],
    updatedAt: new Date().toISOString()
  };

  return {
    ...roleWithoutGroups,
    groups: normalizeLegacyDecoGroups(rawRole.groups ?? envelope?.decoGroups, roleWithoutGroups)
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

  const roleWithoutGroups: RoleDocument = {
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
    groups: [],
    positionRange: base.positionRange ?? 60,
    updatedAt: new Date().toISOString()
  };

  return {
    ...roleWithoutGroups,
    groups: normalizeLegacyDecoGroups(raw?.decoGroups ?? envelope?.decoGroups, roleWithoutGroups)
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
    const suffix = missingCodes.length > 5 ? `, ??${missingCodes.length - 5} more)` : '';
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

export function parseRoleBytes(bytes: Uint8Array): ImportResult {
  let raw: unknown | null = null;

  if (bytes.length > 2 && bytes[0] === TWROLE_HEADER[0] && bytes[1] === TWROLE_HEADER[1]) {
    const text = ungzip(bytes.slice(2), { to: 'string' }) as string;
    raw = JSON.parse(text);
  } else {
    raw = tryParseJsonText(bytes);

    if (!raw) {
      try {
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

export async function parseRoleFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  return parseRoleBytes(new Uint8Array(buffer));
}

type WorkerRequest = { type: 'parse-role'; bytes: ArrayBuffer };
type WorkerSuccess = { type: 'parse-role-ok'; result: ImportResult };
type WorkerFailure = { type: 'parse-role-error'; error: string };
type WorkerResponse = WorkerSuccess | WorkerFailure;

export async function parseRoleFileInWorker(file: File): Promise<ImportResult> {
  const bytes = await file.arrayBuffer();
  return new Promise<ImportResult>((resolve, reject) => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../workers/roleImportWorker.ts', import.meta.url), { type: 'module' });
      const cleanup = () => {
        worker?.terminate();
        worker = null;
      };
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        cleanup();
        if (message?.type === 'parse-role-ok') {
          resolve(message.result);
        } else {
          reject(new Error(message?.type === 'parse-role-error' ? message.error : 'Worker parse failed.'));
        }
      };
      worker.onerror = (event) => {
        cleanup();
        reject(new Error(event.message || 'Role import worker crashed.'));
      };
      const request: WorkerRequest = { type: 'parse-role', bytes };
      worker.postMessage(request, [bytes]);
    } catch (error) {
      worker?.terminate();
      reject(error);
    }
  });
}

