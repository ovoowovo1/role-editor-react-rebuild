import { describe, expect, it } from 'vitest';
import {
  autoCreateMaxSourceScaleForMode,
  clampAutoCreateOutputScales,
  createAutoCreateTwroleResultGroups,
  createAutoCreateTwroleSourceSignature,
  wouldExceedAutoCreateLayerBudget
} from './autoCreateTwrole';
import type { DecorationLayer } from '../../types/role';

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

describe('autoCreateTwrole color block budget and groups', () => {
  function decoration(id: string): Pick<DecorationLayer, 'id'> {
    return { id };
  }

  it('uses output layer count for tile budget checks', () => {
    expect(wouldExceedAutoCreateLayerBudget(8, 1, 10)).toBe(false);
    expect(wouldExceedAutoCreateLayerBudget(8, 3, 10)).toBe(true);
    expect(wouldExceedAutoCreateLayerBudget(8, 4, 10, 3)).toBe(false);
    expect(wouldExceedAutoCreateLayerBudget(8, 6, 10, 1)).toBe(true);
    expect(wouldExceedAutoCreateLayerBudget(3000, 50, 0)).toBe(false);
  });

  it('exports one editor group per accepted color block in top-first order', () => {
    const groups = createAutoCreateTwroleResultGroups(
      'colorBlock',
      [
        { active: true, sourceId: 0, decorations: [decoration('bottom-a'), decoration('top-a')] },
        { active: false, sourceId: 1, decorations: [decoration('hidden-a'), decoration('hidden-b')] },
        { active: true, sourceId: 2, decorations: [decoration('bottom-c'), decoration('middle-c'), decoration('top-c')] },
        { active: true, sourceId: 3, decorations: [decoration('single-d')] }
      ],
      [
        { code: 'colorBlock:a', label: 'Block A' },
        { code: 'colorBlock:b', label: 'Block B' },
        { code: 'colorBlock:c', label: 'Block C' },
        { code: 'colorBlock:d', label: 'Block D' }
      ]
    );

    expect(groups).toEqual([
      {
        name: 'Block C',
        itemIds: ['top-c', 'middle-c', 'bottom-c'],
        sourceId: 2,
        sourceCode: 'colorBlock:c'
      },
      {
        name: 'Block A',
        itemIds: ['top-a', 'bottom-a'],
        sourceId: 0,
        sourceCode: 'colorBlock:a'
      }
    ]);
    expect(createAutoCreateTwroleResultGroups('deco', [], [])).toEqual([]);
  });
});
