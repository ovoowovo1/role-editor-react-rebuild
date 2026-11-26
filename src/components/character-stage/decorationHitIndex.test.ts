import { Container, Rectangle } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { DecorationLayer } from '../../types/role';
import type { DecoDisplayRecord } from './types';
import { buildDecorationHitIndex, hitTestDecorationAt, hitTestDecorationsInRect } from './decorationHitIndex';

function makeDeco(overrides: Partial<DecorationLayer> & { id: string }): DecorationLayer {
  return {
    code: 'deco_1',
    assetId: 'deco_1',
    name: overrides.id,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    visible: true,
    opacity: 1,
    ...overrides
  };
}

function makeRecord(bounds: Rectangle): DecoDisplayRecord {
  const container = new Container();
  container.getLocalBounds = () => bounds;
  return {
    container,
    displayKey: 'key',
    transformKey: 'tkey'
  };
}

describe('decorationHitIndex', () => {
  it('picks the topmost visible decoration according to layer order', () => {
    const bottom = makeDeco({ id: 'bottom', x: 0, y: 0 });
    const top = makeDeco({ id: 'top', x: 5, y: 5 });
    const hidden = makeDeco({ id: 'hidden', x: 5, y: 5, visible: false });
    const transparent = makeDeco({ id: 'transparent', x: 5, y: 5, opacity: 0 });

    const displays = new Map<string, DecoDisplayRecord>([
      ['bottom', makeRecord(new Rectangle(-20, -20, 40, 40))],
      ['top', makeRecord(new Rectangle(-20, -20, 40, 40))],
      ['hidden', makeRecord(new Rectangle(-20, -20, 40, 40))],
      ['transparent', makeRecord(new Rectangle(-20, -20, 40, 40))]
    ]);

    const index = buildDecorationHitIndex(
      [hidden, transparent, top, bottom],
      displays,
      ['bottom', 'top', 'transparent', 'hidden']
    );

    expect(hitTestDecorationAt(index, 0, 0)).toBe('top');
    expect(hitTestDecorationAt(index, -18, -18)).toBe('bottom');
    expect(hitTestDecorationAt(index, 100, 100)).toBeNull();
  });

  it('respects rotation and scale when testing oriented bounds', () => {
    const rotated = makeDeco({
      id: 'rotated',
      x: 100,
      y: 100,
      scaleX: 2,
      scaleY: 0.5,
      rotation: 45
    });
    const displays = new Map<string, DecoDisplayRecord>([
      ['rotated', makeRecord(new Rectangle(-20, -10, 40, 20))]
    ]);

    const index = buildDecorationHitIndex([rotated], displays);

    // Center is always inside.
    expect(hitTestDecorationAt(index, 100, 100)).toBe('rotated');
    // Along rotated +X axis (~28.28, 28.28) is inside scaled width (half-width 40).
    expect(hitTestDecorationAt(index, 120, 120)).toBe('rotated');
    // Inside the AABB corner (130, 100) but outside the rotated thin rectangle.
    expect(hitTestDecorationAt(index, 130, 100)).toBeNull();
  });

  it('builds and queries 10,000 decorations quickly', () => {
    const decorations: DecorationLayer[] = [];
    const displays = new Map<string, DecoDisplayRecord>();
    const bounds = new Rectangle(-8, -8, 16, 16);

    for (let i = 0; i < 10000; i += 1) {
      const id = `deco_${i}`;
      const col = i % 100;
      const row = Math.floor(i / 100);
      decorations.push(makeDeco({ id, x: col * 10 - 500, y: row * 10 - 500 }));
      displays.set(id, makeRecord(bounds));
    }

    const startBuild = performance.now();
    const index = buildDecorationHitIndex(decorations, displays);
    const buildMs = performance.now() - startBuild;

    const startQuery = performance.now();
    let hit: string | null = null;
    for (let i = 0; i < 1000; i += 1) {
      hit = hitTestDecorationAt(index, 0, 0);
    }
    const queryMs = performance.now() - startQuery;

    expect(hit).toBeTruthy();
    expect(buildMs).toBeLessThan(500);
    expect(queryMs).toBeLessThan(50);
  });

  it('finds all decorations intersecting a marquee rectangle', () => {
    const a = makeDeco({ id: 'a', x: 0, y: 0 });
    const b = makeDeco({ id: 'b', x: 40, y: 40 });
    const c = makeDeco({ id: 'c', x: 200, y: 200 });
    const displays = new Map<string, DecoDisplayRecord>([
      ['a', makeRecord(new Rectangle(-10, -10, 20, 20))],
      ['b', makeRecord(new Rectangle(-10, -10, 20, 20))],
      ['c', makeRecord(new Rectangle(-10, -10, 20, 20))]
    ]);
    const index = buildDecorationHitIndex([c, b, a], displays);
    expect(hitTestDecorationsInRect(index, -5, -5, 45, 45)).toEqual(['b', 'a']);
  });
});
