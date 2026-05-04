import { makeMockAsset } from './assets';
import { actorAtlasFrames, actorFallbackFrameCounts, decorationAtlasFrames, decorationGafSymbols, gafSources, type GafAtlasFrame } from './gafManifest';
import type { BodyPartTab, CampOption, GenderCode, PartOption, PartTab, RoleDocument, RoleParts } from '../types/role';
import { actorPartRuntime, defaultPartFrames, defaultPartScales, findFrameOption, parsePartFrameCode } from '../lib/twlibPartRuntime';

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

export const camps: CampOption[] = [
  { code: 'camp1', name: 'Revolution', accent: '#31d6ff' },
  { code: 'camp2', name: 'Empire', accent: '#ff7171' },
  { code: 'camp3', name: 'Frontier', accent: '#8ef28a' },
  { code: 'camp4', name: 'Campless', accent: '#facc15' }
];

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
  const direct = partOptions[category].find((item) => item.code === code || item.id === code);
  if (direct) return direct;

  if (category !== 'deco') {
    const frame = parsePartFrameCode(code);
    if (frame != null) return findFrameOption(partOptions[category], frame);
  }

  return undefined;
}

export function getBodyPartOption(category: BodyPartTab, id: string): PartOption {
  return optionById[id] ?? partOptions[category][0];
}
