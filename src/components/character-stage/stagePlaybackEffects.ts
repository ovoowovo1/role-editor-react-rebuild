import { useEffect, type MutableRefObject } from 'react';
import type { Application } from 'pixi.js';
import { BODY_ANIMATION_FRAME_MS } from '../../constants/stage';
import { quarterTurnRotationRadians } from '../../lib/stage/characterStageHelpers';
import { requestStageRender } from './stageApplicationLifecycle';
import type { StageSceneState } from './types';
import {
  clearLoadedWeaponAtlasFailure,
  prepareWeaponAtlasForAnimation,
  recordWeaponAtlasResult
} from '../../lib/runtime/weaponAtlasAvailability';

interface PlaybackResetState {
  sceneVersion: number;
  label: string;
  restartKey: number;
}

export interface BodyAnimationFrameRange {
  startFrame: number;
  endFrame: number;
}

export interface BodyAnimationAdvance {
  nextFrame: number | null;
  remainingMs: number;
}

/**
 * Calculate the frame to display after elapsed playback time without walking
 * through every intermediate frame. The returned remainder keeps sub-frame
 * timing intact for the next RAF callback.
 */
export function calculateBodyAnimationAdvance(
  currentFrame: number,
  range: BodyAnimationFrameRange,
  accumulatedMs: number
): BodyAnimationAdvance {
  if (!Number.isFinite(accumulatedMs) || accumulatedMs < 0) {
    return { nextFrame: null, remainingMs: 0 };
  }

  const elapsedFrames = Math.floor(accumulatedMs / BODY_ANIMATION_FRAME_MS);
  const remainingMs = accumulatedMs - elapsedFrames * BODY_ANIMATION_FRAME_MS;
  const validRange =
    Number.isInteger(range.startFrame) &&
    Number.isInteger(range.endFrame) &&
    range.startFrame <= range.endFrame;
  if (!validRange || elapsedFrames <= 0) {
    return { nextFrame: null, remainingMs };
  }

  const frameCount = range.endFrame - range.startFrame + 1;
  const currentOffset = Number.isFinite(currentFrame)
    ? ((currentFrame - range.startFrame) % frameCount + frameCount) % frameCount
    : frameCount - 1;
  const nextOffset = (currentOffset + elapsedFrames) % frameCount;

  return {
    nextFrame: range.startFrame + nextOffset,
    remainingMs
  };
}

export function useBodyAnimationPlayback({
  appRef,
  hostRef,
  sceneRef,
  lastPlaybackResetRef,
  sceneVersion,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  bodyAnimationRestartKey
}: {
  appRef: MutableRefObject<Application | null>;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  sceneRef: MutableRefObject<StageSceneState | null>;
  lastPlaybackResetRef: MutableRefObject<PlaybackResetState>;
  sceneVersion: number;
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  bodyAnimationRestartKey: number;
}) {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let cancelled = false;
    let rafId = 0;
    let lastTime = 0;
    let accumulated = 0;
    let contentSkipped = false;

    const isActive = () => !cancelled && sceneRef.current === scene && !scene.actorClip.destroyed;
    const canAnimate = () => isActive() && bodyAnimationPlaying && !document.hidden && !contentSkipped;

    const tick = (time: number) => {
      rafId = 0;
      if (!canAnimate()) return;
      accumulated += time - lastTime;
      lastTime = time;
      const range = scene.actorClip.getBodyFrameRange(bodyAnimationLabel);
      const advance = calculateBodyAnimationAdvance(
        scene.actorClip.body.currentFrame,
        range,
        accumulated
      );
      if (advance.nextFrame !== null) {
        scene.actorClip.setBodyFrame(advance.nextFrame);
        const app = appRef.current;
        if (app && !app.stage?.destroyed) {
          app.render();
        }
      }
      accumulated = advance.remainingMs;
      rafId = requestAnimationFrame(tick);
    };

    const syncLoop = () => {
      if (canAnimate()) {
        if (!rafId) {
          lastTime = performance.now();
          rafId = requestAnimationFrame(tick);
        }
      } else if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const handleVisibilityChange = () => syncLoop();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const host = hostRef.current;
    const supportsContentVisibility =
      typeof document !== 'undefined' && 'contentVisibility' in document.documentElement.style;
    let intersectionObserver: IntersectionObserver | null = null;
    const handleContentVisibilityStateChange = (event: Event) => {
      const skipped = Boolean((event as Event & { skipped?: boolean }).skipped);
      contentSkipped = skipped;
      syncLoop();
    };
    if (host) {
      if (supportsContentVisibility) {
        host.addEventListener('contentvisibilityautostatechange', handleContentVisibilityStateChange);
      } else if (typeof IntersectionObserver !== 'undefined') {
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            contentSkipped = !entry.isIntersecting;
            syncLoop();
          },
          { rootMargin: '200px' }
        );
        intersectionObserver.observe(host);
      }
    }

    const begin = (weaponAtlasReady?: boolean) => {
      if (!isActive()) return;
      const recovered = weaponAtlasReady === undefined && clearLoadedWeaponAtlasFailure(scene.failedTextures);
      if (weaponAtlasReady !== undefined) recordWeaponAtlasResult(scene.failedTextures, weaponAtlasReady);
      const lastReset = lastPlaybackResetRef.current;
      if (
        lastReset.sceneVersion !== sceneVersion ||
        lastReset.label !== bodyAnimationLabel ||
        lastReset.restartKey !== bodyAnimationRestartKey ||
        weaponAtlasReady === true ||
        recovered
      ) {
        scene.actorClip.setBodyFrame(bodyAnimationLabel);
        lastPlaybackResetRef.current = {
          sceneVersion,
          label: bodyAnimationLabel,
          restartKey: bodyAnimationRestartKey
        };
        requestStageRender(appRef.current);
      }
      syncLoop();
    };

    const weaponAtlas = prepareWeaponAtlasForAnimation(bodyAnimationLabel);
    if (weaponAtlas) void weaponAtlas.then(begin);
    else begin();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (host && supportsContentVisibility) {
        host.removeEventListener('contentvisibilityautostatechange', handleContentVisibilityStateChange);
      }
      intersectionObserver?.disconnect();
    };
  }, [appRef, bodyAnimationLabel, bodyAnimationPlaying, bodyAnimationRestartKey, hostRef, lastPlaybackResetRef, sceneRef, sceneVersion]);
}

export function useStageTransform(
  appRef: MutableRefObject<Application | null>,
  sceneRef: MutableRefObject<StageSceneState | null>,
  stageScale: number,
  facingQuarterTurns: number
) {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.actorStage.scale.set(stageScale);
    scene.actorStage.rotation = quarterTurnRotationRadians(facingQuarterTurns);
    requestStageRender(appRef.current);
  }, [appRef, facingQuarterTurns, sceneRef, stageScale]);
}
