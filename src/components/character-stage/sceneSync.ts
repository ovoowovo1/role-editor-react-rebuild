import { Container } from 'pixi.js';
import type { RoleDocument } from '../../types/role';
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
import type { DisguiseDecoOptions, StageSceneState } from './types';
import { syncSelectionDragController } from './selectionControllerSync';

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
  if (scene.selectionDragController.visible) {
    orderedChildren.push(scene.selectionDragController);
  }
  if (scene.brushFillOverlay.visible) {
    orderedChildren.push(scene.brushFillOverlay);
  }

  if (sameChildOrder(scene.lastDisguiseChildOrder, orderedChildren)) return;
  replaceDisguiseChildren(scene.disguiseRoot, orderedChildren);
  scene.lastDisguiseChildOrder = orderedChildren;
}

export function setDecorationInteractionEnabled(
  scene: StageSceneState,
  enabled: boolean
): void {
  if (scene.decorationInteractionEnabled === enabled) return;
  scene.decorationInteractionEnabled = enabled;
  for (const { container } of scene.decoDisplays.values()) {
    container.eventMode = enabled ? 'static' : 'none';
    container.cursor = enabled ? 'pointer' : 'default';
  }
}

export function syncDecorationDisplays(
  scene: StageSceneState,
  role: RoleDocument,
  selectedIds: string[],
  decoOptions: DisguiseDecoOptions,
  activeOverlay?: { container: Container; selectedSet: Set<string> } | null,
  hasActiveDrag = false,
  decorationInteractionEnabled = true
): void {
  const decorationsById = new Map(role.decorations.map((deco) => [deco.id, deco]));
  const selectedDecorations = selectedIds
    .map((id) => decorationsById.get(id))
    .filter((deco): deco is NonNullable<typeof deco> => Boolean(deco));

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
        transformKey: ''
      };
      scene.decoDisplays.set(deco.id, record);
    }

    record.container.eventMode = decorationInteractionEnabled ? 'static' : 'none';
    record.container.cursor = decorationInteractionEnabled ? 'pointer' : 'default';

    const transformKey = decorationTransformKey(deco);
    const isOverlayChild = activeOverlay?.selectedSet.has(deco.id) && record.container.parent === activeOverlay.container;
    if (record.transformKey !== transformKey && !isOverlayChild) {
      applyDecorationDisplayTransform(record.container, deco);
      record.transformKey = transformKey;
    }
  }

  scene.decorationInteractionEnabled = decorationInteractionEnabled;
  syncSelectionDragController(scene, selectedDecorations, hasActiveDrag);
  syncDisguiseChildOrder(scene, role, activeOverlay?.container, activeOverlay?.selectedSet);
}
