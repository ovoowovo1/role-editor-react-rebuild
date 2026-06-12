import { describe, expect, it } from 'vitest';
import type { ColorBlockPreset } from '../../mock/colorBlocks';
import { colorBlockPresetItems, colorBlockPresetMatchesSearch, resolveSelectedColorBlockPresetId } from './autoCreateColorBlockSources';

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
  it('matches color block search by label, name, id, color, and deco code', () => {
    const item = preset('block-a', {
      name: 'Shadow Sparse',
      label: 'Black Block',
      color: '#050505',
      deco: [{ c: 'third_black_deco', x: 0, y: 0, sx: 1, sy: 1, r: 0 }]
    });

    expect(colorBlockPresetMatchesSearch(item, 'black')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, 'shadow')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, 'block-a')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, '#050505')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, 'third_black')).toBe(true);
    expect(colorBlockPresetMatchesSearch(item, 'royal_blue')).toBe(false);
  });

  it('marks exactly one searched preset as selected', () => {
    const presets = [preset('keep'), preset('selected'), preset('other')];
    const items = colorBlockPresetItems(presets, '', 'selected');

    expect(items.map((item) => [item.preset.id, item.selected])).toEqual([
      ['keep', false],
      ['selected', true],
      ['other', false]
    ]);
  });

  it('resolves a missing selection to the first available color block', () => {
    const presets = [preset('first'), preset('second')];

    expect(resolveSelectedColorBlockPresetId(presets, 'second')).toBe('second');
    expect(resolveSelectedColorBlockPresetId(presets, 'missing')).toBe('first');
    expect(resolveSelectedColorBlockPresetId([], 'missing')).toBeNull();
  });
});
