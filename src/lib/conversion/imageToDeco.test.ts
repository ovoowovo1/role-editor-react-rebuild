import { describe, expect, it } from 'vitest';
import { makePartOption } from '../../test/roleFixtures';
import { bestPaletteMatch, visualWidthForOption, type DecoPaletteEntry } from './imageToDeco';

function paletteEntry(id: string, r: number, g: number, b: number): DecoPaletteEntry {
  return {
    option: makePartOption(id),
    r,
    g,
    b,
    lab: { l: r + g + b, a: r - g, b: g - b },
    hsv: { h: 0, s: 0, v: 0 },
    hsl: { h: 0, s: 0, l: 0 },
    luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b,
    opaquePixels: 10,
    visualWidth: 50
  };
}

describe('image to deco helpers', () => {
  it('uses atlas runtime display width before atlas width and fallback size', () => {
    expect(visualWidthForOption(makePartOption('plain'))).toBe(50);
    expect(visualWidthForOption(makePartOption('atlas', {
      atlas: {
        texture: 'atlas.png',
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        pivotX: 0,
        pivotY: 0,
        scale: 1
      }
    }))).toBe(24);
    expect(visualWidthForOption(makePartOption('runtime', {
      atlas: {
        texture: 'atlas.png',
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        pivotX: 0,
        pivotY: 0,
        scale: 1,
        runtimeDisplayWidth: 72
      }
    }))).toBe(72);
  });

  it('matches nearest palette entry by selected color algorithm', () => {
    const palette = [
      paletteEntry('red', 250, 10, 10),
      paletteEntry('green', 10, 250, 10),
      paletteEntry('blue', 10, 10, 250)
    ];

    expect(bestPaletteMatch(240, 20, 20, palette, 'rgb').option.id).toBe('red');
    expect(bestPaletteMatch(20, 230, 30, palette, 'weighted-rgb').option.id).toBe('green');
    expect(bestPaletteMatch(30, 30, 220, palette, 'luminance').option.id).toBe('blue');
  });
});
