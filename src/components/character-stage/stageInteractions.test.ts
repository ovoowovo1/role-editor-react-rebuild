import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FederatedPointerEvent } from 'pixi.js';
import type { BrushDrawState, DragState, StageRuntimeRefs } from './types';

const mocks = vi.hoisted(() => ({
  appendBrushFillPoint: vi.fn(),
  beginBrushFillDraw: vi.fn(),
  commitBrushFillDraw: vi.fn(),
  commitDecorationDrag: vi.fn(),
  updateDecorationDrag: vi.fn()
}));

vi.mock('./brushFillInteractions', () => ({
  appendBrushFillPoint: mocks.appendBrushFillPoint,
  beginBrushFillDraw: mocks.beginBrushFillDraw,
  commitBrushFillDraw: mocks.commitBrushFillDraw
}));

vi.mock('./dragInteractions', () => ({
  beginDecorationDrag: vi.fn(),
  commitDecorationDrag: mocks.commitDecorationDrag,
  updateDecorationDrag: mocks.updateDecorationDrag
}));

vi.mock('./stageOverlayVisuals', () => ({
  getCachedControllerGlowFilter: vi.fn(() => ({}))
}));

vi.mock('./pixiVisuals', () => ({
  applyDecorationDisplayTransform: vi.fn(),
  createDecorationVisual: vi.fn(() => new Container()),
  createDisguiseEntryDisplay: vi.fn(() => new Container())
}));

import { Container, Rectangle } from 'pixi.js';
import { buildDecorationHitIndex } from './decorationHitIndex';
import { beginDecorationDrag } from './dragInteractions';
import { createStagePointerHandlers } from './stageInteractions';

interface RafHarness {
  runNext(): void;
  pendingCount(): number;
}

function installRafHarness(): RafHarness {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
    callbacks.delete(id);
  }));

  return {
    runNext() {
      const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!entry) throw new Error('No animation frame is pending');
      callbacks.delete(entry[0]);
      entry[1](0);
    },
    pendingCount() {
      return callbacks.size;
    }
  };
}

function pointerEvent(
  x: number,
  y: number,
  target: object,
  currentTarget: object
): FederatedPointerEvent {
  return {
    global: { x, y },
    target,
    currentTarget
  } as unknown as FederatedPointerEvent;
}

function makeRuntimeRefs(): StageRuntimeRefs {
  return {
    roleRef: { current: { decorations: [] } },
    selectedIdsRef: { current: ['selected'] },
    selectedReferenceImageIdRef: { current: null },
    callbacksRef: {
      current: {
        onCommitDrag: vi.fn(),
        onClearSelection: vi.fn()
      }
    },
    brushFillRef: {
      current: {
        active: false,
        brushSize: 18,
        mask: { points: [] }
      }
    },
    sceneRef: { current: null },
    dragRef: { current: null },
    brushDrawRef: { current: null }
  } as unknown as StageRuntimeRefs;
}

describe('stage pointer interactions', () => {
  let raf: RafHarness;

  beforeEach(() => {
    vi.clearAllMocks();
    raf = installRafHarness();
    mocks.appendBrushFillPoint.mockReturnValue(true);
    mocks.updateDecorationDrag.mockReturnValue(true);
    mocks.commitBrushFillDraw.mockReturnValue(false);
    mocks.commitDecorationDrag.mockImplementation((refs: StageRuntimeRefs) => {
      const hadActiveDrag = Boolean(refs.dragRef.current);
      refs.dragRef.current = null;
      return hadActiveDrag;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('coalesces drag moves to one update per animation frame and flushes pointer-up', () => {
    const refs = makeRuntimeRefs();
    refs.dragRef.current = {} as DragState;
    const handlers = createStagePointerHandlers(refs);
    const stage = {};
    const decoration = {};

    handlers.handlePointerDown(pointerEvent(0, 0, decoration, stage));
    handlers.handleMove(pointerEvent(5, 6, decoration, stage));
    handlers.handleMove(pointerEvent(8, 9, decoration, stage));

    expect(mocks.updateDecorationDrag).not.toHaveBeenCalled();
    expect(raf.pendingCount()).toBe(1);

    raf.runNext();
    expect(mocks.updateDecorationDrag).toHaveBeenCalledTimes(1);
    expect(mocks.updateDecorationDrag).toHaveBeenLastCalledWith({ x: 8, y: 9 }, refs);

    handlers.handleMove(pointerEvent(10, 11, decoration, stage));
    handlers.handleUp(pointerEvent(12, 13, decoration, stage));

    expect(raf.pendingCount()).toBe(0);
    expect(mocks.updateDecorationDrag).toHaveBeenCalledTimes(2);
    expect(mocks.updateDecorationDrag).toHaveBeenLastCalledWith({ x: 12, y: 13 }, refs);
    expect(mocks.commitDecorationDrag).toHaveBeenCalledOnce();
  });

  it('uses the same frame scheduler for brush strokes and commits the final point', () => {
    const refs = makeRuntimeRefs();
    refs.brushFillRef.current.active = true;
    mocks.beginBrushFillDraw.mockImplementation((_position, runtimeRefs: StageRuntimeRefs) => {
      runtimeRefs.brushDrawRef.current = { points: [] } as BrushDrawState;
      return true;
    });
    mocks.commitBrushFillDraw.mockImplementation((runtimeRefs: StageRuntimeRefs) => {
      runtimeRefs.brushDrawRef.current = null;
      return true;
    });

    const handlers = createStagePointerHandlers(refs);
    const stage = {};
    handlers.handlePointerDown(pointerEvent(1, 2, stage, stage));
    handlers.handleMove(pointerEvent(3, 4, stage, stage));
    handlers.handleMove(pointerEvent(5, 6, stage, stage));

    expect(mocks.appendBrushFillPoint).not.toHaveBeenCalled();
    raf.runNext();
    expect(mocks.appendBrushFillPoint).toHaveBeenLastCalledWith({ x: 5, y: 6 }, refs);

    handlers.handleMove(pointerEvent(7, 8, stage, stage));
    handlers.handleUp(pointerEvent(9, 10, stage, stage));

    expect(mocks.appendBrushFillPoint).toHaveBeenLastCalledWith({ x: 9, y: 10 }, refs);
    expect(mocks.commitBrushFillDraw).toHaveBeenCalledOnce();
    expect(mocks.commitDecorationDrag).not.toHaveBeenCalled();
  });

  it('cancels a pending frame when the scene is disposed', () => {
    const refs = makeRuntimeRefs();
    refs.dragRef.current = {} as DragState;
    const handlers = createStagePointerHandlers(refs);
    const stage = {};

    handlers.handlePointerDown(pointerEvent(0, 0, stage, stage));
    handlers.handleMove(pointerEvent(10, 10, stage, stage));
    expect(raf.pendingCount()).toBe(1);

    handlers.dispose();
    expect(raf.pendingCount()).toBe(0);
    expect(mocks.updateDecorationDrag).not.toHaveBeenCalled();
  });

  it('clears selection only for an unmoved click on the empty stage', () => {
    const refs = makeRuntimeRefs();
    const handlers = createStagePointerHandlers(refs);
    const stage = {};

    handlers.handlePointerDown(pointerEvent(2, 3, stage, stage));
    handlers.handleUp(pointerEvent(2, 3, stage, stage));

    expect(refs.callbacksRef.current.onClearSelection).toHaveBeenCalledOnce();
    expect(raf.pendingCount()).toBe(0);
  });

  it('does not treat a click on an image display as an empty-stage click', () => {
    const refs = makeRuntimeRefs();
    const handlers = createStagePointerHandlers(refs);
    const stage = {};
    const image = {};

    handlers.handlePointerDown(pointerEvent(2, 3, image, stage));
    handlers.handleUp(pointerEvent(2, 3, image, stage));

    expect(refs.callbacksRef.current.onClearSelection).not.toHaveBeenCalled();
  });

  it('selects and immediately starts dragging an unselected decoration hit via spatial index', () => {
    const refs = makeRuntimeRefs();
    const onSelectDecoration = vi.fn();
    refs.callbacksRef.current.onSelectDecoration = onSelectDecoration;
    const disguiseRoot = new Container();
    disguiseRoot.toLocal = (pt) => pt as never;
    const hitContainer = new Container();
    hitContainer.getLocalBounds = () => new Rectangle(-10, -10, 20, 20);
    const deco = {
      id: 'deco-a',
      code: 'c1',
      assetId: 'a1',
      name: 'Deco A',
      x: 50,
      y: 60,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      visible: true,
      opacity: 1
    };
    const decoDisplays = new Map([['deco-a', { container: hitContainer, displayKey: 'k', transformKey: 't' }]]);
    refs.roleRef.current = { decorations: [deco] } as never;
    refs.sceneRef.current = {
      disguiseRoot,
      decorationInteractionEnabled: true,
      decoDisplays,
      decorationHitIndex: buildDecorationHitIndex([deco], decoDisplays)
    } as never;

    const handlers = createStagePointerHandlers(refs);
    const stage = {};
    handlers.handlePointerDown(pointerEvent(50, 60, stage, stage));

    expect(beginDecorationDrag).toHaveBeenCalledWith(
      'deco-a',
      { x: 50, y: 60 },
      disguiseRoot,
      refs,
      ['deco-a']
    );
    expect(onSelectDecoration).not.toHaveBeenCalled();
    raf.runNext();
    expect(onSelectDecoration).toHaveBeenCalledWith('deco-a', false);

    handlers.handleUp(pointerEvent(50, 60, stage, stage));
    expect(refs.callbacksRef.current.onClearSelection).not.toHaveBeenCalled();
  });

  it('supports shift-click additive multi-selection and drag on the stage', () => {
    const refs = makeRuntimeRefs();
    const onSelectDecoration = vi.fn();
    refs.callbacksRef.current.onSelectDecoration = onSelectDecoration;
    refs.selectedIdsRef.current = ['deco-a'];
    const disguiseRoot = new Container();
    disguiseRoot.toLocal = (pt) => pt as never;
    const hitContainer = new Container();
    hitContainer.getLocalBounds = () => new Rectangle(-10, -10, 20, 20);
    const decoB = {
      id: 'deco-b',
      code: 'c2',
      assetId: 'a2',
      name: 'Deco B',
      x: 100,
      y: 100,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      visible: true,
      opacity: 1
    };
    const decoDisplays = new Map([['deco-b', { container: hitContainer, displayKey: 'k', transformKey: 't' }]]);
    refs.roleRef.current = { decorations: [decoB] } as never;
    refs.sceneRef.current = {
      disguiseRoot,
      decorationInteractionEnabled: true,
      decoDisplays,
      decorationHitIndex: buildDecorationHitIndex([decoB], decoDisplays)
    } as never;

    const handlers = createStagePointerHandlers(refs);
    const stage = {};
    const shiftDown = {
      ...pointerEvent(100, 100, stage, stage),
      shiftKey: true
    } as unknown as FederatedPointerEvent;

    handlers.handlePointerDown(shiftDown);

    expect(refs.selectedIdsRef.current).toEqual(['deco-a', 'deco-b']);
    expect(beginDecorationDrag).toHaveBeenCalledWith(
      'deco-b',
      { x: 100, y: 100 },
      disguiseRoot,
      refs,
      ['deco-a', 'deco-b']
    );
    raf.runNext();
    expect(onSelectDecoration).toHaveBeenCalledWith('deco-b', true);
  });

  it('supports marquee box selection when dragging on empty stage', () => {
    const refs = makeRuntimeRefs();
    const onSelectMultipleDecorations = vi.fn();
    refs.callbacksRef.current.onSelectMultipleDecorations = onSelectMultipleDecorations;
    const disguiseRoot = new Container();
    disguiseRoot.toLocal = (pt) => pt as never;
    const hitContainerA = new Container();
    hitContainerA.getLocalBounds = () => new Rectangle(-10, -10, 20, 20);
    const hitContainerB = new Container();
    hitContainerB.getLocalBounds = () => new Rectangle(-10, -10, 20, 20);
    const decoA = {
      id: 'deco-a',
      code: 'c1',
      assetId: 'a1',
      name: 'Deco A',
      x: 20,
      y: 20,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      visible: true,
      opacity: 1
    };
    const decoB = {
      id: 'deco-b',
      code: 'c2',
      assetId: 'a2',
      name: 'Deco B',
      x: 60,
      y: 60,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      visible: true,
      opacity: 1
    };
    const decoDisplays = new Map([
      ['deco-a', { container: hitContainerA, displayKey: 'k1', transformKey: 't1' }],
      ['deco-b', { container: hitContainerB, displayKey: 'k2', transformKey: 't2' }]
    ]);
    refs.roleRef.current = { decorations: [decoB, decoA] } as never;
    refs.sceneRef.current = {
      disguiseRoot,
      decorationInteractionEnabled: true,
      decoDisplays,
      decorationsById: new Map([['deco-a', decoA], ['deco-b', decoB]]),
      decorationHitIndex: buildDecorationHitIndex([decoB, decoA], decoDisplays),
      headLayerClip: { visible: false },
      headLayerSelectionOverlay: { visible: false },
      headLayerSelectionVisual: { position: { copyFrom: vi.fn() }, scale: { copyFrom: vi.fn() } },
      selectionDragController: { visible: false, position: { set: vi.fn() }, filters: null },
      selectionDragVisualKey: '',
      selectionDragVisualsById: new Map(),
      selectionDragVisualDisplayKeysById: new Map(),
      selectionDragControllerVisuals: new Container(),
      selectionDragControllerGraphic: { clear: vi.fn(), beginFill: vi.fn(), drawRect: vi.fn(), endFill: vi.fn() }
    } as never;

    const handlers = createStagePointerHandlers(refs);
    const stage = {};
    handlers.handlePointerDown(pointerEvent(0, 0, stage, stage));
    handlers.handleMove(pointerEvent(80, 80, stage, stage));
    raf.runNext();
    handlers.handleUp(pointerEvent(80, 80, stage, stage));

    expect(onSelectMultipleDecorations).toHaveBeenCalledWith(['deco-b', 'deco-a']);
  });
});
