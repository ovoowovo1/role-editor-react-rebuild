import { describe, expect, it } from 'vitest';
import {
  autoCreateAspectRatioForMode,
  autoCreateDefaultMaxRenderedPxForMode,
  autoCreateMaxSourceScaleForMode,
  autoCreateMinRenderedPxForMode,
  buildColorBlockDecoDraftsForTransform,
  clampAutoCreateOutputScales,
  colorBlockNonPrimaryDistanceSq,
  colorBlockSecondaryPenaltyDelta,
  createAutoCreateTwroleResultGroups,
  createAutoCreateTwroleSourceSignature,
  isColorBlockPrimaryRgb,
  parseColorBlockPresetColor,
  recolorTargetBuffersToRgb,
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
    expect(createAutoCreateTwroleSourceSignature('colorBlock', sources)).toBe('colorBlock|asset-a:code-a[]|asset-b:code-b[]');
    expect(createAutoCreateTwroleSourceSignature('deco', sources)).not.toBe(
      createAutoCreateTwroleSourceSignature('colorBlock', sources)
    );
  });

  it('includes color block member fingerprints in checkpoint signatures', () => {
    const base = [{ assetId: 'block', code: 'colorBlock:block', members: [{ code: 'primary', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }] }];
    const filtered = [{ assetId: 'block', code: 'colorBlock:block', members: [{ code: 'primary', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }, { code: 'accent', x: 5, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }] }];

    expect(createAutoCreateTwroleSourceSignature('colorBlock', base)).not.toBe(
      createAutoCreateTwroleSourceSignature('colorBlock', filtered)
    );
    expect(createAutoCreateTwroleSourceSignature('deco', base)).toBe(createAutoCreateTwroleSourceSignature('deco', filtered));
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

describe('autoCreateTwrole color block scale and ratio search', () => {
  it('uses wider ratio search and larger default rendered bounds for color blocks', () => {
    expect(autoCreateAspectRatioForMode('deco', 2)).toBeCloseTo(Math.exp(0.12));
    expect(autoCreateAspectRatioForMode('colorBlock', 0)).toBe(1);
    expect(autoCreateAspectRatioForMode('colorBlock', 2)).toBe(5);
    expect(autoCreateAspectRatioForMode('colorBlock', -10)).toBe(0.001);
    expect(autoCreateDefaultMaxRenderedPxForMode('colorBlock', 512, 512)).toBeGreaterThan(
      autoCreateDefaultMaxRenderedPxForMode('deco', 512, 512)
    );
    expect(autoCreateMinRenderedPxForMode('deco', 512, 512, 4)).toBe(4);
    expect(autoCreateMinRenderedPxForMode('colorBlock', 512, 512, 4)).toBeGreaterThan(4);
  });

  it('exports color block non-uniform parent scale using editor group transform semantics', () => {
    const drafts = buildColorBlockDecoDraftsForTransform(
      {
        kind: 'colorBlock',
        localCenterX: 10,
        localCenterY: 0,
        members: [
          { code: 'left', assetId: 'left', label: 'Left', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
          { code: 'right', assetId: 'right', label: 'Right', x: 20, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
        ]
      },
      100,
      50,
      3,
      1.5,
      90
    );

    expect(drafts.map((draft) => ({ x: draft.x, y: draft.y, scaleX: draft.scaleX, scaleY: draft.scaleY, rotation: draft.rotation }))).toEqual([
      { x: 100, y: 20, scaleX: 3, scaleY: 1.5, rotation: 90 },
      { x: 100, y: 80, scaleX: 3, scaleY: 1.5, rotation: 90 }
    ]);
  });
});

describe('autoCreateTwrole color block target color', () => {
  it('parses color block preset CSS colors', () => {
    expect(parseColorBlockPresetColor('#050505')).toEqual({ r: 5, g: 5, b: 5 });
    expect(parseColorBlockPresetColor('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(parseColorBlockPresetColor('#abcd')).toEqual({ r: 170, g: 187, b: 204 });
    expect(parseColorBlockPresetColor('#11223344')).toEqual({ r: 17, g: 34, b: 51 });
    expect(parseColorBlockPresetColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseColorBlockPresetColor('rgb(50%, 0%, 100%)')).toEqual({ r: 128, g: 0, b: 255 });
    expect(parseColorBlockPresetColor('not-a-color')).toBeNull();
  });

  it('classifies near-primary pixels as primary and penalizes scattered secondary color more strongly', () => {
    const primary: [number, number, number] = [255, 255, 255];
    const secondary: [number, number, number] = [0, 90, 255];

    expect(colorBlockNonPrimaryDistanceSq([248, 250, 252], primary)).toBe(0);
    expect(colorBlockNonPrimaryDistanceSq([215, 225, 232], primary)).toBe(0);
    expect(colorBlockNonPrimaryDistanceSq(secondary, primary)).toBeGreaterThan(0);
    expect(isColorBlockPrimaryRgb([0, 220, 255], primary)).toBe(false);

    const clusteredPenalty = colorBlockSecondaryPenaltyDelta(primary, 255, secondary, 255, primary, true);
    const scatteredPenalty = colorBlockSecondaryPenaltyDelta(primary, 255, secondary, 255, primary, false);
    expect(scatteredPenalty).toBeGreaterThan(clusteredPenalty);
    expect(clusteredPenalty).toBeGreaterThan(65025 * 3);
    expect(colorBlockSecondaryPenaltyDelta(secondary, 255, primary, 255, primary, false)).toBeLessThan(0);
  });

  it('does not count saturated accent colors as white or black primary pixels', () => {
    expect(isColorBlockPrimaryRgb([232, 234, 236], [255, 255, 255])).toBe(true);
    expect(isColorBlockPrimaryRgb([0, 210, 255], [255, 255, 255])).toBe(false);
    expect(isColorBlockPrimaryRgb([18, 20, 22], [5, 5, 5])).toBe(true);
    expect(isColorBlockPrimaryRgb([0, 64, 150], [5, 5, 5])).toBe(false);
  });

  it('recolors target RGB while preserving alpha in straight and premultiplied buffers', () => {
    const straight = new Uint8ClampedArray([200, 100, 50, 128, 1, 2, 3, 0]);
    const premult = new Float32Array([100, 50, 25, 128, 0, 0, 0, 0]);

    recolorTargetBuffersToRgb(straight, premult, { r: 5, g: 10, b: 20 });

    expect(Array.from(straight)).toEqual([5, 10, 20, 128, 5, 10, 20, 0]);
    expect(premult[0]).toBeCloseTo(5 * (128 / 255));
    expect(premult[1]).toBeCloseTo(10 * (128 / 255));
    expect(premult[2]).toBeCloseTo(20 * (128 / 255));
    expect(premult[3]).toBe(128);
    expect(Array.from(premult.slice(4, 8))).toEqual([0, 0, 0, 0]);
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
