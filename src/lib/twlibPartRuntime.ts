import type { BodyPartTab, PartOption, RolePartFrames, RolePartScales } from '../types/role';

// Extracted from the uploaded TWLibLib bundle.
// ActorPart.setFrame(frame, scale) calls clip.gotoAndStop(frame), then clip.scale.set(scale).
// ActorHead/ActorCape wrap the clip in a PIXI.Container, while ActorHand/ActorFoot are direct clips.
export const actorPartRuntime = {
  head: {
    library: 'lib_actor_head',
    emptyFrame: 76,
    defaultFrame: 1,
    hasContainer: true
  },
  hand: {
    library: 'lib_actor_hand',
    emptyFrame: 10,
    defaultFrame: 1,
    hasContainer: false
  },
  foot: {
    library: 'lib_actor_foot',
    emptyFrame: 19,
    defaultFrame: 1,
    hasContainer: false
  },
  cape: {
    library: 'lib_actor_cape',
    emptyFrame: 11,
    defaultFrame: 11,
    hasContainer: true
  }
} as const satisfies Record<BodyPartTab, { library: string; emptyFrame: number; defaultFrame: number; hasContainer: boolean }>;

export const BODY_PART_TABS: BodyPartTab[] = ['head', 'hand', 'foot', 'cape'];

export function parsePartFrameCode(code: string): number | null {
  const direct = Number(code);
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);

  const frameMatch = code.match(/(?:frame_|\/)(\d+)$/i);
  if (frameMatch) {
    const frame = Number(frameMatch[1]);
    return Number.isFinite(frame) && frame > 0 ? Math.round(frame) : null;
  }

  return null;
}

export function getPartFrame(option: PartOption | undefined): number | null {
  if (!option) return null;
  return option.frame ?? parsePartFrameCode(option.code);
}

export function sanitizePartFrame(category: BodyPartTab, frame: unknown): number {
  const numeric = typeof frame === 'number' ? frame : typeof frame === 'string' ? Number(frame) : NaN;
  if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric);
  return actorPartRuntime[category].defaultFrame;
}

export function sanitizePartScale(scale: unknown, fallback = 1): number {
  const numeric = typeof scale === 'number' ? scale : typeof scale === 'string' ? Number(scale) : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  const abs = Math.abs(numeric);
  if (abs < 0.001) return fallback;
  // The game editor permits very small Deco scales, but ActorPart frame scales are normal part scales.
  // Keep a wide but finite guard so malformed imports cannot explode the preview.
  return Math.max(0.001, Math.min(abs, 10));
}

export function defaultPartFrames(): RolePartFrames {
  return {
    head: actorPartRuntime.head.defaultFrame,
    hand: actorPartRuntime.hand.defaultFrame,
    foot: actorPartRuntime.foot.defaultFrame,
    cape: actorPartRuntime.cape.defaultFrame
  };
}

export function defaultPartScales(): RolePartScales {
  return {
    head: 1,
    hand: 1,
    foot: 1,
    cape: 1
  };
}

export function isRuntimeEmptyFrame(category: BodyPartTab, optionOrFrame: PartOption | number | undefined): boolean {
  const frame = typeof optionOrFrame === 'number' ? optionOrFrame : getPartFrame(optionOrFrame);
  return frame === actorPartRuntime[category].emptyFrame;
}

export function findFrameOption(options: PartOption[], frame: number): PartOption | undefined {
  return options.find((option) => getPartFrame(option) === frame);
}
