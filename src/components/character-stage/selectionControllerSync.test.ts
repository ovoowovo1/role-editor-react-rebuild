import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js';
import { makeDecorationLayer } from '../../test/roleFixtures';
import type { StageSceneState } from './types';

const mocks = vi.hoisted(() => ({
  createDecorationVisual: vi.fn(() => new Container())
}));

vi.mock('./pixiVisuals', () => ({
  createDecorationVisual: mocks.createDecorationVisual
}));

vi.mock('./stageOverlayVisuals', () => ({
  getCachedControllerGlowFilter: vi.fn(() => null)
}));

import {
  hideSelectionDragController,
  syncSelectionDragControllerVisuals
} from './selectionControllerSync';

function makeScene(): StageSceneState {
  return {
    selectionDragController: new Container(),
    selectionDragControllerGraphic: { clear: vi.fn() },
    selectionDragControllerVisuals: new Container(),
    selectionDragVisualKey: '',
    selectionDragVisualsById: new Map(),
    selectionDragVisualDisplayKeysById: new Map(),
    selectionDragTargetId: null,
    failedTextures: new Set()
  } as unknown as StageSceneState;
}

describe('selection controller visuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createDecorationVisual.mockImplementation(() => new Container());
  });

  it('updates transforms in place without creating or destroying visuals', () => {
    const scene = makeScene();
    const first = makeDecorationLayer('a', { assetId: 'asset-a', x: 1, y: 2 });
    const second = makeDecorationLayer('b', { assetId: 'asset-b', x: 5, y: 8 });

    syncSelectionDragControllerVisuals(scene, [first, second], 3, 4);
    const firstVisual = scene.selectionDragVisualsById.get('a')!;
    const secondVisual = scene.selectionDragVisualsById.get('b')!;
    const firstDestroy = vi.spyOn(firstVisual, 'destroy');
    const secondDestroy = vi.spyOn(secondVisual, 'destroy');

    syncSelectionDragControllerVisuals(scene, [
      { ...first, x: 20, y: -5, rotation: 90, scaleX: 2, scaleY: -3, opacity: 0.25 },
      { ...second, visible: false }
    ], 10, 10);

    expect(mocks.createDecorationVisual).toHaveBeenCalledTimes(2);
    expect(firstDestroy).not.toHaveBeenCalled();
    expect(secondDestroy).not.toHaveBeenCalled();
    expect(scene.selectionDragVisualsById.get('a')).toBe(firstVisual);
    expect(firstVisual.position).toMatchObject({ x: 10, y: -15 });
    expect(firstVisual.rotation).toBe(Math.PI / 2);
    expect(firstVisual.scale).toMatchObject({ x: 2, y: -3 });
    expect(firstVisual.alpha).toBe(0.25);
    expect(secondVisual.visible).toBe(false);
  });

  it('only replaces changed assets and incrementally removes selection visuals', () => {
    const scene = makeScene();
    const first = makeDecorationLayer('a', { assetId: 'asset-a' });
    const second = makeDecorationLayer('b', { assetId: 'asset-b' });
    syncSelectionDragControllerVisuals(scene, [first, second], 0, 0);

    const oldFirst = scene.selectionDragVisualsById.get('a')!;
    const retainedSecond = scene.selectionDragVisualsById.get('b')!;
    const oldFirstDestroy = vi.spyOn(oldFirst, 'destroy');
    const retainedDestroy = vi.spyOn(retainedSecond, 'destroy');

    syncSelectionDragControllerVisuals(
      scene,
      [{ ...first, assetId: 'asset-a-next' }, second],
      0,
      0
    );

    expect(mocks.createDecorationVisual).toHaveBeenCalledTimes(3);
    expect(oldFirstDestroy).toHaveBeenCalledOnce();
    expect(retainedDestroy).not.toHaveBeenCalled();
    expect(scene.selectionDragVisualsById.get('b')).toBe(retainedSecond);

    syncSelectionDragControllerVisuals(scene, [second], 0, 0);
    expect(mocks.createDecorationVisual).toHaveBeenCalledTimes(3);
    expect(scene.selectionDragVisualsById.has('a')).toBe(false);
    expect(scene.selectionDragControllerVisuals.children).toEqual([retainedSecond]);
  });

  it('destroys all visuals when selection is cleared', () => {
    const scene = makeScene();
    syncSelectionDragControllerVisuals(scene, [makeDecorationLayer('a')], 0, 0);

    hideSelectionDragController(scene);

    expect(scene.selectionDragVisualsById.size).toBe(0);
    expect(scene.selectionDragVisualDisplayKeysById.size).toBe(0);
    expect(scene.selectionDragControllerVisuals.children).toHaveLength(0);
    expect(scene.selectionDragController.visible).toBe(false);
    expect(scene.selectionDragController.eventMode).toBe('none');
  });
});
