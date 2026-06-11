import { describe, expect, it } from 'vitest';
import { createAutoCreateTwroleSourceSignature } from './autoCreateTwrole';

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
