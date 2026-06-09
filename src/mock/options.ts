import { makeMockAsset } from './assets';
import {
  actorAtlasFrames,
  actorFallbackFrameCounts,
  decorationAtlasFrames,
  decorationGafSymbols,
  gafSources,
  type GafAtlasFrame
} from './gafManifest';
import type { BodyPartTab, CampOption, GenderCode, PartOption, PartTab, RoleDocument, RoleParts } from '../types/role';
import { actorPartRuntime, defaultPartFrames, defaultPartScales, findFrameOption, parsePartFrameCode } from '../lib/runtime/twlibPartRuntime';

const palette = [
  ['#2dd4ff', '#0b4768'],
  ['#82f27e', '#125336'],
  ['#ffd166', '#75531a'],
  ['#ff7ab6', '#6a1647'],
  ['#c084fc', '#3d2365'],
  ['#f87171', '#611717'],
  ['#67e8f9', '#164e63'],
  ['#facc15', '#713f12']
] as const;

function pad(num: number): string {
  return String(num).padStart(2, '0');
}

function titleFromCode(code: string): string {
  return code
    .replace(/^lib_actor_/, '')
    .replace(/^lib_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function makeOption(category: PartTab, code: string, index: number, source: 'gaf' | 'mock', atlas?: GafAtlasFrame): PartOption {
  const [accent, secondary] = palette[index % palette.length];
  const id = `${category}-${code.replace(/[^a-z0-9_-]/gi, '-')}`;
  const label = titleFromCode(code);
  return {
    id,
    code,
    category,
    label,
    icon: makeMockAsset(category, accent, secondary, code, index),
    accent,
    secondary,
    mockKind: category,
    source,
    sourceFile: category === 'deco' ? gafSources.decorations : gafSources.actor,
    atlas
  } satisfies PartOption;
}

function makeMockOptions(category: PartTab, count: number, label: string): PartOption[] {
  return Array.from({ length: count }, (_, i) => makeOption(category, `${category}_${pad(i + 1)}`, i, 'mock')).map((option, i) => ({
    ...option,
    label: `${label} ${pad(i + 1)}`,
    icon: makeMockAsset(category, option.accent, option.secondary, `${label[0]}${i + 1}`, i),
    sourceFile: undefined
  }));
}

function makeActorFrameOptions(category: BodyPartTab): PartOption[] {
  const runtime = actorPartRuntime[category];
  const library = runtime.library;
  const fallbackFrameCount = actorFallbackFrameCounts[category];
  const atlasFrames = actorAtlasFrames[library] ?? [];
  const frameTotal = Math.max(atlasFrames.length, fallbackFrameCount);
  const options: PartOption[] = [];

  for (let frame = 1; frame <= frameTotal; frame += 1) {
    const index = options.length;
    // Original RoleEditor stores part selections by numeric frame `f`; it does
    // not store the GAF library name. Keeping `code` numeric makes imported
    // RoleDecosConfig JSON line up with TWLibLib.ActorPart.setFrame(frame, scale).
    const code = String(frame);
    const atlas = atlasFrames[frame - 1];
    const option = makeOption(category, code, index, 'gaf', atlas);
    const isEmpty = frame === runtime.emptyFrame;
    options.push({
      ...option,
      label: isEmpty ? `Empty (${titleFromCode(category)})` : `${titleFromCode(library)} ${pad(frame)}`,
      icon: makeMockAsset(category, option.accent, option.secondary, `${category[0]}-${frame}`, index),
      actorLibrary: library,
      frame,
      emptyFrame: runtime.emptyFrame,
      isEmpty
    });
  }

  const emptyIndex = options.findIndex((option) => option.isEmpty);
  if (category === 'cape' && emptyIndex > 0) {
    const [empty] = options.splice(emptyIndex, 1);
    options.unshift(empty);
  }

  return options.length ? options : makeMockOptions(category, fallbackFrameCount, titleFromCode(category));
}

export const partOptions: Record<PartTab, PartOption[]> = {
  deco: decorationGafSymbols.length
    ? decorationGafSymbols.map((code, index) => makeOption('deco', code, index, 'gaf', decorationAtlasFrames[code]))
    : makeMockOptions('deco', 160, 'Deco'),
  head: makeActorFrameOptions('head'),
  hand: makeActorFrameOptions('hand'),
  foot: makeActorFrameOptions('foot'),
  cape: makeActorFrameOptions('cape')
};

export const optionById: Record<string, PartOption> = Object.fromEntries(
  Object.values(partOptions).flat().map((option) => [option.id, option])
);
const decoOptionByCode: Record<string, PartOption> = Object.fromEntries(
  partOptions.deco.flatMap((option) => [[option.code, option], [option.id, option]])
);

export const camps: CampOption[] = [
  { code: 'skydow', name: '天影十字軍', accent: '#31d6ff' },
  { code: 'royal', name: '皇家騎士團', accent: '#ff7171' },
  { code: 'third', name: '第三勢力', accent: '#8ef28a' },
  { code: 'civil', name: '無關陣營', accent: '#facc15' }
];

const playerCampCodes = ['skydow', 'royal', 'third'] as const;
type PlayerCampCode = (typeof playerCampCodes)[number];
const sharedDecoRank = playerCampCodes.length;
const unknownDecoRank = sharedDecoRank + 1;
const decoCodeCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const legacyBodyPartFrames: Record<BodyPartTab, Record<PlayerCampCode, number[]>> = {
  head: {
    skydow: [36, 37, 38, 39, 40, 41, 86, 93, 94],
    royal: [45, 46, 50, 51, 52, 53, 87, 91, 92],
    third: [42, 43, 44, 47, 48, 49, 88, 95, 96]
  },
  hand: {
    skydow: [2, 8, 11, 12, 13, 14, 15, 16, 27, 28, 35, 49, 55, 56, 61, 65, 66],
    royal: [3, 8, 17, 18, 19, 24, 25, 26, 31, 32, 33, 47, 48, 50, 57, 58, 63, 64],
    third: [8, 20, 21, 22, 23, 29, 30, 34, 36, 37, 38, 40, 45, 46, 59, 60, 62, 67, 68]
  },
  foot: {
    skydow: [1, 3, 4, 13, 21, 23, 24, 25, 26, 27, 28, 43, 53, 54, 55, 56, 66, 67, 69, 70, 77, 78],
    royal: [2, 5, 6, 7, 8, 18, 29, 30, 31, 32, 33, 39, 40, 41, 42, 46, 64, 65, 73, 74, 79, 80],
    third: [9, 10, 22, 34, 35, 36, 37, 38, 44, 45, 47, 48, 49, 50, 51, 52, 58, 62, 63, 71, 72, 75, 76]
  },
  cape: {
    skydow: [12, 13, 21, 24, 25],
    royal: [2, 3, 5, 6, 14, 15, 16, 20],
    third: [4, 7, 9, 10, 17, 18]
  }
};

const legacyCampCodeMap: Record<string, string> = {
  camp1: 'skydow',
  camp2: 'royal',
  camp3: 'third',
  camp4: 'civil'
};

export function normalizeCampCode(raw: string | null | undefined): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const code = raw.trim();
  if (!code) return undefined;
  return legacyCampCodeMap[code] ?? code;
}

function toPlayerCampCode(raw: string | null | undefined): PlayerCampCode | 'civil' | null {
  const code = normalizeCampCode(raw);
  if (!code) return null;
  if (code === 'civil') return 'civil';
  if ((playerCampCodes as readonly string[]).includes(code)) return code as PlayerCampCode;
  return null;
}

function isAllCampDeco(code: string): boolean {
  return code.startsWith('xmas_deco_');
}

function decoCampRank(code: string): number {
  const campIndex = playerCampCodes.findIndex((camp) => code.startsWith(`${camp}_`));
  if (campIndex >= 0) return campIndex;
  return isAllCampDeco(code) ? sharedDecoRank : unknownDecoRank;
}

function compareDecoOptions(left: PartOption, right: PartOption): number {
  return (
    decoCampRank(left.code) - decoCampRank(right.code) ||
    decoCodeCollator.compare(left.code, right.code) ||
    decoCodeCollator.compare(left.label, right.label) ||
    left.id.localeCompare(right.id)
  );
}

function sortDecoOptions(options: PartOption[]): PartOption[] {
  return [...options].sort(compareDecoOptions);
}

function filterBodyPartOptionsByCamp(tab: BodyPartTab, camp: PlayerCampCode): PartOption[] {
  const frames = legacyBodyPartFrames[tab][camp];
  const order = new Map(frames.map((frame, index) => [frame, index]));
  return partOptions[tab]
    .filter((option) => option.frame != null && order.has(option.frame))
    .sort((left, right) => (order.get(left.frame ?? 0) ?? 0) - (order.get(right.frame ?? 0) ?? 0));
}

export function filterPartOptionsByCamp(tab: PartTab, campRaw: string): PartOption[] {
  const normalizedCamp = toPlayerCampCode(campRaw);
  if (!normalizedCamp) return partOptions[tab];
  if (normalizedCamp === 'civil') {
    if (tab === 'deco') {
      return sortDecoOptions(
        partOptions.deco.filter((option) =>
          isAllCampDeco(option.code) || playerCampCodes.some((camp) => option.code.startsWith(`${camp}_`))
        )
      );
    }
    return partOptions[tab];
  }

  if (tab === 'deco') {
    return sortDecoOptions(partOptions.deco.filter((option) => isAllCampDeco(option.code) || option.code.startsWith(`${normalizedCamp}_`)));
  }

  return filterBodyPartOptionsByCamp(tab, normalizedCamp);
}

export const genders: { code: GenderCode; name: string }[] = [
  { code: 'male', name: 'Male' },
  { code: 'female', name: 'Female' }
];

export const tabLabels: Record<PartTab, string> = {
  deco: 'Deco',
  head: 'Head',
  hand: 'Hand',
  foot: 'Foot',
  cape: 'Cape'
};

export function defaultParts(): RoleParts {
  return {
    head: findFrameOption(partOptions.head, actorPartRuntime.head.defaultFrame)?.id ?? partOptions.head[0].id,
    hand: findFrameOption(partOptions.hand, actorPartRuntime.hand.defaultFrame)?.id ?? partOptions.hand[0].id,
    foot: findFrameOption(partOptions.foot, actorPartRuntime.foot.defaultFrame)?.id ?? partOptions.foot[0].id,
    cape: findFrameOption(partOptions.cape, actorPartRuntime.cape.defaultFrame)?.id ?? partOptions.cape[0].id
  };
}

export function createDefaultRole(camp = camps[0].code, gender: GenderCode = 'male'): RoleDocument {
  return {
    schemaVersion: 1,
    name: 'Mock Twilight Role',
    camp,
    gender,
    positionRange: 60,
    parts: defaultParts(),
    partFrames: defaultPartFrames(),
    partScales: defaultPartScales(),
    headLayerIndex: 0,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [],
    groups: [],
    updatedAt: new Date().toISOString()
  };
}

export function findOptionByCode(category: PartTab, code: string): PartOption | undefined {
  if (category === 'deco') {
    return decoOptionByCode[code];
  }
  const direct = partOptions[category].find((item) => item.code === code || item.id === code);
  if (direct) return direct;
  const frame = parsePartFrameCode(code);
  if (frame != null) return findFrameOption(partOptions[category], frame);

  return undefined;
}

export function getBodyPartOption(category: BodyPartTab, id: string): PartOption {
  return optionById[id] ?? partOptions[category][0];
}
