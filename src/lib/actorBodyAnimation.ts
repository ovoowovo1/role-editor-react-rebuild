import { actorRuntimeManifest } from '../mock/gafManifest';

export const DEFAULT_ACTOR_BODY_ANIMATION_LABEL = 'IDLE_KONGFU_TYPE';
const ACTOR_BODY_LIBRARY = 'actor01_body';

export interface ActorBodyAnimationOption {
  label: string;
  startFrame: number;
  endFrame: number;
}

export function getActorBodyAnimationOptions(): ActorBodyAnimationOption[] {
  const bodyTimelineId = actorRuntimeManifest?.timelinesByLinkage[ACTOR_BODY_LIBRARY];
  const bodyTimeline = bodyTimelineId ? actorRuntimeManifest?.timelinesById[bodyTimelineId] : undefined;
  return Object.entries(bodyTimeline?.sequences ?? {})
    .map(([label, sequence]) => ({
      label,
      startFrame: sequence.startFrame,
      endFrame: sequence.endFrame
    }))
    .sort((a, b) => a.startFrame - b.startFrame || a.label.localeCompare(b.label));
}
