import { makeMockAsset } from './assets';
import {
  actorAtlasFrames,
  actorFallbackFrameCounts,
  actorRuntimeManifest,
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

function isCampTaggedLinkage(linkage: string, camp: PlayerCampCode): boolean {
  const lower = linkage.toLowerCase();
  const token = new RegExp(`(?:^|_)${camp}(?:_|$)`, 'i');
  return token.test(lower);
}

function isAllCampDeco(code: string): boolean {
  return code.startsWith('xmas_deco_');
}

function collectActorFrameCampMap(tab: BodyPartTab): Map<number, Set<PlayerCampCode>> | null {
  const runtime = actorRuntimeManifest;
  if (!runtime) return null;
  const linkage = actorPartRuntime[tab].library;
  const timelineId = runtime.timelinesByLinkage[linkage];
  const timeline = timelineId ? runtime.timelinesById[timelineId] : undefined;
  if (!timeline) return null;

  const map = new Map<number, Set<PlayerCampCode>>();
  for (let frame = 1; frame <= timeline.framesCount; frame += 1) {
    const insts = timeline.frames[String(frame)] ?? [];
    const frameCamps = new Set<PlayerCampCode>();
    for (const inst of insts) {
      const ao = timeline.animationObjects[inst.objectId];
      if (!ao || ao.mask) continue;
      const element = runtime.elements[String(ao.regionId)];
      const linkageName = element?.linkageName ?? '';
      for (const camp of playerCampCodes) {
        if (isCampTaggedLinkage(linkageName, camp)) frameCamps.add(camp);
      }
    }
    map.set(frame, frameCamps);
  }
  return map;
}

const actorFrameCampMapByTab: Partial<Record<BodyPartTab, Map<number, Set<PlayerCampCode>> | null>> = {
  head: collectActorFrameCampMap('head'),
  hand: collectActorFrameCampMap('hand'),
  foot: collectActorFrameCampMap('foot'),
  cape: collectActorFrameCampMap('cape')
};

export function filterPartOptionsByCamp(tab: PartTab, campRaw: string): PartOption[] {
  const normalizedCamp = toPlayerCampCode(campRaw);
  if (!normalizedCamp) return partOptions[tab];
  if (normalizedCamp === 'civil') {
    if (tab === 'deco') {
      return partOptions.deco.filter((option) =>
        isAllCampDeco(option.code) || playerCampCodes.some((camp) => option.code.startsWith(`${camp}_`))
      );
    }
    return partOptions[tab];
  }

  if (tab === 'deco') {
    return partOptions.deco.filter((option) => isAllCampDeco(option.code) || option.code.startsWith(`${normalizedCamp}_`));
  }

  const frameCampMap = actorFrameCampMapByTab[tab as BodyPartTab];
  if (!frameCampMap) return partOptions[tab];

  return partOptions[tab].filter((option) => {
    if (option.isEmpty) return true;
    const frame = option.frame ?? parsePartFrameCode(option.code);
    if (!frame) return true;
    const campsForFrame = frameCampMap.get(frame);
    if (!campsForFrame || !campsForFrame.size) return true;
    return campsForFrame.has(normalizedCamp);
  });
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
