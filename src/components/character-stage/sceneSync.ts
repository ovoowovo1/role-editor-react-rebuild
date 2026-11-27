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
import type { StageSceneState } from './types';
import { syncHeadLayerSelection, syncSelectionDragController } from './selectionControllerSync';
import { syncReferenceImageDisplayRecords } from './referenceImageVisuals';
import { buildDecorationHitIndex, type DecorationHitIndex } from './decorationHitIndex';
import type { ReferenceImageLayer } from '../../types/referenceImage';
import type { ReferenceImageOptions } from './types';

interface OrderCache {
  decorations: readonly DecorationLayer[];
  headIndex: number;
  requestedOrder?: readonly string[];
  referenceImageCount: number;
}
interface DisplaySyncCache {
  decorations: readonly DecorationLayer[];
  pending: ReadonlySet<string>;
}
const displaySyncCache = new WeakMap<StageSceneState, DisplaySyncCache>();
const referenceSyncCache = new WeakMap<StageSceneState, {
  images: readonly ReferenceImageLayer[];
  options: ReferenceImageOptions;
}>();
const orderCache = new WeakMap<StageSceneState, OrderCache>();

/** Keep the full rebuild for any order not achievable with exactly one move. */
function tryMoveSingleChild(root: Container, wanted: readonly Container[]): boolean {
  const current = root.children;
  if (current.length !== wanted.length) return false;
  let first = 0;
  while (first < current.length && current[first] === wanted[first]) first++;
  if (first === current.length) return true;

  let last = current.length - 1;
  while (last > first && current[last] === wanted[last]) last--;
  if (last === first) return false;

  // Removing the first item and inserting it at the end of the changed
  // interval shifts the remaining items left exactly one position.
  if (current[first] === wanted[last]) {
    let index = first;
    while (index < last && current[index + 1] === wanted[index]) index++;
    if (index === last) {
      root.setChildIndex(current[first], last);
      return true;
    }
  }
  if (current[last] === wanted[first]) {
    let index = first + 1;
    while (index <= last && current[index - 1] === wanted[index]) index++;
    if (index > last) {
      root.setChildIndex(current[last], first);
      return true;
    }
  }
  return false;
}

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
  // Role updates replace the decorations array; the display pass records the
  // exact array it synchronized, so selection changes need no layer walk.
  return displaySyncCache.get(scene)?.decorations === role.decorations;
}

export function syncDisguiseChildOrder(
  scene: StageSceneState,
  role: RoleDocument,
  layerOrder?: readonly string[]
): void {
  const headIndex = clampedHeadLayerIndex(role);
  const cached = orderCache.get(scene);
  const requestedLayerOrder = layerOrder?.length ? layerOrder : undefined;
  const referenceImageCount = scene.referenceImageDisplays?.size ?? 0;
  if (cached && cached.headIndex === headIndex &&
    cached.referenceImageCount === referenceImageCount &&
    (cached.requestedOrder === requestedLayerOrder ||
      (cached.requestedOrder && requestedLayerOrder &&
        cached.requestedOrder.length === requestedLayerOrder.length &&
        cached.requestedOrder.every((id, index) => id === requestedLayerOrder[index]))) &&
    (cached.decorations === role.decorations ||
      (cached.decorations.length === role.decorations.length &&
        cached.decorations.every((deco, index) => deco.id === role.decorations[index].id)))) {
    cached.decorations = role.decorations;
    cached.requestedOrder = requestedLayerOrder;
    return;
  }
  // A large role update may defer display synchronization. Keep the existing
  // children until that update refreshes the lookup, otherwise ordering the
  // new IDs against old display records would temporarily blank the stage.
  if (!isDecorationDisplaySyncCurrent(scene, role) && !decorationIdsMatchLookup(scene, role)) return;

  const requestedOrder = requestedLayerOrder ?? layerIdsForRole(role).reverse();
  const roleContainer = (id: string) => id === HEAD_LAYER_ID
    ? scene.headLayerClip
    : scene.decoDisplays.get(id)?.container;
  const imageContainers = new Map<string, Container>();
  for (const [id, record] of scene.referenceImageDisplays?.entries?.() ?? []) imageContainers.set(`${REFERENCE_IMAGE_LAYER_PREFIX}${id}`, record.container);
  const orderedChildren: Container[] = [];
  const added = new Set<Container>();
  let placedRoleChildren = 0;
  let placedImages = 0;
  for (const token of requestedOrder) {
    const roleChild = roleContainer(token);
    const child = roleChild ?? imageContainers.get(token);
    if (!child || added.has(child)) continue;
    orderedChildren.push(child);
    added.add(child);
    if (roleChild) placedRoleChildren++;
    else placedImages++;
  }
  // Canonical order was already walked if there was no explicit order. If
  // there was, only repair genuinely incomplete orders (including the head).
  if (requestedLayerOrder && placedRoleChildren < scene.decoDisplays.size + 1) {
    for (const token of layerIdsForRole(role).reverse()) {
      const child = roleContainer(token);
      if (child && !added.has(child)) {
        orderedChildren.push(child);
        added.add(child);
      }
    }
  }
  if (placedImages < imageContainers.size) {
    for (const child of imageContainers.values()) {
      if (!added.has(child)) {
        orderedChildren.push(child);
        added.add(child);
      }
    }
  }

  // Selection/brush/head visuals are permanent overlays. They intentionally
  // render above the role children while the original deco containers keep
  // their role-defined z-order.
  const fullOrder = orderedChildren.concat(
    scene.selectionDragController ? [scene.selectionDragController] : [],
    scene.brushFillOverlay ? [scene.brushFillOverlay] : [],
    scene.headLayerSelectionOverlay ? [scene.headLayerSelectionOverlay] : []
  );
  scene.layerOrder = [...requestedOrder];
  orderCache.set(scene, {
    decorations: role.decorations, headIndex, requestedOrder: requestedLayerOrder, referenceImageCount
  });
  if (sameChildOrder(scene.lastDisguiseChildOrder, fullOrder)) return;
  if (!tryMoveSingleChild(scene.disguiseRoot, fullOrder)) {
    replaceDisguiseChildren(scene.disguiseRoot, fullOrder);
  }
  scene.lastDisguiseChildOrder = fullOrder;
  scene.decorationHitIndex = null;
}

export function setDecorationInteractionEnabled(
  scene: StageSceneState,
  enabled: boolean
): void {
  if (scene.decorationInteractionEnabled === enabled) return;
  scene.decorationInteractionEnabled = enabled;
  for (const { container } of scene.referenceImageDisplays?.values?.() ?? []) {
    container.eventMode = enabled ? 'static' : 'none';
    container.cursor = enabled ? 'pointer' : 'default';
  }
}

export function ensureDecorationHitIndex(
  scene: StageSceneState,
  role: RoleDocument
): DecorationHitIndex {
  if (!scene.decorationHitIndex) {
    scene.decorationHitIndex = buildDecorationHitIndex(
      role.decorations,
      scene.decoDisplays,
      scene.layerOrder
    );
  }
  return scene.decorationHitIndex;
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
  activeDragIds?: ReadonlySet<string> | null
): void {
  const decorationsById = scene.decorationsById;
  const previous = displaySyncCache.get(scene);
  if (previous?.decorations === role.decorations && previous.pending.size === 0) return;

  let membershipChanged = decorationsById.size !== role.decorations.length;
  const pending = new Set<string>();
  for (let index = 0; index < role.decorations.length; index++) {
    const deco = role.decorations[index];
    if (previous?.decorations[index] === deco && !previous.pending.has(deco.id)) continue;
    const known = decorationsById.get(deco.id);
    if (!known) membershipChanged = true;
    if (known !== deco) decorationsById.set(deco.id, deco);
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
        scene.failedTextures
      );
      if (!container) {
        pending.add(deco.id);
        continue;
      }
      container.eventMode = 'none';
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
    if (isActiveDragItem) pending.add(deco.id);
    else record.appliedDecoration = deco;
  }

  if (membershipChanged) {
    const ids = new Set(role.decorations.map((deco) => deco.id));
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
  scene.decorationHitIndex = null;
  displaySyncCache.set(scene, { decorations: role.decorations, pending });
}

export function syncReferenceImages(
  scene: StageSceneState,
  images: readonly ReferenceImageLayer[],
  options: ReferenceImageOptions
): void {
  const previous = referenceSyncCache.get(scene);
  if (previous?.images === images && previous.options === options) return;
  if (!previous || previous.images.length !== images.length || images.some((image) =>
    scene.referenceImageDisplays.get(image.id)?.displayKey !== image.src)) {
    orderCache.delete(scene);
  }
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
  referenceSyncCache.set(scene, { images, options });
}
