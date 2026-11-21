import { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { directDisplayTransformInRoot, getDisplayRootPosition } from './sceneGeometry';

describe('stage root geometry', () => {
  it('uses the local matrix for direct children under a rotated and scaled root', () => {
    const root = new Container();
    root.rotation = 0.3;
    root.scale.set(2, 3);
    const layer = new Container();
    layer.position.set(11, 20);
    layer.pivot.set(4, 7);
    layer.rotation = 0.8;
    layer.scale.set(-2, 1.5);
    root.addChild(layer);
    const corner = { x: 15, y: -4 };
    const legacyCorner = root.toLocal(layer.toGlobal(corner));
    const legacyOrigin = root.toLocal(layer.toGlobal({ x: 0, y: 0 }));
    const toGlobal = vi.spyOn(layer, 'toGlobal');
    const toLocal = vi.spyOn(root, 'toLocal');

    const local = directDisplayTransformInRoot(layer, root)?.apply(corner);
    const origin = getDisplayRootPosition(layer, root);
    expect(local?.x).toBeCloseTo(legacyCorner.x);
    expect(local?.y).toBeCloseTo(legacyCorner.y);
    expect(origin.x).toBeCloseTo(legacyOrigin.x);
    expect(origin.y).toBeCloseTo(legacyOrigin.y);
    expect(toGlobal).not.toHaveBeenCalled();
    expect(toLocal).not.toHaveBeenCalled();
  });

  it('still resolves nested descendants in root coordinates', () => {
    const root = new Container();
    const group = new Container();
    group.position.set(5, 7);
    group.scale.set(2, 3);
    const layer = new Container();
    layer.position.set(11, 13);
    root.addChild(group);
    group.addChild(layer);

    expect(directDisplayTransformInRoot(layer, root)).toBeNull();
    expect(getDisplayRootPosition(layer, root)).toEqual({ x: 27, y: 46 });
  });
});
