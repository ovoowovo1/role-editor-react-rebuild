import { GlowFilter } from '@pixi/filter-glow';

/**
 * Matches TWRoleCgEditor DecoController selection glow (modules.js ~5495).
 * Old editor uses a shared filter with color 10092441 (0x99FF99, light green),
 * knockout, distance/outerStrength 4, quality 1.
 */
export function createDecoSelectionGlowFilter(): GlowFilter {
  return new GlowFilter({
    distance: 4,
    outerStrength: 4,
    innerStrength: 0,
    color: 0x99ff99,
    quality: 1,
    knockout: false,
    alpha: 1
  });
}
