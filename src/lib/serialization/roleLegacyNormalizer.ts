import { createDefaultRole, normalizeCampCode } from '../../mock/options';
import { DEFAULT_POSITION_RANGE } from '../../constants/editor';
import type { BodyPartTab, DecorationLayer, HeadLayerTransform, RoleDocument, RolePartFrames, RolePartScales } from '../../types/role';
import { normalizeLegacyDecoGroups } from './legacyDecoGroups';
import { BODY_PART_TABS } from '../runtime/twlibPartRuntime';
import { defaultHeadLayer, isHeadDecoCode, normalizeHeadLayerIndex } from './roleSerializationLegacy';
import { asArray, asRecord, readProperty } from './rawInput';
import { normalizeDecoration, normalizeGender, readHeadLayer, resolvePart } from './roleSchemaV1';

interface PartSelection { id: string; frame: number; scale: number; }
interface DecorationImportResult { decorations: DecorationLayer[]; originalIndexToId: Array<string | null>; headLayerIndex: number; headLayer: HeadLayerTransform; }

function extractDefaultRole(raw: unknown): unknown {
  return readProperty(raw, 'defaultRole') ?? readProperty(readProperty(raw, 'data'), 'defaultRole')
    ?? readProperty(readProperty(raw, 'role'), 'defaultRole') ?? readProperty(raw, 'default') ?? null;
}

function extractConfig(raw: unknown): unknown {
  return readProperty(raw, 'customRoleConfig')
    ?? readProperty(raw, 'cr')
    ?? readProperty(readProperty(raw, 'data'), 'customRoleConfig')
    ?? readProperty(readProperty(raw, 'data'), 'cr')
    ?? readProperty(readProperty(raw, 'role'), 'customRoleConfig')
    ?? readProperty(readProperty(raw, 'role'), 'cr')
    ?? readProperty(raw, 'config')
    ?? raw;
}

function getLegacyDecoList(config: unknown): unknown[] {
  const configRecord = asRecord(config);
  for (const key of ['decolist', 'deco', 'decorations', 'items']) {
    const value = readProperty(configRecord, key);
    if (Array.isArray(value)) return value;
  }
  return [];
}
export function normalizeLegacyDecorations(rawList: unknown, fallbackHeadScale = 1): DecorationImportResult {
  const list = asArray(rawList);
  const decorationsBottomToTop: DecorationLayer[] = [];
  const originalIndexToId: Array<string | null> = [];
  let headOriginalIndex = -1;
  let headLayer = defaultHeadLayer(fallbackHeadScale);

  list.forEach((item, originalIndex) => {
    const raw = asRecord(item);
    const code = readProperty(raw, 'code') ?? readProperty(raw, 'c') ?? readProperty(raw, 'assetId');
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
      const raw = asRecord(item);
      const code = readProperty(raw, 'code') ?? readProperty(raw, 'c') ?? readProperty(raw, 'assetId');
      return Boolean(code) && !isHeadDecoCode(code);
    }).length
    : 0;
  const headLayerIndex = headOriginalIndex >= 0
    ? normalizeHeadLayerIndex(nonHeadAbove, decorations.length, decorations.length)
    : decorations.length;

  return { decorations, originalIndexToId, headLayerIndex, headLayer };
}

export function convertLegacyRole(raw: unknown, envelope?: unknown): RoleDocument {
  const rawRecord = asRecord(raw) ?? {};
  const envelopeRecord = asRecord(envelope);
  const defaultRole = asRecord(extractDefaultRole(rawRecord));
  const defaultCamp = readProperty(defaultRole, 'defaultCamp');
  const campRecord = asRecord(defaultCamp);
  const campRaw = readProperty(campRecord, 'code') ?? readProperty(asRecord(readProperty(defaultRole, 'camp')), 'code')
    ?? defaultCamp ?? readProperty(defaultRole, 'camp');
  const camp = normalizeCampCode(typeof campRaw === 'string' ? campRaw : typeof campRaw === 'number' ? String(campRaw) : undefined);
  const gender = normalizeGender(readProperty(defaultRole, 'female') ?? readProperty(defaultRole, 'gender')
    ?? readProperty(rawRecord, 'female') ?? readProperty(rawRecord, 'gender'));
  const base = createDefaultRole(camp, gender);
  const config = asRecord(extractConfig(rawRecord)) ?? {};

  const selections = BODY_PART_TABS.reduce((acc, tab) => {
    acc[tab] = resolvePart(tab, readProperty(config, tab), 1);
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
    positionRange: base.positionRange ?? DEFAULT_POSITION_RANGE,
    updatedAt: new Date().toISOString()
  };

  return {
    ...roleWithoutGroups,
    groups: normalizeLegacyDecoGroups(readProperty(rawRecord, 'decoGroups') ?? readProperty(envelopeRecord, 'decoGroups'), roleWithoutGroups)
  };
}

