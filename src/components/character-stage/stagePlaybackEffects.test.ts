import { describe, expect, it } from 'vitest';
import { BODY_ANIMATION_FRAME_MS } from '../../constants/stage';
import { calculateBodyAnimationAdvance } from './stagePlaybackEffects';

const range = { startFrame: 10, endFrame: 13 };

describe('calculateBodyAnimationAdvance', () => {
  it('advances by one frame for one frame of elapsed time', () => {
    expect(calculateBodyAnimationAdvance(10, range, BODY_ANIMATION_FRAME_MS)).toEqual({
      nextFrame: 11,
      remainingMs: 0
    });
  });

  it('wraps around the configured frame range', () => {
    expect(calculateBodyAnimationAdvance(13, range, BODY_ANIMATION_FRAME_MS)).toEqual({
      nextFrame: 10,
      remainingMs: 0
    });
  });

  it('jumps over hundreds of delayed frames in one calculation', () => {
    const result = calculateBodyAnimationAdvance(10, range, 719 * BODY_ANIMATION_FRAME_MS + 2);

    expect(result.nextFrame).toBe(13);
    expect(result.remainingMs).toBeCloseTo(2);
  });

  it('preserves a partial frame for the next callback', () => {
    const result = calculateBodyAnimationAdvance(10, range, BODY_ANIMATION_FRAME_MS / 2);

    expect(result.nextFrame).toBeNull();
    expect(result.remainingMs).toBeCloseTo(BODY_ANIMATION_FRAME_MS / 2);
  });

  it('safely ignores invalid ranges and invalid elapsed time', () => {
    expect(calculateBodyAnimationAdvance(10, { startFrame: 13, endFrame: 10 }, BODY_ANIMATION_FRAME_MS)).toEqual({
      nextFrame: null,
      remainingMs: 0
    });
    expect(calculateBodyAnimationAdvance(10, range, Number.NaN)).toEqual({
      nextFrame: null,
      remainingMs: 0
    });
  });

  it('starts from the beginning when the current frame is not finite', () => {
    expect(calculateBodyAnimationAdvance(Number.NaN, range, BODY_ANIMATION_FRAME_MS)).toEqual({
      nextFrame: 10,
      remainingMs: 0
    });
  });
});
