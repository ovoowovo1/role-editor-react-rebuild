import { useEffect, type MutableRefObject } from 'react';
import { BODY_ANIMATION_FRAME_MS } from '../../constants/stage';
import { quarterTurnRotationRadians } from '../../lib/stage/characterStageHelpers';
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
  sceneRef,
  lastPlaybackResetRef,
  sceneVersion,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  bodyAnimationRestartKey
}: {
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

    const isActive = () => !cancelled && sceneRef.current === scene && !scene.actorClip.destroyed;
    const tick = (time: number) => {
      if (!isActive()) return;
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
      }
      accumulated = advance.remainingMs;
      rafId = requestAnimationFrame(tick);
    };

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
      }
      if (bodyAnimationPlaying) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    const weaponAtlas = prepareWeaponAtlasForAnimation(bodyAnimationLabel);
    if (weaponAtlas) void weaponAtlas.then(begin);
    else begin();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [bodyAnimationLabel, bodyAnimationPlaying, bodyAnimationRestartKey, lastPlaybackResetRef, sceneRef, sceneVersion]);
}

export function useStageTransform(
  sceneRef: MutableRefObject<StageSceneState | null>,
  stageScale: number,
  facingQuarterTurns: number
) {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.actorStage.scale.set(stageScale);
    scene.actorStage.rotation = quarterTurnRotationRadians(facingQuarterTurns);
  }, [facingQuarterTurns, sceneRef, stageScale]);
}
