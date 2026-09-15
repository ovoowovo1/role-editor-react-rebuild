import { Container } from 'pixi.js';
import type { DecorationLayer, RoleDocument } from '../../types/role';
import { layerIdsForRole } from '../../lib/editor/layerOrdering';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { REFERENCE_IMAGE_LAYER_PREFIX } from '../../types/referenceImage';
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
import { syncHeadLayerSelection, syncSelectionDragController } from './selectionControllerSync';
import { syncReferenceImageDisplayRecords } from './referenceImageVisuals';
import type { ReferenceImageLayer } from '../../types/referenceImage';
import type { ReferenceImageOptions } from './types';

interface OrderCache {
  decorations: readonly DecorationLayer[];
  headIndex: number;
}
const orderCache = new WeakMap<StageSceneState, OrderCache>();

function replaceDisguiseChildren(root: Container, children: Container[]): void {
  root.removeChildren();
  const chunkSize = 1000;
  for (let index = 0; index < children.length; index += chunkSize) {
    root.addChild(...children.slice(index, index + chunkSize));
  }
}

function decorationIdsMatchLookup(scene: StageSceneState, role: RoleDocument): boolean {
  if (role.decorations.length !== scene.decorationsById.size) return false;
  for (const deco of role.decorations) {
    if (!scene.decorationsById.has(deco.id)) return false;
  }
  return true;
}

/** True once the display lookup has received the current role references. */
export function isDecorationDisplaySyncCurrent(scene: StageSceneState, role: RoleDocument): boolean {
  if (role.decorations.length !== scene.decorationsById.size) return false;
  for (const deco of role.decorations) {
    if (scene.decorationsById.get(deco.id) !== deco) return false;
  }
  return true;
}

export function syncDisguiseChildOrder(
  scene: StageSceneState,
  role: RoleDocument,
  layerOrder?: readonly string[]
): void {
  const headIndex = clampedHeadLayerIndex(role);
  const cached = orderCache.get(scene);
  if (!layerOrder && !scene.referenceImageDisplays?.size && cached && cached.headIndex === headIndex &&
    cached.decorations.length === role.decorations.length &&
    (cached.decorations === role.decorations ||
      cached.decorations.every((deco, index) => deco.id === role.decorations[index].id))) {
    cached.decorations = role.decorations;
    return;
  }
  // A large role update may defer display synchronization. Keep the existing
  // children until that update refreshes the lookup, otherwise ordering the
  // new IDs against old display records would temporarily blank the stage.
  if (!decorationIdsMatchLookup(scene, role)) return;

  const fallbackCanonicalOrder = layerIdsForRole(role).reverse();
  const requestedOrder = layerOrder?.length ? layerOrder : fallbackCanonicalOrder;
  const roleContainers = new Map<string, Container>();
  roleContainers.set(HEAD_LAYER_ID, scene.headLayerClip);
  for (const deco of role.decorations) {
    const record = scene.decoDisplays.get(deco.id);
    if (record) roleContainers.set(deco.id, record.container);
  }
  const imageContainers = new Map<string, Container>();
  for (const [id, record] of scene.referenceImageDisplays?.entries?.() ?? []) imageContainers.set(`${REFERENCE_IMAGE_LAYER_PREFIX}${id}`, record.container);
  const orderedChildren: Container[] = [];
  const added = new Set<Container>();
  for (const token of requestedOrder) {
    const child = roleContainers.get(token) ?? imageContainers.get(token);
    if (!child || added.has(child)) continue;
    orderedChildren.push(child);
    added.add(child);
  }
  // Repair an order that was generated before the role/image lookup caught up.
  for (const token of fallbackCanonicalOrder) {
    const child = roleContainers.get(token);
    if (child && !added.has(child)) {
      orderedChildren.push(child);
      added.add(child);
    }
  }
  for (const child of imageContainers.values()) {
    if (!added.has(child)) {
      orderedChildren.push(child);
      added.add(child);
    }
  }

  // Selection/brush/head visuals are permanent overlays. They intentionally
  // render above the role children while the original deco containers keep
  // their role-defined z-order.
  const fullOrder = orderedChildren.concat(
    scene.pinOutlineOverlay ? [scene.pinOutlineOverlay] : [],
    scene.selectionDragController ? [scene.selectionDragController] : [],
    scene.brushFillOverlay ? [scene.brushFillOverlay] : [],
    scene.headLayerSelectionOverlay ? [scene.headLayerSelectionOverlay] : []
  );
  scene.layerOrder = [...requestedOrder];
  orderCache.set(scene, { decorations: role.decorations, headIndex });
  if (sameChildOrder(scene.lastDisguiseChildOrder, fullOrder)) return;
  replaceDisguiseChildren(scene.disguiseRoot, fullOrder);
  scene.lastDisguiseChildOrder = fullOrder;
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
  for (const { container } of scene.referenceImageDisplays?.values?.() ?? []) {
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
  hasActiveDrag = false,
  headGlowAlwaysOn = false
): void {
  syncHeadLayerSelection(scene, selectedIds, headGlowAlwaysOn);
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
  activeDragIds?: ReadonlySet<string> | null
): void {
  const decorationsById = scene.decorationsById;
  // Most edits retain the ID sequence. Allocate a membership set only for
  // removals or replacements, not for every position/scale update.
  let membershipChanged = decorationsById.size !== role.decorations.length;
  for (const deco of role.decorations) {
    if (!decorationsById.has(deco.id)) membershipChanged = true;
    decorationsById.set(deco.id, deco);
  }
  if (membershipChanged) {
    const ids = new Set(role.decorations.map(deco => deco.id));
    for (const id of decorationsById.keys()) {
      if (ids.has(id)) continue;
      decorationsById.delete(id);
      const record = scene.decoDisplays.get(id);
      record?.container.parent?.removeChild(record.container);
      if (record && !record.container.destroyed) record.container.destroy({ children: true });
      scene.decoDisplays.delete(id);
    }
    orderCache.delete(scene);
  }

  for (const deco of role.decorations) {
    let record = scene.decoDisplays.get(deco.id);
    if (record?.appliedDecoration === deco) continue;
    const displayKey = decorationDisplayKey(deco);
    if (record && record.displayKey !== displayKey) {
      record.container.parent?.removeChild(record.container);
      if (!record.container.destroyed) record.container.destroy({ children: true });
      scene.decoDisplays.delete(deco.id);
      orderCache.delete(scene);
      record = undefined;
    }
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
        displayKey,
        transformKey: ''
      };
      scene.decoDisplays.set(deco.id, record);
      orderCache.delete(scene);
    }

    const transformKey = decorationTransformKey(deco);
    const isActiveDragItem = activeDragIds?.has(deco.id) ?? false;
    if (record.transformKey !== transformKey && !isActiveDragItem) {
      applyDecorationDisplayTransform(record.container, deco);
      record.transformKey = transformKey;
    }
    // Active drag items own their imperative position until the commit has
    // produced a current role reference; the next display sync then applies
    // the committed transform.
    if (!isActiveDragItem) record.appliedDecoration = deco;
  }
}

export function syncReferenceImages(
  scene: StageSceneState,
  images: readonly ReferenceImageLayer[],
  options: ReferenceImageOptions
): void {
  scene.referenceImagesById.clear();
  for (const image of images) scene.referenceImagesById.set(image.id, image);
  syncReferenceImageDisplayRecords(
    scene.disguiseRoot,
    images,
    scene.referenceImageDisplays,
    options,
    scene.decorationInteractionEnabled,
    false
  );
}
