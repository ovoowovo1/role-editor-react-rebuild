import { describe, expect, it } from 'vitest';
import { getActorBodyAnimationOptions } from './actorBodyAnimation';

describe('actor body animation metadata', () => {
  it('preserves generated sequence ranges and ordering without the full runtime manifest', () => {
    const options = getActorBodyAnimationOptions();

    expect(options).toHaveLength(86);
    expect(options[0]).toEqual({ label: 'IDLE_KNIFE_TYPE', startFrame: 3, endFrame: 6 });
    expect(options.find((option) => option.label === 'IDLE_KONGFU_TYPE')).toEqual({
      label: 'IDLE_KONGFU_TYPE',
      startFrame: 235,
      endFrame: 237
    });
    expect(options[options.length - 1]).toEqual({ label: 'RELOAD_MINIGUN', startFrame: 554, endFrame: 558 });
    expect(options.every((option, index) => index === 0 || options[index - 1].startFrame <= option.startFrame)).toBe(true);
  });
});
