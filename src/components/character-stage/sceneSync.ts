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

interface OrderCache {
  decorations: readonly DecorationLayer[];
  headIndex: number;
  overlay: Container | null;
  selected: Set<string> | null;
}
const orderCache = new WeakMap<StageSceneState, OrderCache>();

function sameSelection(a: Set<string> | null, b: Set<string> | null | undefined): boolean {
  if (!a?.size && !b?.size) return true;
  if (!a || !b || a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
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

export function syncDisguiseChildOrder(
  scene: StageSceneState,
  role: RoleDocument,
  overlay?: Container | null,
  selectedSet?: Set<string> | null
): void {
  const headIndex = clampedHeadLayerIndex(role);
  const cached = orderCache.get(scene);
  if (cached && cached.headIndex === headIndex && cached.overlay === (overlay ?? null) &&
    sameSelection(cached.selected, selectedSet) &&
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

  topFirstChildren.splice(headIndex, 0, scene.headLayerClip);

  // Controller and brush graphics are permanent overlay children. Visibility
  // changes must not force every decoration to be removed and re-added.
  const orderedChildren = topFirstChildren
    .slice()
    .reverse()
    .concat(scene.selectionDragController, scene.brushFillOverlay);

  orderCache.set(scene, {
    decorations: role.decorations, headIndex, overlay: overlay ?? null,
    selected: selectedSet ? new Set(selectedSet) : null
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
    const isOverlayChild = Boolean(
      activeOverlay?.selectedSet.has(deco.id) &&
      record.container.parent === activeOverlay.container
    );
    if (record.transformKey !== transformKey && !isOverlayChild) {
      applyDecorationDisplayTransform(record.container, deco);
      record.transformKey = transformKey;
    }
    // A drag overlay temporarily owns local coordinates; retry its pending
    // transform after reparenting, even when the role reference is unchanged.
    if (!isOverlayChild) record.appliedDecoration = deco;
  }
}
