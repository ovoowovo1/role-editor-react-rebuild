import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  autoCreateSnapshotSettingsSignature
} from './contracts';

describe('AutoCreate snapshot settings identity', () => {
  it('keeps learned ordering in shadow mode until a Full benchmark approves rollout', () => {
    expect(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS.rankerEnabled).toBe(true);
    expect(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS.rankerRolloutApproved).toBe(false);
  });

  it('changes for algorithm settings but ignores observer-only cadence', () => {
    const baseline = autoCreateSnapshotSettingsSignature(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);
    expect(autoCreateSnapshotSettingsSignature({
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      candidateBatch: DEFAULT_AUTO_CREATE_TWROLE_SETTINGS.candidateBatch + 1
    })).not.toBe(baseline);
    expect(autoCreateSnapshotSettingsSignature({
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      searchStrategy: 'legacy'
    })).not.toBe(baseline);
    expect(autoCreateSnapshotSettingsSignature({
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      rankerRolloutApproved: true
    })).not.toBe(baseline);
    expect(autoCreateSnapshotSettingsSignature({
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      logEvery: 7,
      exportEvery: 13
    })).toBe(baseline);
    expect(autoCreateSnapshotSettingsSignature({
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      candidateBatch: Number.NaN
    })).not.toBe(autoCreateSnapshotSettingsSignature({
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      candidateBatch: Number.POSITIVE_INFINITY
    }));
  });
});
