import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js';
import { makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import {
  beginDecorationDrag,
  beginReferenceImageDrag,
  commitDecorationDrag,
  updateDecorationDrag
} from './dragInteractions';
import type { StageRuntimeRefs, StageSceneState } from './types';

const mocks = vi.hoisted(() => ({
  setDecorationInteractionEnabled: vi.fn(),
  syncDisguiseChildOrder: vi.fn()
}));

vi.mock('./sceneSync', () => ({
  setDecorationInteractionEnabled: mocks.setDecorationInteractionEnabled,
  syncDisguiseChildOrder: mocks.syncDisguiseChildOrder
}));

function makeRefs(scene: StageSceneState, visual: Container): StageRuntimeRefs {
  return {
    roleRef: { current: { decorations: [], headLayerIndex: 0 } } as never,
    selectedIdsRef: { current: ['deco-a'] },
    selectedReferenceImageIdRef: { current: null },
    callbacksRef: {
      current: {
        onCommitDrag: vi.fn(),
        onClearSelection: vi.fn()
      }
    },
    brushFillRef: { current: { active: false } } as never,
    sceneRef: { current: scene },
    dragRef: {
      current: {
        selectionIds: ['deco-a'],
        offsetX: 0,
        offsetY: 0,
        controllerStartX: 0,
        controllerStartY: 0,
        visual: {
          kind: 'direct',
          container: visual,
          startX: 0,
          startY: 0
        }
      }
    },
    brushDrawRef: { current: null }
  } as StageRuntimeRefs;
}

function makeMultiDragRefs(): { refs: StageRuntimeRefs; scene: StageSceneState; children: Container[] } {
  const disguiseRoot = new Container();
  const selectionDragController = new Container();
  const brushFillOverlay = new Container();
  const headLayerSelectionOverlay = new Container();
  const a = new Container();
  const b = new Container();
  const c = new Container();
  a.position.set(10, 20);
  b.position.set(0, 0);
  c.position.set(-10, -20);
  disguiseRoot.addChild(c, b, a, selectionDragController, brushFillOverlay, headLayerSelectionOverlay);

  const scene = {
    disguiseRoot,
    selectionDragController,
    brushFillOverlay,
    headLayerSelectionOverlay,
    decoDisplays: new Map([
      ['a', { container: a }],
      ['b', { container: b }],
      ['c', { container: c }]
    ]),
    decorationsById: new Map(),
    decorationInteractionEnabled: true
  } as unknown as StageSceneState;
  const role = makeRoleDocument({
    decorations: [
      makeDecorationLayer('a', { x: 10, y: 20 }),
      makeDecorationLayer('b'),
      makeDecorationLayer('c', { x: -10, y: -20 })
    ],
    headLayerIndex: 3
  });
  const refs: StageRuntimeRefs = {
    roleRef: { current: role },
    selectedIdsRef: { current: ['a', 'c'] },
    selectedReferenceImageIdRef: { current: null },
    callbacksRef: {
      current: {
        onCommitDrag: vi.fn(),
        onClearSelection: vi.fn()
      }
    },
    brushFillRef: { current: { active: false } } as never,
    sceneRef: { current: scene },
    dragRef: { current: null },
    brushDrawRef: { current: null }
  } as StageRuntimeRefs;
  return { refs, scene, children: [...disguiseRoot.children] as Container[] };
}

function makeReferenceImageRefs(selectedId: string | null): StageRuntimeRefs {
  const disguiseRoot = new Container();
  const image = new Container();
  image.position.set(12, 8);
  const selectionDragController = new Container();
  disguiseRoot.addChild(image, selectionDragController);
  const scene = {
    disguiseRoot,
    selectionDragController,
    referenceImageDisplays: new Map([['ref-a', { container: image }]])
  } as unknown as StageSceneState;
  return {
    roleRef: { current: { decorations: [], positionRange: 100 } } as never,
    selectedIdsRef: { current: [] },
    selectedReferenceImageIdRef: { current: selectedId },
    callbacksRef: {
      current: {
        onCommitDrag: vi.fn(),
        onClearSelection: vi.fn()
      }
    },
    brushFillRef: { current: { active: false } } as never,
    sceneRef: { current: scene },
    dragRef: { current: null },
    brushDrawRef: { current: null }
  } as StageRuntimeRefs;
}

describe('decoration drag commit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the selection mask at the drop position until role displays catch up', () => {
    const scene = {
      selectionDragController: new Container(),
      disguiseRoot: new Container()
    } as unknown as StageSceneState;
    scene.selectionDragController.position.set(24, 16);
    const filter = { kind: 'selection-glow' };
    scene.selectionDragController.filters = [filter as never];

    const visual = new Container();
    visual.position.set(24, 16);
    const refs = makeRefs(scene, visual);
    const onCommitDrag = refs.callbacksRef.current.onCommitDrag;

    expect(commitDecorationDrag(refs)).toBe(true);

    expect(scene.selectionDragController.position).toMatchObject({ x: 24, y: 16 });
    expect(scene.selectionDragController.filters).toEqual([filter]);
    expect(onCommitDrag).toHaveBeenCalledWith(['deco-a'], 24, 16);
    expect(refs.dragRef.current).toBeNull();
  });

  it('moves non-contiguous multi-selection in place without changing child order', () => {
    const { refs, scene, children } = makeMultiDragRefs();
    const root = scene.disguiseRoot;

    beginDecorationDrag('a', { x: 0, y: 0 }, root, refs);
    expect(refs.dragRef.current?.visual.kind).toBe('multi');
    expect(root.children).toEqual(children);

    expect(updateDecorationDrag({ x: 12, y: 8 }, refs)).toBe(true);
    expect(root.children).toEqual(children);
    expect(scene.decoDisplays.get('a')!.container.position).toMatchObject({ x: 22, y: 28 });
    expect(scene.decoDisplays.get('c')!.container.position).toMatchObject({ x: 2, y: -12 });
    expect(scene.decoDisplays.get('b')!.container.position).toMatchObject({ x: 0, y: 0 });
    expect(scene.selectionDragController.position).toMatchObject({ x: 12, y: 8 });
    expect(root.children.indexOf(scene.selectionDragController)).toBeGreaterThan(
      root.children.indexOf(scene.decoDisplays.get('a')!.container)
    );

    expect(commitDecorationDrag(refs)).toBe(true);
    expect(root.children).toEqual(children);
    expect(refs.callbacksRef.current.onCommitDrag).toHaveBeenCalledWith(['a', 'c'], 12, 8);
  });
});

describe('reference image drag selection guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores a stage pointer for an image that was not selected in the layer list', () => {
    const refs = makeReferenceImageRefs('other-image');
    const root = refs.sceneRef.current!.disguiseRoot;

    beginReferenceImageDrag('ref-a', { x: 12, y: 8 }, root, refs);

    expect(refs.dragRef.current).toBeNull();
    expect(mocks.setDecorationInteractionEnabled).not.toHaveBeenCalled();
  });

  it('starts dragging only the image currently selected in the layer list', () => {
    const refs = makeReferenceImageRefs('ref-a');
    const root = refs.sceneRef.current!.disguiseRoot;

    beginReferenceImageDrag('ref-a', { x: 12, y: 8 }, root, refs);

    expect(refs.dragRef.current?.visual.kind).toBe('reference-image');
    expect(refs.dragRef.current?.visual).toMatchObject({ id: 'ref-a', startX: 12, startY: 8 });
  });
});
