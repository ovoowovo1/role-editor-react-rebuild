import { describe, expect, it } from 'vitest';
import type { ColorBlockPreset } from '../../mock/colorBlocks';
import { colorBlockPresetItems, colorBlockPresetMatchesSearch } from './autoCreateColorBlockSources';

function preset(id: string, patch: Partial<ColorBlockPreset> = {}): ColorBlockPreset {
  return {
    id,
    camp: 'third',
    name: `${id}-name`,
    label: `${id} label`,
    color: '#000000',
    deco: [{ c: `${id}_deco`, x: 0, y: 0, sx: 1, sy: 1, r: 0 }],
    ...patch
  };
}

describe('autoCreate color block source helpers', () => {
  it('matches color block search by label, name, id, and deco code', () => {
    const item = preset('block-a', {
      name: 'Shadow Sparse',
      label: 'Black Block',
      deco: [{ c: 'third_black_deco', x: 0, y: 0, sx: 1, sy: 1, r: 0 }]
    });

    expect(colorBlockPresetMatchesSearch(item, 'black')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, 'shadow')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, 'block-a')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, 'third_black')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, 'royal_blue')).toBe(false);
  });

  it('marks excluded presets disabled while keeping visible search results', () => {
    const presets = [preset('keep'), preset('skip')];
    const items = colorBlockPresetItems(presets, '', new Set(['skip']));

    expect(items.map((item) => [item.preset.id, item.enabled])).toEqual([
      ['keep', true],
      ['skip', false]
    ]);
  });
});
