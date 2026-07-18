import { describe, expect, it } from 'vitest';
import { ExperienceMemory } from './experienceMemory';
import type { SourceTile } from './internalTypes';

function source(code: string): SourceTile {
  return {
    idx: 0,
    option: {} as SourceTile['option'],
    assetId: code,
    code,
    label: code,
    canvas: {} as SourceTile['canvas'],
    origW: 1,
    origH: 1,
    thumbW: 1,
    thumbH: 1,
    sFactor: 1,
    localCenterX: 0.5,
    localCenterY: 0.5,
    meanRgb: [255, 255, 255],
    stdRgb: [0, 0, 0],
    alphaRatio: 1,
    alphaSum: 255
  };
}

describe('ExperienceMemory checkpoint state', () => {
  it('round-trips adaptive source and color statistics exactly', () => {
    const sources = [source('one'), { ...source('two'), idx: 1 }];
    const original = new ExperienceMemory('', sources, true);
    original.noteTrial('one', [16, 32, 48], true, 0.005);
    original.noteTrial('two', [16, 32, 48], false, -0.001);

    const restored = new ExperienceMemory('', sources, true);
    expect(restored.restoreSnapshotState(original.snapshotState())).toBe(true);
    expect(restored.snapshotState()).toBe(original.snapshotState());
    expect(restored.sourceMultiplierForBin('one', '1,2,3')).toBe(
      original.sourceMultiplierForBin('one', '1,2,3')
    );
  });

  it('rejects malformed or non-finite checkpoint data without mutation', () => {
    const memory = new ExperienceMemory('', [source('one')], true);
    const before = memory.snapshotState();
    expect(memory.restoreSnapshotState('{bad')).toBe(false);
    expect(memory.restoreSnapshotState(JSON.stringify({
      version: 1,
      source_stats: { one: { trials: -1, accepted: 0, gain_sum: 0, ema_gain: 0 } },
      color_stats: {}
    }))).toBe(false);
    expect(memory.snapshotState()).toBe(before);
  });
});
