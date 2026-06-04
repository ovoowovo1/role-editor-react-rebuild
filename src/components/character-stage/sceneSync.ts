import { Container } from 'pixi.js';
import type { RoleDocument } from '../../types/role';
import { DECO_GLOW_CAP } from '../../constants/stage';
import {
  clampedHeadLayerIndex,
  decorationDisplayKey,
  decorationTransformKey,
  sameChildOrder
} from '../../lib/stage/characterStageHelpers';
import {
  applyDecorationDisplayTransform,
  createDisguiseEntryDisplay
} from './pixiVisuals';
import { getCachedGlowFilter } from './stageOverlayVisuals';
import type { DecoDisplayRecord, DisguiseDecoOptions, StageSceneState } from './types';
import { syncSelectionDragController } from './selectionControllerSync';

function syncDecorationSelection(record: DecoDisplayRecord, selected: boolean, skipGlow: boolean): void {
  const nextFilters = selected && !skipGlow ? [getCachedGlowFilter()] : null;
  if (record.selected === selected && record.container.filters === nextFilters) return;
  record.container.filters = nextFilters;
  record.selected = selected;
}

function replaceDisguiseChildren(root: Container, children: Container[]): void {
  root.removeChildren();
  const chunkSize = 1000;
  for (let index = 0; index < children.length; index += chunkSize) {
    root.addChild(...children.slice(index, index + chunkSize));
  }
}

export function syncDisguiseChildOrder(scene: StageSceneState, role: RoleDocument, overlay?: Container | null, selectedSet?: Set<string> | null): void {
  const topFirstChildren: Container[] = [];
  let overlayAdded = false;

  for (const deco of role.decorations) {
    const record = scene.decoDisplays.get(deco.id);
    if (!record) continue;
    if (selectedSet?.has(deco.id)) {
      if (!overlayAdded && overlay) {
        topFirstChildren.push(overlay);
        overlayAdded = true;
      }
    } else {
      topFirstChildren.push(record.container);
    }
  }

  const headIndex = clampedHeadLayerIndex(role);
  topFirstChildren.splice(headIndex, 0, scene.headLayerClip);

  const orderedChildren = topFirstChildren.slice().reverse();
  if (!overlay && scene.selectionDragController.visible) {
    orderedChildren.push(scene.selectionDragController);
  }
  if (scene.brushFillOverlay.visible) {
    orderedChildren.push(scene.brushFillOverlay);
  }

  if (sameChildOrder(scene.lastDisguiseChildOrder, orderedChildren)) return;
  replaceDisguiseChildren(scene.disguiseRoot, orderedChildren);
  scene.lastDisguiseChildOrder = orderedChildren;
}

export function syncDecorationDisplays(
  scene: StageSceneState,
  role: RoleDocument,
  selectedIds: string[],
  decoOptions: DisguiseDecoOptions,
  activeOverlay?: { container: Container; selectedSet: Set<string> } | null
): void {
  const decorationsById = new Map(role.decorations.map((deco) => [deco.id, deco]));
  const selectedSet = new Set(selectedIds);
  const skipGlow = selectedIds.length > DECO_GLOW_CAP || selectedIds.length > 0;

  for (const [id, record] of scene.decoDisplays) {
    const deco = decorationsById.get(id);
    if (deco && record.displayKey === decorationDisplayKey(deco)) continue;
    if (record.container.parent === scene.disguiseRoot) {
      scene.disguiseRoot.removeChild(record.container);
    }
    if (!record.container.destroyed) {
      record.container.destroy({ children: true });
    }
    scene.decoDisplays.delete(id);
  }

  for (const deco of role.decorations) {
    let record = scene.decoDisplays.get(deco.id);
    if (!record) {
      const container = createDisguiseEntryDisplay(deco, scene.failedTextures, scene.disguiseRoot, decoOptions);
      if (!container) continue;
      record = {
        container,
        displayKey: decorationDisplayKey(deco),
        transformKey: '',
        selected: false
      };
      scene.decoDisplays.set(deco.id, record);
    }

    const transformKey = decorationTransformKey(deco);
    const isOverlayChild = activeOverlay?.selectedSet.has(deco.id) && record.container.parent === activeOverlay.container;
    if (record.transformKey !== transformKey && !isOverlayChild) {
      applyDecorationDisplayTransform(record.container, deco);
      record.transformKey = transformKey;
    }
    syncDecorationSelection(record, selectedSet.has(deco.id), skipGlow);
  }

  syncSelectionDragController(scene, role, selectedIds, !!activeOverlay);
  syncDisguiseChildOrder(scene, role, activeOverlay?.container, activeOverlay?.selectedSet);
}
