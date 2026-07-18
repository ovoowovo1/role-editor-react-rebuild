import { describe, expect, it } from 'vitest';
import { Container } from 'pixi.js';
import { makeDecorationLayer } from '../../test/roleFixtures';
import {
  applyDecorationVisualTransform,
  createDecorationVisual as createSharedDecorationVisual
} from './decorationVisual';
import { createDecorationVisual as createWorkspaceDecorationVisual } from '../../components/character-stage/pixiVisuals';

describe('shared decoration visual factory', () => {
  it('is the same factory exported by the interactive workspace', () => {
    expect(createWorkspaceDecorationVisual).toBe(createSharedDecorationVisual);
  });

  it('applies the canonical display transform', () => {
    const visual = new Container();
    applyDecorationVisualTransform(visual, makeDecorationLayer('deco', {
      x: 12,
      y: -8,
      rotation: 90,
      scaleX: 2,
      scaleY: -3,
      opacity: 2,
      visible: false
    }));

    expect(visual.position).toMatchObject({ x: 12, y: -8 });
    expect(visual.rotation).toBe(Math.PI / 2);
    expect(visual.scale).toMatchObject({ x: 2, y: -3 });
    expect(visual.alpha).toBe(1);
    expect(visual.visible).toBe(false);
  });
});
