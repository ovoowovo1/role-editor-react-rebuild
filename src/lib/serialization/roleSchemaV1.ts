import { createDefaultRole, findOptionByCode, normalizeCampCode, partOptions } from '../../mock/options';
import { DEFAULT_POSITION_RANGE, MAX_POSITION_RANGE } from '../../constants/editor';
import type { BodyPartTab, DecorationLayer, GenderCode, HeadLayerTransform, PartOption, RoleDocument, RolePartFrames, RolePartScales } from '../../types/role';
import { createId, safeNumber } from '../math';
import { normalizeLegacyDecoGroups } from './legacyDecoGroups';
import { BODY_PART_TABS, defaultPartFrames, defaultPartScales, getPartFrame, sanitizePartFrame, sanitizePartScale } from '../runtime/twlibPartRuntime';
import { defaultHeadLayer, isMissingDecoAssetId, makeMissingDecoAssetId, normalizeHeadLayerIndex, readImportedScales, readRotationDegrees, rememberLegacyDecorationRotation } from './roleSerializationLegacy';
import { asArray, asRecord, asString, readProperty } from './rawInput';
interface PartSelection {
  id: string;
  frame: number;
  scale: number;
}

export function resolvePart(tab: BodyPartTab, raw: unknown, fallbackScale = 1): PartSelection {
  const rawRecord = asRecord(raw);
  const frameValue = readProperty(rawRecord, 'f') ?? readProperty(rawRecord, 'frame') ?? raw;
  const code = String(frameValue ?? '');
  const option = findOptionByCode(tab, code) ?? partOptions[tab][0];
  const frame = getPartFrame(option) ?? sanitizePartFrame(tab, frameValue);
  const scale = rawRecord
    ? sanitizePartScale(readProperty(rawRecord, 's') ?? readProperty(rawRecord, 'scale'), fallbackScale)
    : fallbackScale;

  return { id: option.id, frame, scale };
}

function resolveDecoOption(code: unknown): PartOption | null {
  const normalized = String(code ?? '').trim();
  if (!normalized) return null;
  return findOptionByCode('deco', normalized) ?? null;
}

function readHeadScaleFields(input: unknown, fallbackScale: number): { scaleX: number; scaleY: number } {
  const inputRecord = asRecord(input);
  const scaleRecord = asRecord(readProperty(inputRecord, 'scale'));
  return readImportedScales(
    readProperty(scaleRecord, 'x') ?? readProperty(inputRecord, 'scaleX') ?? readProperty(inputRecord, 'sx'),
    readProperty(scaleRecord, 'y') ?? readProperty(inputRecord, 'scaleY') ?? readProperty(inputRecord, 'sy'),
    fallbackScale
  );
}

export function readHeadLayer(input: unknown, fallbackScale = 1): HeadLayerTransform {
  const inputRecord = asRecord(input);
  if (!inputRecord) return defaultHeadLayer(fallbackScale);
  const position = asRecord(readProperty(inputRecord, 'position'));
  const { scaleX, scaleY } = readHeadScaleFields(inputRecord, fallbackScale);
  return {
    x: safeNumber(readProperty(position, 'x') ?? readProperty(inputRecord, 'x'), 0),
    y: safeNumber(readProperty(position, 'y') ?? readProperty(inputRecord, 'y'), 0),
    scaleX,
    scaleY,
    rotation: readRotationDegrees(inputRecord),
    visible: readProperty(inputRecord, 'visible') !== false,
    opacity: safeNumber(readProperty(inputRecord, 'opacity') ?? readProperty(inputRecord, 'alpha'), 1)
  };
}

export function normalizeDecoration(input: unknown, index: number): DecorationLayer {
  const inputRecord = asRecord(input);
  const rawCode = readProperty(inputRecord, 'code') ?? readProperty(inputRecord, 'c') ?? readProperty(inputRecord, 'assetId');
  const code = String(rawCode ?? '').trim() || 'unknown';
  const option = resolveDecoOption(rawCode);
  const rawId = readProperty(inputRecord, 'id');
  const id = typeof rawId === 'string' ? rawId : createId('deco');
  const rotation = readRotationDegrees(inputRecord);
  if (inputRecord && Object.prototype.hasOwnProperty.call(inputRecord, 'r')) {
    rememberLegacyDecorationRotation(id, readProperty(inputRecord, 'r'), rotation);
  }
  const position = asRecord(readProperty(inputRecord, 'position'));
  const scale = asRecord(readProperty(inputRecord, 'scale'));
  const { scaleX, scaleY } = readImportedScales(
    readProperty(scale, 'x') ?? readProperty(inputRecord, 'scaleX') ?? readProperty(inputRecord, 'sx'),
    readProperty(scale, 'y') ?? readProperty(inputRecord, 'scaleY') ?? readProperty(inputRecord, 'sy'),
    1
  );

  const rawAssetId = readProperty(inputRecord, 'assetId');
  const resolvedId = option?.id
    ?? (typeof rawAssetId === 'string' && !isMissingDecoAssetId(rawAssetId) ? rawAssetId : null)
    ?? makeMissingDecoAssetId(code);
  const rawName = readProperty(inputRecord, 'name');
  const resolvedName = typeof rawName === 'string'
    ? rawName
    : option
      ? `${option.label} ${index + 1}`
      : `Missing: ${code}`;

  return {
    id,
    code,
    assetId: resolvedId,
    name: resolvedName,
    x: safeNumber(readProperty(position, 'x') ?? readProperty(inputRecord, 'x'), 0),
    y: safeNumber(readProperty(position, 'y') ?? readProperty(inputRecord, 'y'), 0),
    scaleX,
    scaleY,
    rotation,
    visible: readProperty(inputRecord, 'visible') !== false,
    opacity: safeNumber(readProperty(inputRecord, 'opacity') ?? readProperty(inputRecord, 'alpha'), 1)
  };
}
export function normalizeGender(value: unknown, fallback: GenderCode = 'male'): GenderCode {
  if (value === true || value === 'female' || value === 'FEMALE' || value === 'f') return 'female';
  if (value === false || value === 'male' || value === 'MALE' || value === 'm') return 'male';
  return fallback;
}

export function normalizeRoleDocument(rawRole: unknown, envelope?: unknown): RoleDocument {
  const roleRecord = asRecord(rawRole) ?? {};
  const envelopeRecord = asRecord(envelope);
  const rawCamp = readProperty(roleRecord, 'camp');
  const normalizedCamp = normalizeCampCode(typeof rawCamp === 'string' ? rawCamp : undefined);
  const base = createDefaultRole(normalizedCamp, normalizeGender(readProperty(roleRecord, 'gender')));
  const partFrames = { ...defaultPartFrames(), ...asRecord(readProperty(roleRecord, 'partFrames')) } as RolePartFrames;
  const partScales = { ...defaultPartScales(), ...asRecord(readProperty(roleRecord, 'partScales')) } as RolePartScales;
  const parts = { ...base.parts, ...asRecord(readProperty(roleRecord, 'parts')) };

  BODY_PART_TABS.forEach((tab) => {
    const resolved = resolvePart(tab, parts[tab] ?? partFrames[tab], partScales[tab]);
    parts[tab] = resolved.id;
    partFrames[tab] = resolved.frame;
    partScales[tab] = sanitizePartScale(partScales[tab], resolved.scale);
  });

  const decorations = Array.isArray(readProperty(roleRecord, 'decorations'))
    ? asArray(readProperty(roleRecord, 'decorations')).map((item, index) => normalizeDecoration(item, index))
    : [];
  const headLayer = readHeadLayer(readProperty(roleRecord, 'headLayer'), partScales.head);
  const headLayerIndex = normalizeHeadLayerIndex(readProperty(roleRecord, 'headLayerIndex'), decorations.length, decorations.length);
  const prRaw = readProperty(roleRecord, 'positionRange');
  const prNum = typeof prRaw === 'number' ? prRaw : typeof prRaw === 'string' ? Number(prRaw) : NaN;
  const positionRange = Number.isFinite(prNum) && prNum > 0
    ? Math.min(prNum, MAX_POSITION_RANGE)
    : base.positionRange ?? DEFAULT_POSITION_RANGE;
  const rawName = asString(readProperty(roleRecord, 'name'), base.name);

  const roleWithoutGroups: RoleDocument = {
    ...base,
    name: rawName,
    schemaVersion: 1,
    camp: String(normalizedCamp ?? base.camp),
    gender: normalizeGender(readProperty(roleRecord, 'gender'), base.gender),
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
    groups: normalizeLegacyDecoGroups(readProperty(roleRecord, 'groups') ?? readProperty(envelopeRecord, 'decoGroups'), roleWithoutGroups)
  };
}
