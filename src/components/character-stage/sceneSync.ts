import { Container } from 'pixi.js';
import type { DecorationLayer, RoleDocument } from '../../types/role';
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

export interface ActiveDecorationOverlay {
  container: Container;
  selectedSet: Set<string>;
}

function replaceDisguiseChildren(root: Container, children: Container[]): void {
  root.removeChildren();
  const chunkSize = 1000;
  for (let index = 0; index < children.length; index += chunkSize) {
    root.addChild(...children.slice(index, index + chunkSize));
  }
}

function decorationIdsMatchLookup(scene: StageSceneState, role: RoleDocument): boolean {
  const roleIds = new Set(role.decorations.map((deco) => deco.id));
  if (roleIds.size !== scene.decorationsById.size) return false;
  for (const id of roleIds) {
    if (!scene.decorationsById.has(id)) return false;
  }
  return true;
}

export function syncDisguiseChildOrder(
  scene: StageSceneState,
  role: RoleDocument,
  overlay?: Container | null,
  selectedSet?: Set<string> | null
): void {
  // A large role update may defer display synchronization. Keep the existing
  // children until that update refreshes the lookup, otherwise ordering the
  // new IDs against old display records would temporarily blank the stage.
  if (!decorationIdsMatchLookup(scene, role)) return;

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

  // Controller and brush graphics are permanent overlay children. Visibility
  // changes must not force every decoration to be removed and re-added.
  const orderedChildren = topFirstChildren
    .slice()
    .reverse()
    .concat(scene.selectionDragController, scene.brushFillOverlay);

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

function selectedDecorationsFromLookup(
  decorationsById: Map<string, DecorationLayer>,
  selectedIds: readonly string[]
): DecorationLayer[] {
  return selectedIds
    .map((id) => decorationsById.get(id))
    .filter((deco): deco is DecorationLayer => Boolean(deco));
}

export function syncSelectionControllerForIds(
  scene: StageSceneState,
  selectedIds: readonly string[],
  hasActiveDrag = false
): void {
  syncSelectionDragController(
    scene,
    selectedDecorationsFromLookup(scene.decorationsById, selectedIds),
    hasActiveDrag
  );
}

export function syncDecorationDisplayRecords(
  scene: StageSceneState,
  role: RoleDocument,
  decoOptions: DisguiseDecoOptions,
  activeOverlay?: ActiveDecorationOverlay | null
): void {
  const decorationsById = new Map(role.decorations.map((deco) => [deco.id, deco]));
  scene.decorationsById = decorationsById;

  for (const [id, record] of scene.decoDisplays) {
    const deco = decorationsById.get(id);
    if (deco && record.displayKey === decorationDisplayKey(deco)) continue;
    record.container.parent?.removeChild(record.container);
    if (!record.container.destroyed) {
      record.container.destroy({ children: true });
    }
    scene.decoDisplays.delete(id);
  }

  for (const deco of role.decorations) {
    let record = scene.decoDisplays.get(deco.id);
    if (!record) {
      const container = createDisguiseEntryDisplay(
        deco,
        scene.failedTextures,
        scene.disguiseRoot,
        decoOptions
      );
      if (!container) continue;
      container.eventMode = scene.decorationInteractionEnabled ? 'static' : 'none';
      container.cursor = scene.decorationInteractionEnabled ? 'pointer' : 'default';
      record = {
        container,
        displayKey: decorationDisplayKey(deco),
        transformKey: ''
      };
      scene.decoDisplays.set(deco.id, record);
    }

    const transformKey = decorationTransformKey(deco);
    const isOverlayChild = Boolean(
      activeOverlay?.selectedSet.has(deco.id) &&
      record.container.parent === activeOverlay.container
    );
    if (record.transformKey !== transformKey && !isOverlayChild) {
      applyDecorationDisplayTransform(record.container, deco);
      record.transformKey = transformKey;
    }
  }
}
