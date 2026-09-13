import { Container } from 'pixi.js';
import type { DecorationLayer } from '../../types/role';
import {
  dragAnchorPosition,
  multiDragStartMode,
  positionRange,
  summarizeMultiDragPositions
} from '../../lib/stage/characterStageHelpers';
import { createLargeMultiDragPreview } from './stageOverlayVisuals';
import { getDisplayRootPosition } from './sceneGeometry';
import {
  setDecorationInteractionEnabled,
  syncDisguiseChildOrder
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

function beginMultiDrag(
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

  const local = root.toLocal(global);
  refs.dragRef.current = {
    selectionIds,
    offsetX: local.x - summary.centerX,
    offsetY: local.y - summary.centerY,
    controllerStartX: scene.selectionDragController.position.x,
    controllerStartY: scene.selectionDragController.position.y,
    visual: {
      kind: 'multi',
      items,
      startX: summary.centerX,
      startY: summary.centerY,
      currentX: summary.centerX,
      currentY: summary.centerY
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
    mode === 'multi' &&
    beginMultiDrag(global, root, selectionIds, selectedDecorations, displayPositions, summary, refs)
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
  if (drag.visual.kind === 'multi') {
    drag.visual.currentX = next.x;
    drag.visual.currentY = next.y;
    const dx = next.x - drag.visual.startX;
    const dy = next.y - drag.visual.startY;
    for (const item of drag.visual.items) {
      item.container.position.set(item.startX + dx, item.startY + dy);
    }
  } else {
    drag.visual.container.position.set(next.x, next.y);
  }
  scene.selectionDragController.position.set(
    drag.controllerStartX + next.x - drag.visual.startX,
    drag.controllerStartY + next.y - drag.visual.startY
  );
  return true;
}

export function commitDecorationDrag(refs: StageRuntimeRefs): boolean {
  const drag = refs.dragRef.current;
  if (!drag) return false;

  refs.dragRef.current = null;
  const scene = refs.sceneRef.current;
  const { visual } = drag;
  const currentX = visual.kind === 'multi' ? visual.currentX : visual.container.position.x;
  const currentY = visual.kind === 'multi' ? visual.currentY : visual.container.position.y;
  const dx = currentX - visual.startX;
  const dy = currentY - visual.startY;

  if (visual.kind === 'preview' && !visual.container.destroyed) {
    visual.container.destroy({ children: true });
  }

  if (scene) {
    setDecorationInteractionEnabled(scene, !refs.brushFillRef.current.active);
    syncDisguiseChildOrder(scene, refs.roleRef.current);
  }

  refs.callbacksRef.current.onCommitDrag(drag.selectionIds, dx, dy);
  return true;
}
