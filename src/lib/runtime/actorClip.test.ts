import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { actorAtlasFrames, actorRuntimeManifest, gafSources } from '../../mock/gafManifest';
import { partOptions } from '../../mock/options';
import { ActorCape } from './actorClip';
import { loadActorPartPreview, shouldUseActorPartRuntimePreview } from './actorPartPreview';
import { createActorGafClip, type GafMovieClip } from './gafMovieClip';

function childClipFrames(container: Container): number[] {
  return container.children
    .map((child) => (child as unknown as Partial<GafMovieClip>).currentFrame)
    .filter((frame): frame is number => typeof frame === 'number');
}

describe('ActorClip runtime cape rendering', () => {
  it('only uses runtime option previews for selected problematic cape frames', () => {
    for (const category of ['head', 'hand', 'foot'] as const) {
      expect(partOptions[category].some((option) => shouldUseActorPartRuntimePreview(option))).toBe(false);
      expect(loadActorPartPreview(partOptions[category][0])).toBeNull();
    }

    for (const frame of [2, 7, 13, 15, 16, 21, 24]) {
      const option = partOptions.cape.find((candidate) => candidate.frame === frame);

      expect(option).toBeDefined();
      expect(shouldUseActorPartRuntimePreview(option)).toBe(true);
    }

    for (const frame of [3, 4, 5, 6]) {
      const option = partOptions.cape.find((candidate) => candidate.frame === frame);

      expect(option).toBeDefined();
      expect(shouldUseActorPartRuntimePreview(option)).toBe(false);
    }

    const emptyCape = partOptions.cape.find((candidate) => candidate.isEmpty);
    expect(shouldUseActorPartRuntimePreview(emptyCape)).toBe(false);
  });

  it('renders cape nested timelines from their first frame for problematic cape frames', () => {
    const failedTextures = new Set([gafSources.actorTexture]);
    const cape = new ActorCape(failedTextures);

    for (const frame of [13, 15, 16]) {
      cape.setFrame(frame);
      const frames = childClipFrames(cape.clip);

      expect(frames.length).toBeGreaterThan(0);
      expect(frames.every((childFrame) => childFrame === 1)).toBe(true);
    }
  });

  it('keeps actor body nested animations sequence-relative', () => {
    const failedTextures = new Set([gafSources.actorTexture]);
    const body = createActorGafClip(
      failedTextures,
      'actor01_body',
      actorRuntimeManifest,
      gafSources.actorTexture,
      actorAtlasFrames.actor01_body ?? [],
      { dedupeNamedParts: true, nestedTimelineFrame: 'sequence-relative' }
    );

    body.gotoAndStop('FIRE_HANDGUN_TYPE');
    body.gotoAndStop(20);

    const animation = body.children.find((child) => child.name === 'animation') as unknown as Partial<GafMovieClip> | undefined;
    expect(animation?.currentFrame).toBe(3);
  });
});
