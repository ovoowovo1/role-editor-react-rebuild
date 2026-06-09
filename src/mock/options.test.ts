import { describe, expect, it } from 'vitest';
import type { BodyPartTab } from '../types/role';
import { filterPartOptionsByCamp, partOptions } from './options';

const playerCampOrder = ['skydow', 'royal', 'third'] as const;
type PlayerCamp = (typeof playerCampOrder)[number];
const naturalCodeCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const legacyBodyPartFrames: Record<BodyPartTab, Record<PlayerCamp, number[]>> = {
  head: {
    skydow: [36, 37, 38, 39, 40, 41, 86, 93, 94],
    royal: [45, 46, 50, 51, 52, 53, 87, 91, 92],
    third: [42, 43, 44, 47, 48, 49, 88, 95, 96]
  },
  hand: {
    skydow: [2, 8, 11, 12, 13, 14, 15, 16, 27, 28, 35, 49, 55, 56, 61, 65, 66],
    royal: [3, 8, 17, 18, 19, 24, 25, 26, 31, 32, 33, 47, 48, 50, 57, 58, 63, 64],
    third: [8, 20, 21, 22, 23, 29, 30, 34, 36, 37, 38, 40, 45, 46, 59, 60, 62, 67, 68]
  },
  foot: {
    skydow: [1, 3, 4, 13, 21, 23, 24, 25, 26, 27, 28, 43, 53, 54, 55, 56, 66, 67, 69, 70, 77, 78],
    royal: [2, 5, 6, 7, 8, 18, 29, 30, 31, 32, 33, 39, 40, 41, 42, 46, 64, 65, 73, 74, 79, 80],
    third: [9, 10, 22, 34, 35, 36, 37, 38, 44, 45, 47, 48, 49, 50, 51, 52, 58, 62, 63, 71, 72, 75, 76]
  },
  cape: {
    skydow: [12, 13, 21, 24, 25],
    royal: [2, 3, 5, 6, 14, 15, 16, 20],
    third: [4, 7, 9, 10, 17, 18]
  }
};

function framesFor(tab: BodyPartTab, camp: string): number[] {
  return filterPartOptionsByCamp(tab, camp).map((option) => option.frame ?? Number(option.code));
}

function decoGroup(code: string): string {
  for (const camp of playerCampOrder) {
    if (code.startsWith(`${camp}_`)) return camp;
  }
  if (code.startsWith('xmas_deco_')) return 'shared';
  return 'unknown';
}

describe('part option camp filtering', () => {
  it('groups civil deco options by camp and puts shared deco last', () => {
    const options = filterPartOptionsByCamp('deco', 'civil');
    const groups = options.map((option) => decoGroup(option.code));
    const groupOrder = groups.filter((group, index) => group !== groups[index - 1]);

    expect(options.length).toBeGreaterThan(0);
    expect(groups.every((group) => group !== 'unknown')).toBe(true);
    expect(groupOrder).toEqual(['skydow', 'royal', 'third', 'shared']);
  });

  it('sorts civil deco codes naturally inside each camp group', () => {
    const options = filterPartOptionsByCamp('deco', 'civil');

    for (const group of [...playerCampOrder, 'shared']) {
      const codes = options.filter((option) => decoGroup(option.code) === group).map((option) => option.code);
      expect(codes).toEqual([...codes].sort((left, right) => naturalCodeCollator.compare(left, right)));
    }
  });

  it('keeps single-camp deco filtering sorted with shared deco after camp deco', () => {
    const options = filterPartOptionsByCamp('deco', 'royal');
    const groups = options.map((option) => decoGroup(option.code));
    const groupOrder = groups.filter((group, index) => group !== groups[index - 1]);
    const royalCodes = options.filter((option) => decoGroup(option.code) === 'royal').map((option) => option.code);

    expect(groupOrder).toEqual(['royal', 'shared']);
    expect(groups.every((group) => group === 'royal' || group === 'shared')).toBe(true);
    expect(royalCodes).toEqual([...royalCodes].sort((left, right) => naturalCodeCollator.compare(left, right)));
  });

  it('filters body part frames by the old RoleDecosList values', () => {
    for (const tab of Object.keys(legacyBodyPartFrames) as BodyPartTab[]) {
      for (const camp of playerCampOrder) {
        expect(framesFor(tab, camp)).toEqual(legacyBodyPartFrames[tab][camp]);
      }
    }
  });

  it('does not filter body part frames for civil or legacy camp4', () => {
    for (const tab of Object.keys(legacyBodyPartFrames) as BodyPartTab[]) {
      const allFrames = partOptions[tab].map((option) => option.frame ?? Number(option.code));

      expect(framesFor(tab, 'civil')).toEqual(allFrames);
      expect(framesFor(tab, 'camp4')).toEqual(allFrames);
    }
  });
});
