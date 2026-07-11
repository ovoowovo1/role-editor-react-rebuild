import { actorBodyAnimationSequences } from '../../mock/gafManifest';

export const DEFAULT_ACTOR_BODY_ANIMATION_LABEL = 'IDLE_KONGFU_TYPE';

export interface ActorBodyAnimationOption {
  label: string;
  startFrame: number;
  endFrame: number;
}

export function getActorBodyAnimationOptions(): ActorBodyAnimationOption[] {
  return Object.entries(actorBodyAnimationSequences)
    .map(([label, sequence]) => ({
      label,
      startFrame: sequence.startFrame,
      endFrame: sequence.endFrame
    }))
    .sort((a, b) => a.startFrame - b.startFrame || a.label.localeCompare(b.label));
}
