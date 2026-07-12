import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js';
import { makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import type { StageSceneState } from './types';

const mocks = vi.hoisted(() => ({
  applyDecorationDisplayTransform: vi.fn(),
  createDisguiseEntryDisplay: vi.fn(),
  syncSelectionDragController: vi.fn()
}));

vi.mock('./pixiVisuals', () => ({
  applyDecorationDisplayTransform: mocks.applyDecorationDisplayTransform,
  createDisguiseEntryDisplay: mocks.createDisguiseEntryDisplay
}));

vi.mock('./selectionControllerSync', () => ({
  syncSelectionDragController: mocks.syncSelectionDragController
}));

import {
  setDecorationInteractionEnabled,
  syncDecorationDisplayRecords,
  syncDisguiseChildOrder,
  syncSelectionControllerForIds
} from './sceneSync';

function makeScene(): StageSceneState {
  const disguiseRoot = new Container();
  const headLayerClip = new Container();
  const selectionDragController = new Container();
  const brushFillOverlay = new Container();
  disguiseRoot.addChild(headLayerClip, selectionDragController, brushFillOverlay);
  return {
    disguiseRoot,
    headLayerClip,
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
      scene.brushFillOverlay
    ]);
    expect(removeChildren).toHaveBeenCalledOnce();

    scene.selectionDragController.visible = true;
    scene.brushFillOverlay.visible = true;
    syncDisguiseChildOrder(scene, role);
    expect(removeChildren).toHaveBeenCalledOnce();

    const dragOverlay = new Container();
    syncDisguiseChildOrder(scene, role, dragOverlay, new Set(['a']));
    expect(scene.disguiseRoot.children).toEqual([
      b,
      scene.headLayerClip,
      dragOverlay,
      scene.selectionDragController,
      scene.brushFillOverlay
    ]);
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
      scene.brushFillOverlay
    ]);
    expect(removeChildren).toHaveBeenCalledOnce();
  });
});
