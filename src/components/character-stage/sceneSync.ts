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
import { syncHeadLayerSelection, syncSelectionDragController } from './selectionControllerSync';

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
  role: RoleDocument
): void {
  const headIndex = clampedHeadLayerIndex(role);
  const cached = orderCache.get(scene);
  if (cached && cached.headIndex === headIndex &&
    cached.decorations.length === role.decorations.length &&
    (cached.decorations === role.decorations ||
      cached.decorations.every((deco, index) => deco.id === role.decorations[index].id))) {
    // Retain only the latest array, rather than holding an old document alive.
    cached.decorations = role.decorations;
    return;
  }
  // A large role update may defer display synchronization. Keep the existing
  // children until that update refreshes the lookup, otherwise ordering the
  // new IDs against old display records would temporarily blank the stage.
  if (!decorationIdsMatchLookup(scene, role)) return;

  const topFirstChildren: Container[] = [];

  for (const deco of role.decorations) {
    const record = scene.decoDisplays.get(deco.id);
    if (!record) continue;
    topFirstChildren.push(record.container);
  }

  topFirstChildren.splice(headIndex, 0, scene.headLayerClip);

  // Selection/brush/head visuals are permanent overlays. They intentionally
  // render above the role children while the original deco containers keep
  // their role-defined z-order.
  const orderedChildren = topFirstChildren
    .slice()
    .reverse()
    .concat(scene.selectionDragController, scene.brushFillOverlay, scene.headLayerSelectionOverlay);

  orderCache.set(scene, {
    decorations: role.decorations, headIndex
  });
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
  syncHeadLayerSelection(scene, selectedIds);
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
