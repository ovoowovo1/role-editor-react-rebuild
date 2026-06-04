import { useEffect, type MutableRefObject } from 'react';
import { BODY_ANIMATION_FRAME_MS } from '../../constants/stage';
import { quarterTurnRotationRadians } from '../../lib/stage/characterStageHelpers';
import type { StageSceneState } from './types';

interface PlaybackResetState {
  sceneVersion: number;
  label: string;
  restartKey: number;
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

    const lastReset = lastPlaybackResetRef.current;
    if (
      lastReset.sceneVersion !== sceneVersion ||
      lastReset.label !== bodyAnimationLabel ||
      lastReset.restartKey !== bodyAnimationRestartKey
    ) {
      scene.actorClip.setBodyFrame(bodyAnimationLabel);
      lastPlaybackResetRef.current = {
        sceneVersion,
        label: bodyAnimationLabel,
        restartKey: bodyAnimationRestartKey
      };
    }

    if (!bodyAnimationPlaying) return;

    let rafId = 0;
    let lastTime = performance.now();
    let accumulated = 0;

    const advanceFrame = () => {
      const currentScene = sceneRef.current;
      if (currentScene !== scene || scene.actorClip.destroyed) return;
      const range = scene.actorClip.getBodyFrameRange(bodyAnimationLabel);
      const currentFrame = scene.actorClip.body.currentFrame;
      const nextFrame = currentFrame >= range.endFrame ? range.startFrame : currentFrame + 1;
      scene.actorClip.setBodyFrame(nextFrame);
    };

    const tick = (time: number) => {
      const currentScene = sceneRef.current;
      if (currentScene !== scene || scene.actorClip.destroyed) return;
      accumulated += time - lastTime;
      lastTime = time;
      while (accumulated >= BODY_ANIMATION_FRAME_MS) {
        advanceFrame();
        accumulated -= BODY_ANIMATION_FRAME_MS;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
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
    scene.updatePosition();
    const rafId = requestAnimationFrame(scene.updatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [facingQuarterTurns, sceneRef, stageScale]);
}
