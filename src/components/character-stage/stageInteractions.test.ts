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
});
