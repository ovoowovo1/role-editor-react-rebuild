import { Container, FederatedPointerEvent } from 'pixi.js';
import type { DecorationLayer } from '../../types/role';
import { clampToDisc } from '../../lib/math';
import {
  multiDragStartMode,
  positionRange,
  summarizeMultiDragPositions
} from '../../lib/stage/characterStageHelpers';
import {
  createLargeMultiDragPreview,
  getCachedGlowFilter
} from './stageOverlayVisuals';
import {
  getDisplayRootPosition,
  reparentPreservingPosition
} from './sceneGeometry';
import {
  syncDisguiseChildOrder
} from './sceneSync';
import { hideSelectionDragController } from './selectionControllerSync';
import type { DragState, StageRuntimeRefs } from './types';

export function beginDecorationDrag(
  id: string,
  event: FederatedPointerEvent,
  root: Container,
  refs: StageRuntimeRefs
): void {
  if (refs.brushFillRef.current.active) return;
  const currentRole = refs.roleRef.current;
  const selectedIdsSnapshot = refs.selectedIdsRef.current;
  const selectedSet = new Set(selectedIdsSnapshot);
  if (!selectedSet.has(id)) return;

  const deco = currentRole.decorations.find((item) => item.id === id);
  if (!deco) return;

  if (refs.sceneRef.current) {
    hideSelectionDragController(refs.sceneRef.current);
    syncDisguiseChildOrder(refs.sceneRef.current, currentRole);
  }

  const isMultiDrag = selectedIdsSnapshot.length > 1;
  if (isMultiDrag && refs.sceneRef.current) {
    const currentScene = refs.sceneRef.current;
    const selectedDecos: DecorationLayer[] = [];
    const displayPositions = new Map<string, { x: number; y: number }>();
    const selectedPositions: Array<{ id: string; x: number; y: number }> = [];
    let overlayItemCount = 0;

    for (const item of currentRole.decorations) {
      if (!selectedSet.has(item.id)) continue;
      const record = currentScene.decoDisplays.get(item.id);
      if (record) overlayItemCount += 1;
      const displayPosition = record
        ? getDisplayRootPosition(record.container, currentScene.disguiseRoot)
        : { x: item.x, y: item.y };
      selectedDecos.push(item);
      displayPositions.set(item.id, displayPosition);
      selectedPositions.push({ id: item.id, x: displayPosition.x, y: displayPosition.y });
    }

    const summary = summarizeMultiDragPositions(selectedPositions);
    const dragMode = multiDragStartMode(selectedDecos.length, overlayItemCount);
    if (!summary || dragMode === 'single-fallback') {
      beginSingleDecorationDrag(id, event, root, deco, refs);
      return;
    }

    if (dragMode === 'preview') {
      const preview = createLargeMultiDragPreview(summary.maxX - summary.minX, summary.maxY - summary.minY);
      preview.position.set(summary.centerX, summary.centerY);
      currentScene.disguiseRoot.addChild(preview);

      const local = root.toLocal(event.global);
      refs.dragRef.current = {
        id,
        offsetX: local.x - summary.centerX,
        offsetY: local.y - summary.centerY,
        preview: { container: preview, startX: summary.centerX, startY: summary.centerY }
      };
      return;
    }

    const items: NonNullable<DragState['overlay']>['items'] = [];
    for (const item of selectedDecos) {
      const record = currentScene.decoDisplays.get(item.id);
      if (!record) continue;
      const displayPosition = displayPositions.get(item.id) ?? getDisplayRootPosition(record.container, currentScene.disguiseRoot);
      items.push({
        id: item.id,
        decoContainer: record.container,
        startX: displayPosition.x,
        startY: displayPosition.y
      });
    }

    if (items.length < 2) {
      beginSingleDecorationDrag(id, event, root, deco, refs);
      return;
    }

    const overlay = new Container();
    overlay.position.set(summary.centerX, summary.centerY);
    overlay.filters = [getCachedGlowFilter()];
    currentScene.disguiseRoot.addChild(overlay);

    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      reparentPreservingPosition(item.decoContainer, overlay);
    }

    syncDisguiseChildOrder(currentScene, currentRole, overlay, selectedSet);

    const local = root.toLocal(event.global);
    refs.dragRef.current = {
      id,
      offsetX: local.x - summary.centerX,
      offsetY: local.y - summary.centerY,
      overlay: { container: overlay, items, startX: summary.centerX, startY: summary.centerY }
    };
    return;
  }

  beginSingleDecorationDrag(id, event, root, deco, refs);
}

function beginSingleDecorationDrag(
  id: string,
  event: FederatedPointerEvent,
  root: Container,
  deco: DecorationLayer,
  refs: StageRuntimeRefs
): void {
  refs.callbacksRef.current.onBeginTransient();
  const local = root.toLocal(event.global);
  refs.dragRef.current = {
    id,
    offsetX: local.x - deco.x,
    offsetY: local.y - deco.y
  };
}

export function updateDecorationDrag(event: FederatedPointerEvent, refs: StageRuntimeRefs): boolean {
  const dragging = refs.dragRef.current;
  const currentScene = refs.sceneRef.current;
  if (!dragging || !currentScene) return false;

  const local = currentScene.disguiseRoot.toLocal(event.global);
  let nx = local.x - dragging.offsetX;
  let ny = local.y - dragging.offsetY;

  if (dragging.overlay) {
    const disc = clampToDisc(nx, ny, positionRange(refs.roleRef.current));
    dragging.overlay.container.position.set(disc.x, disc.y);
    return true;
  }

  if (dragging.preview) {
    const disc = clampToDisc(nx, ny, positionRange(refs.roleRef.current));
    dragging.preview.container.position.set(disc.x, disc.y);
    return true;
  }

  const disc = clampToDisc(nx, ny, positionRange(refs.roleRef.current));
  nx = disc.x;
  ny = disc.y;

  const record = currentScene.decoDisplays.get(dragging.id);
  if (record) {
    record.container.position.set(nx, ny);
  }

  refs.callbacksRef.current.onUpdateDecoration(
    dragging.id,
    {
      x: nx,
      y: ny
    },
    false
  );
  return true;
}

export function commitDecorationDrag(refs: StageRuntimeRefs): boolean {
  if (!refs.dragRef.current) return false;
  const dragging = refs.dragRef.current;

  if (dragging.overlay) {
    const currentScene = refs.sceneRef.current;
    const dx = dragging.overlay.container.position.x - dragging.overlay.startX;
    const dy = dragging.overlay.container.position.y - dragging.overlay.startY;

    if (currentScene) {
      for (const item of dragging.overlay.items) {
        reparentPreservingPosition(item.decoContainer, currentScene.disguiseRoot);
      }
      syncDisguiseChildOrder(currentScene, refs.roleRef.current);
    }

    if (!dragging.overlay.container.destroyed) {
      dragging.overlay.container.destroy({ children: false });
    }

    requestAnimationFrame(() => {
      refs.callbacksRef.current.onCommitDragDelta(dx, dy);
    });

    refs.dragRef.current = null;
    return true;
  }

  if (dragging.preview) {
    const dx = dragging.preview.container.position.x - dragging.preview.startX;
    const dy = dragging.preview.container.position.y - dragging.preview.startY;

    if (!dragging.preview.container.destroyed) {
      dragging.preview.container.destroy({ children: true });
    }

    requestAnimationFrame(() => {
      refs.callbacksRef.current.onCommitDragDelta(dx, dy);
    });

    refs.dragRef.current = null;
    return true;
  }

  refs.dragRef.current = null;
  refs.callbacksRef.current.onCommitTransient();
  return true;
}
