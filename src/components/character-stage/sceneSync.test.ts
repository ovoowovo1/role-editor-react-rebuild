import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js';
import { makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import type { StageSceneState } from './types';

const mocks = vi.hoisted(() => ({
  applyDecorationDisplayTransform: vi.fn(),
  createDisguiseEntryDisplay: vi.fn(),
  syncSelectionDragController: vi.fn(),
  syncHeadLayerSelection: vi.fn()
}));

vi.mock('./pixiVisuals', () => ({
  applyDecorationDisplayTransform: mocks.applyDecorationDisplayTransform,
  createDisguiseEntryDisplay: mocks.createDisguiseEntryDisplay
}));

vi.mock('./selectionControllerSync', () => ({
  syncHeadLayerSelection: mocks.syncHeadLayerSelection,
  syncSelectionDragController: mocks.syncSelectionDragController
}));

import {
  setDecorationInteractionEnabled,
  isDecorationDisplaySyncCurrent,
  syncDecorationDisplayRecords,
  syncDisguiseChildOrder,
  syncSelectionControllerForIds
} from './sceneSync';

function makeScene(): StageSceneState {
  const disguiseRoot = new Container();
  const headLayerClip = new Container();
  const headLayerSelectionOverlay = new Container();
  const selectionDragController = new Container();
  const brushFillOverlay = new Container();
  disguiseRoot.addChild(headLayerClip, selectionDragController, brushFillOverlay, headLayerSelectionOverlay);
  return {
    disguiseRoot,
    headLayerClip,
    headLayerSelectionOverlay,
    selectionDragController,
    brushFillOverlay,
    failedTextures: new Set(),
    decoDisplays: new Map(),
    decorationsById: new Map(),
    decorationInteractionEnabled: true,
    lastDisguiseChildOrder: []
  } as unknown as StageSceneState;
}

const decoOptions = { onPointerDown: vi.fn() };

describe('stage scene synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createDisguiseEntryDisplay.mockImplementation(() => new Container());
  });

  it('reports stale display references while a role update is pending', () => {
    const scene = makeScene();
    const first = makeDecorationLayer('a');
    const role = makeRoleDocument({ decorations: [first] });
    syncDecorationDisplayRecords(scene, role, decoOptions);
    expect(isDecorationDisplaySyncCurrent(scene, role)).toBe(true);

    const next = makeRoleDocument({ decorations: [{ ...first, x: 24 }] });
    expect(isDecorationDisplaySyncCurrent(scene, next)).toBe(false);

    syncDecorationDisplayRecords(scene, next, decoOptions);
    expect(isDecorationDisplaySyncCurrent(scene, next)).toBe(true);
  });

  it('keeps the lookup and skips unchanged decoration reads and order lookups', () => {
    const scene = makeScene();
    const a = makeDecorationLayer('a');
    const b = makeDecorationLayer('b');
    const role = makeRoleDocument({ decorations: [a, b] });
    syncDecorationDisplayRecords(scene, role, decoOptions);
    syncDisguiseChildOrder(scene, role);
    const lookup = scene.decorationsById;
    const rotationRead = vi.fn(() => 0);
    Object.defineProperty(b, 'rotation', { get: rotationRead });
    const next = { ...role, decorations: [{ ...a, x: 15 }, b] };
    mocks.applyDecorationDisplayTransform.mockClear();
    syncDecorationDisplayRecords(scene, next, decoOptions);
    const displayLookup = vi.spyOn(scene.decoDisplays, 'get');
    syncDisguiseChildOrder(scene, next);
    expect(scene.decorationsById).toBe(lookup);
    expect(lookup.get('a')).toBe(next.decorations[0]);
    expect(rotationRead).not.toHaveBeenCalled();
    expect(displayLookup).not.toHaveBeenCalled();
    expect(mocks.applyDecorationDisplayTransform).toHaveBeenCalledOnce();
  });

  it('defers transforms for active drag items until the role reference catches up', () => {
    const scene = makeScene();
    const role = makeRoleDocument({ decorations: [makeDecorationLayer('a')] });
    syncDecorationDisplayRecords(scene, role, decoOptions);
    const display = scene.decoDisplays.get('a')!.container;
    const next = { ...role, decorations: [{ ...role.decorations[0], x: 30 }] };
    mocks.applyDecorationDisplayTransform.mockClear();
    syncDecorationDisplayRecords(scene, next, decoOptions, new Set(['a']));
    expect(mocks.applyDecorationDisplayTransform).not.toHaveBeenCalled();
    syncDecorationDisplayRecords(scene, next, decoOptions);
    expect(mocks.applyDecorationDisplayTransform).toHaveBeenCalledWith(display, next.decorations[0]);
  });

  it('invalidates cached order for asset replacement, reorder and a fresh scene', () => {
    const scene = makeScene();
    const role = makeRoleDocument({ decorations: [makeDecorationLayer('a'), makeDecorationLayer('b')] });
    syncDecorationDisplayRecords(scene, role, decoOptions);
    syncDisguiseChildOrder(scene, role);
    const oldDisplay = scene.decoDisplays.get('a')!.container;
    const replaced = { ...role, decorations: [{ ...role.decorations[0], assetId: 'replacement' }, role.decorations[1]] };
    syncDecorationDisplayRecords(scene, replaced, decoOptions);
    syncDisguiseChildOrder(scene, replaced);
    expect(oldDisplay.destroyed).toBe(true);
    expect(scene.disguiseRoot.children).toContain(scene.decoDisplays.get('a')!.container);
    const reordered = { ...replaced, decorations: [...replaced.decorations].reverse() };
    syncDecorationDisplayRecords(scene, reordered, decoOptions);
    syncDisguiseChildOrder(scene, reordered);
    expect(scene.disguiseRoot.children.indexOf(scene.decoDisplays.get('a')!.container)).toBeLessThan(scene.disguiseRoot.children.indexOf(scene.decoDisplays.get('b')!.container));
    const fresh = makeScene();
    syncDecorationDisplayRecords(fresh, reordered, decoOptions);
    syncDisguiseChildOrder(fresh, reordered);
    expect(fresh.decoDisplays.size).toBe(2);
    expect(fresh.disguiseRoot.children).toContain(fresh.decoDisplays.get('a')!.container);
  });

  it('uses the scene lookup for selection without rebuilding decoration displays', () => {
    const scene = makeScene();
    const a = makeDecorationLayer('a');
    const b = makeDecorationLayer('b');
    const role = makeRoleDocument({ decorations: [a, b] });

    syncDecorationDisplayRecords(scene, role, decoOptions);
    const firstA = scene.decoDisplays.get('a')!.container;
    const firstB = scene.decoDisplays.get('b')!.container;
    syncSelectionControllerForIds(scene, ['b', 'missing', 'a']);
    syncSelectionControllerForIds(scene, ['a']);

    expect(mocks.createDisguiseEntryDisplay).toHaveBeenCalledTimes(2);
    expect(scene.decoDisplays.get('a')!.container).toBe(firstA);
    expect(scene.decoDisplays.get('b')!.container).toBe(firstB);
    expect(mocks.syncSelectionDragController).toHaveBeenNthCalledWith(1, scene, [b, a], false);
    expect(mocks.syncSelectionDragController).toHaveBeenNthCalledWith(2, scene, [a], false);
  });

  it('forwards the always-on head glow state without changing decoration selection', () => {
    const scene = makeScene();
    const deco = makeDecorationLayer('a');
    const role = makeRoleDocument({ decorations: [deco] });
    syncDecorationDisplayRecords(scene, role, decoOptions);

    syncSelectionControllerForIds(scene, [], false, true);

    expect(mocks.syncHeadLayerSelection).toHaveBeenCalledWith(scene, [], true);
    expect(mocks.syncSelectionDragController).toHaveBeenCalledWith(scene, [], false);
  });

  it('updates transforms in place and only replaces changed display identities', () => {
    const scene = makeScene();
    const a = makeDecorationLayer('a', { assetId: 'asset-a' });
    const b = makeDecorationLayer('b', { assetId: 'asset-b' });
    syncDecorationDisplayRecords(scene, makeRoleDocument({ decorations: [a, b] }), decoOptions);
    const firstA = scene.decoDisplays.get('a')!.container;
    const firstB = scene.decoDisplays.get('b')!.container;
    const destroyA = vi.spyOn(firstA, 'destroy');
    const destroyB = vi.spyOn(firstB, 'destroy');

    syncDecorationDisplayRecords(
      scene,
      makeRoleDocument({ decorations: [{ ...a, x: 12 }, b] }),
      decoOptions
    );
    expect(scene.decoDisplays.get('a')!.container).toBe(firstA);
    expect(mocks.createDisguiseEntryDisplay).toHaveBeenCalledTimes(2);

    syncDecorationDisplayRecords(
      scene,
      makeRoleDocument({ decorations: [{ ...a, assetId: 'asset-a-next' }, b] }),
      decoOptions
    );
    expect(mocks.createDisguiseEntryDisplay).toHaveBeenCalledTimes(3);
    expect(destroyA).toHaveBeenCalledOnce();
    expect(destroyB).not.toHaveBeenCalled();
    expect(scene.decoDisplays.get('b')!.container).toBe(firstB);
  });

  it('applies interaction changes once and gives new visuals the current mode', () => {
    const scene = makeScene();
    setDecorationInteractionEnabled(scene, false);
    syncDecorationDisplayRecords(
      scene,
      makeRoleDocument({ decorations: [makeDecorationLayer('a')] }),
      decoOptions
    );
    const first = scene.decoDisplays.get('a')!.container;
    expect(first.eventMode).toBe('none');
    expect(first.cursor).toBe('default');

    setDecorationInteractionEnabled(scene, true);
    expect(first.eventMode).toBe('static');
    expect(first.cursor).toBe('pointer');
  });

  it('keeps controller and brush overlays in child order when visibility changes', () => {
    const scene = makeScene();
    const role = makeRoleDocument({
      decorations: [makeDecorationLayer('a'), makeDecorationLayer('b')],
      headLayerIndex: 1
    });
    syncDecorationDisplayRecords(scene, role, decoOptions);
    const a = scene.decoDisplays.get('a')!.container;
    const b = scene.decoDisplays.get('b')!.container;
    const removeChildren = vi.spyOn(scene.disguiseRoot, 'removeChildren');

    syncDisguiseChildOrder(scene, role);
    expect(scene.disguiseRoot.children).toEqual([
      b,
      scene.headLayerClip,
      a,
      scene.selectionDragController,
      scene.brushFillOverlay,
      scene.headLayerSelectionOverlay
    ]);
    expect(removeChildren).toHaveBeenCalledOnce();

    scene.selectionDragController.visible = true;
    scene.brushFillOverlay.visible = true;
    syncDisguiseChildOrder(scene, role);
    expect(removeChildren).toHaveBeenCalledOnce();

    syncDisguiseChildOrder(scene, role);
    expect(scene.disguiseRoot.children).toEqual([
      b,
      scene.headLayerClip,
      a,
      scene.selectionDragController,
      scene.brushFillOverlay,
      scene.headLayerSelectionOverlay
    ]);
  });

  it('keeps original deco slots while selection overlays stay above them', () => {
    const scene = makeScene();
    const a = makeDecorationLayer('a');
    const b = makeDecorationLayer('b');
    const c = makeDecorationLayer('c');
    const role = makeRoleDocument({
      decorations: [a, b, c],
      headLayerIndex: 1
    });
    syncDecorationDisplayRecords(scene, role, decoOptions);

    syncDisguiseChildOrder(scene, role);
    const originalChildren = [...scene.disguiseRoot.children];
    syncDisguiseChildOrder(scene, role);
    expect(scene.disguiseRoot.children).toEqual(originalChildren);

    syncDisguiseChildOrder(scene, role);
    expect(scene.disguiseRoot.children).toEqual([
      scene.decoDisplays.get('c')!.container,
      scene.decoDisplays.get('b')!.container,
      scene.headLayerClip,
      scene.decoDisplays.get('a')!.container,
      scene.selectionDragController,
      scene.brushFillOverlay,
      scene.headLayerSelectionOverlay
    ]);
    expect(scene.disguiseRoot.children.indexOf(scene.selectionDragController)).toBeGreaterThan(
      scene.disguiseRoot.children.indexOf(scene.decoDisplays.get('a')!.container)
    );
    expect(scene.disguiseRoot.children.indexOf(scene.headLayerSelectionOverlay)).toBe(
      scene.disguiseRoot.children.length - 1
    );
  });

  it('keeps existing children until a deferred display sync refreshes different ids', () => {
    const scene = makeScene();
    const currentRole = makeRoleDocument({
      decorations: [makeDecorationLayer('a'), makeDecorationLayer('b')],
      headLayerIndex: 1
    });
    syncDecorationDisplayRecords(scene, currentRole, decoOptions);
    syncDisguiseChildOrder(scene, currentRole);
    const previousChildren = [...scene.disguiseRoot.children];
    const removeChildren = vi.spyOn(scene.disguiseRoot, 'removeChildren');

    const nextRole = makeRoleDocument({
      decorations: [makeDecorationLayer('c'), makeDecorationLayer('d')],
      headLayerIndex: 1
    });
    syncDisguiseChildOrder(scene, nextRole);

    expect(scene.disguiseRoot.children).toEqual(previousChildren);
    expect(removeChildren).not.toHaveBeenCalled();

    syncDecorationDisplayRecords(scene, nextRole, decoOptions);
    syncDisguiseChildOrder(scene, nextRole);
    expect(scene.disguiseRoot.children).toEqual([
      scene.decoDisplays.get('d')!.container,
      scene.headLayerClip,
      scene.decoDisplays.get('c')!.container,
      scene.selectionDragController,
      scene.brushFillOverlay,
      scene.headLayerSelectionOverlay
    ]);
    expect(removeChildren).toHaveBeenCalledOnce();
  });
});
