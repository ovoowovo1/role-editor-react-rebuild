import { describe, expect, it } from 'vitest';
import {
  autoCreateMaxSourceScaleForMode,
  clampAutoCreateOutputScales,
  createAutoCreateTwroleSourceSignature
} from './autoCreateTwrole';

describe('autoCreateTwrole source signatures', () => {
  const sources = [
    { assetId: 'asset-a', code: 'code-a' },
    { assetId: 'asset-b', code: 'code-b' }
  ];

  it('keeps deco and color block checkpoints separated', () => {
    expect(createAutoCreateTwroleSourceSignature('deco', sources)).toBe('deco|asset-a:code-a|asset-b:code-b');
    expect(createAutoCreateTwroleSourceSignature('colorBlock', sources)).toBe('colorBlock|asset-a:code-a|asset-b:code-b');
    expect(createAutoCreateTwroleSourceSignature('deco', sources)).not.toBe(
      createAutoCreateTwroleSourceSignature('colorBlock', sources)
    );
  });
});

describe('autoCreateTwrole editor scale limits', () => {
  it('keeps deco source candidates at the legacy max while color blocks use editor scale max', () => {
    expect(autoCreateMaxSourceScaleForMode('deco')).toBe(2);
    expect(autoCreateMaxSourceScaleForMode('colorBlock')).toBe(5);
  });

  it('clamps color block output scale and ratio using editor rules', () => {
    expect(clampAutoCreateOutputScales('colorBlock', 6, 60)).toEqual({ scaleX: 5, scaleY: 25 });
    expect(clampAutoCreateOutputScales('colorBlock', 3, 0.0001)).toEqual({ scaleX: 3, scaleY: 0.003 });
    expect(clampAutoCreateOutputScales('deco', 6, 60)).toEqual({ scaleX: 6, scaleY: 60 });
  });
});
