import { Container } from 'pixi.js';
import type { DecorationLayer } from '../../types/role';
import {
  dragAnchorPosition,
  multiDragStartMode,
  positionRange,
  summarizeMultiDragPositions
} from '../../lib/stage/characterStageHelpers';
import { createLargeMultiDragPreview } from './stageOverlayVisuals';
import { getDisplayRootPosition, reparentPreservingPosition } from './sceneGeometry';
import {
  setDecorationInteractionEnabled,
  syncDisguiseChildOrder,
  syncSelectionControllerForIds
} from './sceneSync';
import type { DraggedDisplayItem, StagePointerPosition, StageRuntimeRefs } from './types';

function selectedDecorationsForDrag(
  decorations: DecorationLayer[],
  selectedIds: readonly string[]
): DecorationLayer[] {
  const selectedSet = new Set(selectedIds);
  return decorations.filter((deco) => selectedSet.has(deco.id));
}

function beginDirectDrag(
  id: string,
  global: StagePointerPosition,
  root: Container,
  selectionIds: string[],
  refs: StageRuntimeRefs
): void {
  const scene = refs.sceneRef.current;
  const record = scene?.decoDisplays.get(id);
  if (!scene || !record) return;

  const start = getDisplayRootPosition(record.container, scene.disguiseRoot);
  const local = root.toLocal(global);
  refs.dragRef.current = {
    selectionIds,
    offsetX: local.x - start.x,
    offsetY: local.y - start.y,
    controllerStartX: scene.selectionDragController.position.x,
    controllerStartY: scene.selectionDragController.position.y,
    visual: {
      kind: 'direct',
      container: record.container,
      startX: start.x,
      startY: start.y
    }
  };
}

function beginPreviewDrag(
  global: StagePointerPosition,
  root: Container,
  selectionIds: string[],
  summary: NonNullable<ReturnType<typeof summarizeMultiDragPositions>>,
  refs: StageRuntimeRefs
): void {
  const scene = refs.sceneRef.current;
  if (!scene) return;

  const preview = createLargeMultiDragPreview(summary.maxX - summary.minX, summary.maxY - summary.minY);
  preview.position.set(summary.centerX, summary.centerY);
  scene.disguiseRoot.addChild(preview);

  const local = root.toLocal(global);
  refs.dragRef.current = {
    selectionIds,
    offsetX: local.x - summary.centerX,
    offsetY: local.y - summary.centerY,
    controllerStartX: scene.selectionDragController.position.x,
    controllerStartY: scene.selectionDragController.position.y,
    visual: {
      kind: 'preview',
      container: preview,
      startX: summary.centerX,
      startY: summary.centerY
    }
  };
}

function beginOverlayDrag(
  global: StagePointerPosition,
  root: Container,
  selectionIds: string[],
  selectedDecorations: DecorationLayer[],
  displayPositions: Map<string, StagePointerPosition>,
  summary: NonNullable<ReturnType<typeof summarizeMultiDragPositions>>,
  refs: StageRuntimeRefs
): boolean {
  const scene = refs.sceneRef.current;
  if (!scene) return false;

  const items: DraggedDisplayItem[] = [];
  for (const deco of selectedDecorations) {
    const record = scene.decoDisplays.get(deco.id);
    if (!record) continue;
    const start = displayPositions.get(deco.id) ?? getDisplayRootPosition(record.container, scene.disguiseRoot);
    items.push({
      id: deco.id,
      container: record.container,
      startX: start.x,
      startY: start.y
    });
  }
  if (items.length < 2) return false;

  const overlay = new Container();
  overlay.position.set(summary.centerX, summary.centerY);
  scene.disguiseRoot.addChild(overlay);

  for (let index = items.length - 1; index >= 0; index -= 1) {
    reparentPreservingPosition(items[index].container, overlay);
  }

  const selectedSet = new Set(selectionIds);
  syncDisguiseChildOrder(scene, refs.roleRef.current, overlay, selectedSet);

  const local = root.toLocal(global);
  refs.dragRef.current = {
    selectionIds,
    offsetX: local.x - summary.centerX,
    offsetY: local.y - summary.centerY,
    controllerStartX: scene.selectionDragController.position.x,
    controllerStartY: scene.selectionDragController.position.y,
    visual: {
      kind: 'overlay',
      container: overlay,
      items,
      startX: summary.centerX,
      startY: summary.centerY
    }
  };
  return true;
}

export function beginDecorationDrag(
  id: string,
  global: StagePointerPosition,
  root: Container,
  refs: StageRuntimeRefs
): void {
  if (refs.brushFillRef.current.active || refs.dragRef.current) return;

  const scene = refs.sceneRef.current;
  if (!scene) return;

  const selectedDecorations = selectedDecorationsForDrag(
    refs.roleRef.current.decorations,
    refs.selectedIdsRef.current
  );
  const selectionIds = selectedDecorations.map((deco) => deco.id);
  if (!selectionIds.includes(id)) return;

  scene.selectionDragController.eventMode = 'none';
  scene.selectionDragController.cursor = 'default';
  setDecorationInteractionEnabled(scene, false);
  syncDisguiseChildOrder(scene, refs.roleRef.current);

  if (selectedDecorations.length < 2) {
    beginDirectDrag(id, global, root, selectionIds, refs);
    return;
  }

  const displayPositions = new Map<string, StagePointerPosition>();
  const positions: Array<{ id: string; x: number; y: number }> = [];
  let displayCount = 0;

  for (const deco of selectedDecorations) {
    const record = scene.decoDisplays.get(deco.id);
    if (record) displayCount += 1;
    const position = record
      ? getDisplayRootPosition(record.container, scene.disguiseRoot)
      : { x: deco.x, y: deco.y };
    displayPositions.set(deco.id, position);
    positions.push({ id: deco.id, ...position });
  }

  const summary = summarizeMultiDragPositions(positions);
  if (!summary) return;

  const mode = multiDragStartMode(selectedDecorations.length, displayCount);
  if (mode === 'preview') {
    beginPreviewDrag(global, root, selectionIds, summary, refs);
    return;
  }

  if (
    mode === 'overlay' &&
    beginOverlayDrag(global, root, selectionIds, selectedDecorations, displayPositions, summary, refs)
  ) {
    return;
  }

  beginDirectDrag(id, global, root, selectionIds, refs);
}

export function updateDecorationDrag(global: StagePointerPosition, refs: StageRuntimeRefs): boolean {
  const drag = refs.dragRef.current;
  const scene = refs.sceneRef.current;
  if (!drag || !scene) return false;

  const local = scene.disguiseRoot.toLocal(global);
  const next = dragAnchorPosition(
    local.x,
    local.y,
    drag.offsetX,
    drag.offsetY,
    positionRange(refs.roleRef.current)
  );
  drag.visual.container.position.set(next.x, next.y);
  scene.selectionDragController.position.set(
    drag.controllerStartX + next.x - drag.visual.startX,
    drag.controllerStartY + next.y - drag.visual.startY
  );
  return true;
}

function restoreSelectionControllerOnNextFrame(
  scene: NonNullable<StageRuntimeRefs['sceneRef']['current']>,
  refs: StageRuntimeRefs
): void {
  requestAnimationFrame(() => {
    if (refs.sceneRef.current !== scene || refs.dragRef.current || scene.actorStage.destroyed) return;
    syncSelectionControllerForIds(scene, refs.selectedIdsRef.current);
    syncDisguiseChildOrder(scene, refs.roleRef.current);
  });
}

export function commitDecorationDrag(refs: StageRuntimeRefs): boolean {
  const drag = refs.dragRef.current;
  if (!drag) return false;

  refs.dragRef.current = null;
  const scene = refs.sceneRef.current;
  const { visual } = drag;
  const dx = visual.container.position.x - visual.startX;
  const dy = visual.container.position.y - visual.startY;

  if (visual.kind === 'overlay') {
    if (scene) {
      for (const item of visual.items) {
        reparentPreservingPosition(item.container, scene.disguiseRoot);
      }
    }
    if (!visual.container.destroyed) {
      visual.container.destroy({ children: false });
    }
  } else if (visual.kind === 'preview' && !visual.container.destroyed) {
    visual.container.destroy({ children: true });
  }

  if (scene) {
    setDecorationInteractionEnabled(scene, !refs.brushFillRef.current.active);
    syncDisguiseChildOrder(scene, refs.roleRef.current);
  }

  refs.callbacksRef.current.onCommitDrag(drag.selectionIds, dx, dy);
  if (scene) {
    restoreSelectionControllerOnNextFrame(scene, refs);
  }
  return true;
}
