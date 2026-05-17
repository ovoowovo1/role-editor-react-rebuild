import { useEffect, useRef, useState } from 'react';
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { t } from '../i18n';
import type { BodyPartTab, DecorationLayer, PartOption, RoleDocument } from '../types/role';
import { getBodyPartOption, optionById } from '../mock/options';
import {
  actorAtlasFrames,
  actorRuntimeManifest,
  decorationAtlasFrames,
  decorationRuntimeManifest,
  gafSources
} from '../mock/gafManifest';
import { clamp, clampToDisc } from '../lib/math';
import { ACTOR_BODY_SCALE } from '../lib/actorClipAdapter';
import { actorPartRuntime, getPartFrame, isRuntimeEmptyFrame, sanitizePartScale } from '../lib/twlibPartRuntime';
import { collectAtlasTextureUrlsForRole, partitionAtlasTextureUrls } from '../lib/atlasTextureAvailability';
import { applyGafAtlasToSprite } from '../lib/gafAtlasSprite';
import { createDecoSelectionGlowFilter } from '../lib/decoSelectionFilter';
import { ActorClip } from '../lib/actorClip';
import { createActorGafClip, createGafClip, type GafMovieClip } from '../lib/gafMovieClip';
import { isMissingDecoAssetId } from '../lib/roleSerialization';
import type { BrushFillMask, BrushFillPoint } from '../lib/brushFillToDeco';

interface CharacterStageProps {
  role: RoleDocument;
  selectedIds: string[];
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  bodyAnimationRestartKey: number;
  stageScale: number;
  facingQuarterTurns: number;
  onUpdateDecoration(id: string, patch: Partial<DecorationLayer>, commit?: boolean): void;
  onApplyDragDelta(dx: number, dy: number): void;
  onCommitDragDelta(dx: number, dy: number): void;
  onBeginTransient(): void;
  onCommitTransient(): void;
  brushFillActive?: boolean;
  brushFillBrushSize?: number;
  brushFillMask?: BrushFillMask;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
  overlay?: {
    container: Container;
    items: Array<{ id: string; decoContainer: Container; startX: number; startY: number }>;
    startX: number;
    startY: number;
  };
  preview?: {
    container: Container;
    startX: number;
    startY: number;
  };
}

interface BrushDrawState {
  points: BrushFillPoint[];
}

interface DisguiseDecoOptions {
  onPointerDown(id: string, event: FederatedPointerEvent, disguiseRoot: Container): void;
}

interface DecoDisplayRecord {
  container: Container;
  displayKey: string;
  transformKey: string;
  selected: boolean;
}

interface StageSceneState {
  actorStage: Container;
  actorClip: ActorClip;
  disguiseRoot: Container;
  headLayerClip: GafMovieClip;
  selectionDragController: Container;
  selectionDragControllerGraphic: Graphics;
  selectionDragControllerVisuals: Container;
  brushFillOverlay: Container;
  brushFillGraphic: Graphics;
  selectionDragVisualKey: string;
  selectionDragVisualsById: Map<string, Container>;
  selectionDragTargetId: string | null;
  failedTextures: Set<string>;
  decoDisplays: Map<string, DecoDisplayRecord>;
  lastDisguiseChildOrder: Container[];
  updatePosition(): void;
}

const ALPHA_MASK_DECO_CODES: Set<string> = new Set();
const BODY_ANIMATION_FRAME_MS = 1000 / 12;
const DECO_GLOW_CAP = 80;
const DEFER_STAGE_SYNC_DECO_COUNT = 2000;
const LARGE_MULTI_DRAG_THRESHOLD = 5000;
const SCROLL_SURFACE_PADDING = 160;
const SELECTION_DRAG_HIT_SIZE = 50;
const SELECTION_DRAG_HIT_PADDING = 4;
const BRUSH_FILL_POINT_SPACING_FACTOR = 0.35;

let cachedGlowFilter: ReturnType<typeof createDecoSelectionGlowFilter> | null = null;
let cachedControllerGlowFilter: ReturnType<typeof createDecoSelectionGlowFilter> | null = null;

function getCachedGlowFilter(): ReturnType<typeof createDecoSelectionGlowFilter> {
  if (!cachedGlowFilter) cachedGlowFilter = createDecoSelectionGlowFilter();
  return cachedGlowFilter;
}

function getCachedControllerGlowFilter(): ReturnType<typeof createDecoSelectionGlowFilter> {
  if (!cachedControllerGlowFilter) cachedControllerGlowFilter = createDecoSelectionGlowFilter({ knockout: true });
  return cachedControllerGlowFilter;
}

function actorSceneKey(role: RoleDocument, bodyAnimationLabel: string): string {
  return JSON.stringify({
    camp: role.camp,
    gender: role.gender,
    parts: role.parts,
    partFrames: role.partFrames,
    partScales: role.partScales,
    bodyAnimationLabel
  });
}

function decorationDisplayKey(deco: DecorationLayer): string {
  return `${deco.assetId}\u0000${deco.code}`;
}

function decorationTransformKey(deco: DecorationLayer): string {
  return [
    deco.x,
    deco.y,
    deco.rotation,
    deco.scaleX,
    deco.scaleY,
    deco.opacity,
    deco.visible !== false
  ].join('\u0000');
}

function positionRange(role: RoleDocument): number {
  const raw = role.positionRange;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 60;
}

function makeOptionSprite(option: PartOption | undefined, failedTextures: Set<string>): Sprite | null {
  if (!option?.atlas) {
    return Sprite.from(option?.icon ?? optionById[Object.keys(optionById)[0]].icon);
  }
  if (failedTextures.has(option.atlas.texture)) {
    return null;
  }
  const atlasTexture = Texture.from(option.atlas.texture);
  const texture = new Texture(
    atlasTexture.baseTexture,
    new Rectangle(option.atlas.x, option.atlas.y, option.atlas.width, option.atlas.height)
  );
  return new Sprite(texture);
}

/**
 * Draws a small dashed outlined rectangle as the visual placeholder for
 * decorations whose original `code` has no PartOption in the current manifest.
 * The old `fixIngameRoleDesign` drops unknown symbols silently; for the
 * rebuild we keep the layer so users can tell something is missing instead of
 * rendering an unrelated sprite with the imported sx/sy/r.
 */
function makeMissingDecoGraphic(size = 28): Graphics {
  const half = size / 2;
  const graphic = new Graphics();
  graphic.beginFill(0xff66aa, 0.18);
  graphic.lineStyle({ width: 1.5, color: 0xff66aa, alpha: 0.9 });
  graphic.drawRect(-half, -half, size, size);
  graphic.endFill();
  graphic.lineStyle({ width: 1, color: 0xff66aa, alpha: 0.9 });
  graphic.moveTo(-half, -half);
  graphic.lineTo(half, half);
  graphic.moveTo(half, -half);
  graphic.lineTo(-half, half);
  return graphic;
}

function applySpriteRegistration(
  sprite: Sprite,
  option: PartOption | undefined,
  fallbackSize: number,
  failedTextures: Set<string>
) {
  if (option?.atlas && !failedTextures.has(option.atlas.texture)) {
    applyGafAtlasToSprite(sprite, option.atlas);
    return;
  }
  sprite.anchor.set(0.5);
  sprite.width = fallbackSize;
  sprite.height = fallbackSize;
}

function getRolePartFrame(role: RoleDocument, category: BodyPartTab, option: PartOption | undefined): number {
  return role.partFrames?.[category] ?? getPartFrame(option) ?? actorPartRuntime[category].defaultFrame;
}

function getRolePartScale(role: RoleDocument, category: BodyPartTab): number {
  return sanitizePartScale(role.partScales?.[category], 1);
}

function prepareDisguiseRoot(
  role: RoleDocument,
  headFrame: number,
  failedTextures: Set<string>
): { disguiseRoot: Container; headLayerClip: GafMovieClip } {
  const disguiseRoot = new Container();

  const headLibrary = actorPartRuntime.head.library;
  const headLayerClip = createActorGafClip(
    failedTextures,
    headLibrary,
    actorRuntimeManifest,
    gafSources.actorTexture,
    actorAtlasFrames[headLibrary] ?? []
  );
  headLayerClip.gotoAndStop(headFrame);

  const headLayer = role.headLayer ?? {
    x: 0,
    y: 0,
    scaleX: getRolePartScale(role, 'head'),
    scaleY: getRolePartScale(role, 'head'),
    rotation: 0,
    visible: true,
    opacity: 1
  };
  headLayerClip.position.set(headLayer.x, headLayer.y);
  headLayerClip.rotation = (headLayer.rotation * Math.PI) / 180;
  headLayerClip.scale.set(headLayer.scaleX, headLayer.scaleY);
  headLayerClip.alpha = clamp(headLayer.opacity, 0, 1);
  headLayerClip.visible = headLayer.visible !== false;
  if (isRuntimeEmptyFrame('head', headFrame)) {
    headLayerClip.visible = false;
  }

  return { disguiseRoot, headLayerClip };
}

function createDecorationVisual(deco: DecorationLayer, failedTextures: Set<string>): Container | null {
  const option = optionById[deco.assetId];
  const missing = !option || isMissingDecoAssetId(deco.assetId);
  const wrapper = new Container();
  wrapper.position.set(deco.x, deco.y);
  wrapper.rotation = (deco.rotation * Math.PI) / 180;
  wrapper.scale.set(deco.scaleX, deco.scaleY);
  wrapper.alpha = clamp(deco.opacity, 0, 1);
  wrapper.visible = deco.visible !== false;
  wrapper.eventMode = 'none';

  if (missing) {
    wrapper.addChild(makeMissingDecoGraphic(28));
  } else if (decorationRuntimeManifest) {
    const linkage = option.code || deco.code;
    const fallback = option.atlas ? [option.atlas] : decorationAtlasFrames[linkage] ? [decorationAtlasFrames[linkage]] : [];
    const clip = createGafClip(
      failedTextures,
      linkage,
      decorationRuntimeManifest,
      gafSources.decorationsTexture,
      fallback,
      { alphaMask: ALPHA_MASK_DECO_CODES.has(linkage), timelineScale: decorationRuntimeManifest.timelineScale }
    );
    wrapper.addChild(clip);
  } else {
    const sprite = makeOptionSprite(option, failedTextures);
    if (!sprite) return null;
    applySpriteRegistration(sprite, option, 64, failedTextures);
    wrapper.addChild(sprite);
  }

  return wrapper;
}

function createDisguiseEntryDisplay(
  deco: DecorationLayer,
  failedTextures: Set<string>,
  disguiseRoot: Container,
  decoOptions: DisguiseDecoOptions
): Container | null {
  const wrapper = createDecorationVisual(deco, failedTextures);
  if (!wrapper) return null;
  wrapper.eventMode = 'static';
  wrapper.cursor = 'pointer';

  wrapper.on('pointerdown', (event: FederatedPointerEvent) => {
    decoOptions.onPointerDown(deco.id, event, disguiseRoot);
  });
  return wrapper;
}

function applyDecorationDisplayTransform(wrapper: Container, deco: DecorationLayer): void {
  wrapper.position.set(deco.x, deco.y);
  wrapper.rotation = (deco.rotation * Math.PI) / 180;
  wrapper.scale.set(deco.scaleX, deco.scaleY);
  wrapper.alpha = clamp(deco.opacity, 0, 1);
  wrapper.visible = deco.visible !== false;
}

function applyHeadLayerDisplayTransform(headLayerClip: GafMovieClip, role: RoleDocument): void {
  const headLayer = role.headLayer ?? {
    x: 0,
    y: 0,
    scaleX: getRolePartScale(role, 'head'),
    scaleY: getRolePartScale(role, 'head'),
    rotation: 0,
    visible: true,
    opacity: 1
  };
  const headOption = getBodyPartOption('head', role.parts.head);
  const headFrame = getRolePartFrame(role, 'head', headOption);

  headLayerClip.position.set(headLayer.x, headLayer.y);
  headLayerClip.rotation = (headLayer.rotation * Math.PI) / 180;
  headLayerClip.scale.set(headLayer.scaleX, headLayer.scaleY);
  headLayerClip.alpha = clamp(headLayer.opacity, 0, 1);
  headLayerClip.visible = headLayer.visible !== false && !isRuntimeEmptyFrame('head', headFrame);
}

function syncDecorationSelection(record: DecoDisplayRecord, selected: boolean, skipGlow: boolean): void {
  const nextFilters = selected && !skipGlow ? [getCachedGlowFilter()] : null;
  if (record.selected === selected && record.container.filters === nextFilters) return;
  record.container.filters = nextFilters;
  record.selected = selected;
}

function getClampedHeadLayerIndex(role: RoleDocument): number {
  const raw = role.headLayerIndex;
  const n = typeof raw === 'number' ? raw : Number(raw);
  const index = Number.isFinite(n) ? Math.round(n) : role.decorations.length;
  return Math.max(0, Math.min(role.decorations.length, index));
}

function sameChildOrder(a: Container[], b: Container[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function replaceDisguiseChildren(root: Container, children: Container[]): void {
  root.removeChildren();
  const chunkSize = 1000;
  for (let index = 0; index < children.length; index += chunkSize) {
    root.addChild(...children.slice(index, index + chunkSize));
  }
}

function syncDisguiseChildOrder(scene: StageSceneState, role: RoleDocument, overlay?: Container | null, selectedSet?: Set<string> | null): void {
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

  const headIndex = getClampedHeadLayerIndex(role);
  topFirstChildren.splice(headIndex, 0, scene.headLayerClip);

  // PIXI renders lower childIndex first, so convert top-first state to bottom-to-top display order.
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

function drawBrushFillOverlay(scene: StageSceneState, mask: BrushFillMask, draftPoints: BrushFillPoint[] = []): void {
  const points = draftPoints.length ? [...mask.points, ...draftPoints] : mask.points;
  scene.brushFillGraphic.clear();
  scene.brushFillOverlay.visible = points.length > 0;
  scene.brushFillOverlay.eventMode = 'none';

  if (!points.length) return;

  scene.brushFillGraphic.beginFill(0x35d0ff, 0.18);
  scene.brushFillGraphic.lineStyle({ width: 1, color: 0x9cffb2, alpha: 0.36 });
  for (const point of points) {
    scene.brushFillGraphic.drawCircle(point.x, point.y, point.radius);
  }
  scene.brushFillGraphic.endFill();
}

function appendBrushPoint(points: BrushFillPoint[], next: BrushFillPoint): BrushFillPoint[] {
  const last = points[points.length - 1];
  if (!last) return [next];

  const dx = next.x - last.x;
  const dy = next.y - last.y;
  const distance = Math.hypot(dx, dy);
  const spacing = Math.max(1, next.radius * BRUSH_FILL_POINT_SPACING_FACTOR);
  if (distance <= spacing) return points;

  const additions: BrushFillPoint[] = [];
  const steps = Math.max(1, Math.floor(distance / spacing));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    additions.push({
      x: last.x + dx * t,
      y: last.y + dy * t,
      radius: next.radius
    });
  }
  return [...points, ...additions];
}

function createLargeMultiDragPreview(width: number, height: number): Container {
  const container = new Container();
  const graphic = new Graphics();
  const halfWidth = Math.max(14, Math.min(width / 2 + 8, 220));
  const halfHeight = Math.max(14, Math.min(height / 2 + 8, 220));

  graphic.lineStyle({ width: 1.5, color: 0x38bdf8, alpha: 0.95 });
  graphic.drawRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
  graphic.lineStyle({ width: 2, color: 0xf8fafc, alpha: 0.95 });
  graphic.moveTo(-12, 0);
  graphic.lineTo(12, 0);
  graphic.moveTo(0, -12);
  graphic.lineTo(0, 12);
  graphic.beginFill(0x38bdf8, 0.18);
  graphic.drawCircle(0, 0, 16);
  graphic.endFill();

  container.addChild(graphic);
  container.eventMode = 'none';
  return container;
}

interface LocalBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function mergeBounds(a: LocalBounds | null, b: LocalBounds): LocalBounds {
  if (!a) return b;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  };
}

function pointBounds(x: number, y: number): LocalBounds {
  const half = SELECTION_DRAG_HIT_SIZE / 2;
  return { minX: x - half, minY: y - half, maxX: x + half, maxY: y + half };
}

function containerBoundsInRoot(container: Container, root: Container): LocalBounds {
  const localBounds = container.getLocalBounds();
  if (!Number.isFinite(localBounds.width) || !Number.isFinite(localBounds.height) || localBounds.width <= 0 || localBounds.height <= 0) {
    const position = getDisplayRootPosition(container, root);
    return pointBounds(position.x, position.y);
  }

  let bounds: LocalBounds | null = null;
  const corners = [
    { x: localBounds.x, y: localBounds.y },
    { x: localBounds.x + localBounds.width, y: localBounds.y },
    { x: localBounds.x + localBounds.width, y: localBounds.y + localBounds.height },
    { x: localBounds.x, y: localBounds.y + localBounds.height }
  ];
  for (const corner of corners) {
    const global = container.toGlobal(corner);
    const local = root.toLocal(global);
    bounds = mergeBounds(bounds, { minX: local.x, minY: local.y, maxX: local.x, maxY: local.y });
  }
  return bounds ?? pointBounds(container.x, container.y);
}

function hideSelectionDragController(scene: StageSceneState): void {
  scene.selectionDragTargetId = null;
  scene.selectionDragVisualKey = '';
  scene.selectionDragVisualsById.clear();
  scene.selectionDragController.visible = false;
  scene.selectionDragController.eventMode = 'none';
  scene.selectionDragController.hitArea = null;
  scene.selectionDragController.filters = null;
  scene.selectionDragControllerGraphic.clear();
  scene.selectionDragControllerVisuals.removeChildren().forEach((child) => {
    if (!child.destroyed) child.destroy({ children: true });
  });
}

function selectionDragVisualKey(selectedDecorations: DecorationLayer[], centerX: number, centerY: number): string {
  return [
    centerX,
    centerY,
    selectedDecorations.map((deco) => `${deco.id}:${decorationDisplayKey(deco)}:${decorationTransformKey(deco)}`).join('|')
  ].join('\u0000');
}

function syncSelectionDragControllerVisuals(
  scene: StageSceneState,
  selectedDecorations: DecorationLayer[],
  centerX: number,
  centerY: number
): void {
  const nextKey = selectionDragVisualKey(selectedDecorations, centerX, centerY);
  if (scene.selectionDragVisualKey === nextKey) return;

  scene.selectionDragVisualKey = nextKey;
  scene.selectionDragVisualsById.clear();
  scene.selectionDragControllerVisuals.removeChildren().forEach((child) => {
    if (!child.destroyed) child.destroy({ children: true });
  });

  for (const deco of selectedDecorations) {
    const visual = createDecorationVisual(deco, scene.failedTextures);
    if (!visual) continue;
    visual.eventMode = 'none';
    visual.cursor = 'default';
    visual.position.set(deco.x - centerX, deco.y - centerY);
    scene.selectionDragControllerVisuals.addChild(visual);
    scene.selectionDragVisualsById.set(deco.id, visual);
  }
}

function syncSelectionDragControllerVisualTransforms(
  scene: StageSceneState,
  selectedDecorations: DecorationLayer[],
  centerX: number,
  centerY: number
): void {
  for (const deco of selectedDecorations) {
    const visual = scene.selectionDragVisualsById.get(deco.id);
    if (!visual) continue;
    visual.position.set(deco.x - centerX, deco.y - centerY);
    visual.rotation = (deco.rotation * Math.PI) / 180;
    visual.scale.set(deco.scaleX, deco.scaleY);
    visual.alpha = clamp(deco.opacity, 0, 1);
    visual.visible = deco.visible !== false;
  }
}

function selectionControllerPosition(selectedDecorations: DecorationLayer[]): { x: number; y: number } {
  if (selectedDecorations.length === 1) {
    const deco = selectedDecorations[0];
    return { x: deco.x, y: deco.y };
  }
  const sum = selectedDecorations.reduce(
    (acc, deco) => ({ x: acc.x + deco.x, y: acc.y + deco.y }),
    { x: 0, y: 0 }
  );
  return {
    x: sum.x / selectedDecorations.length,
    y: sum.y / selectedDecorations.length
  };
}

function selectionDragHitArea(bounds: LocalBounds, centerX: number, centerY: number): Rectangle {
  const half = SELECTION_DRAG_HIT_SIZE / 2;
  const minX = Math.min(-half, bounds.minX - centerX - SELECTION_DRAG_HIT_PADDING);
  const minY = Math.min(-half, bounds.minY - centerY - SELECTION_DRAG_HIT_PADDING);
  const maxX = Math.max(half, bounds.maxX - centerX + SELECTION_DRAG_HIT_PADDING);
  const maxY = Math.max(half, bounds.maxY - centerY + SELECTION_DRAG_HIT_PADDING);
  return new Rectangle(minX, minY, maxX - minX, maxY - minY);
}

function syncSelectionDragController(
  scene: StageSceneState,
  role: RoleDocument,
  selectedIds: string[],
  hasActiveOverlay: boolean
): void {
  if (hasActiveOverlay) {
    hideSelectionDragController(scene);
    return;
  }

  const selectedSet = new Set(selectedIds);
  const selectedDecorations = role.decorations.filter((deco) => selectedSet.has(deco.id) && deco.visible !== false);
  const target = selectedDecorations[0];
  if (!target) {
    hideSelectionDragController(scene);
    return;
  }

  let bounds: LocalBounds | null = null;
  if (selectedDecorations.length >= LARGE_MULTI_DRAG_THRESHOLD) {
    for (const deco of selectedDecorations) {
      bounds = mergeBounds(bounds, pointBounds(deco.x, deco.y));
    }
  } else {
    for (const deco of selectedDecorations) {
      const record = scene.decoDisplays.get(deco.id);
      if (!record) continue;
      bounds = mergeBounds(bounds, containerBoundsInRoot(record.container, scene.disguiseRoot));
    }
  }

  if (!bounds) {
    hideSelectionDragController(scene);
    return;
  }

  const center = selectionControllerPosition(selectedDecorations);
  const centerX = center.x;
  const centerY = center.y;
  const hitArea = selectionDragHitArea(bounds, centerX, centerY);

  scene.selectionDragTargetId = target.id;
  scene.selectionDragController.position.set(centerX, centerY);
  scene.selectionDragController.visible = true;
  scene.selectionDragController.eventMode = 'static';
  scene.selectionDragController.cursor = 'pointer';
  scene.selectionDragController.hitArea = hitArea;
  scene.selectionDragController.filters = [getCachedControllerGlowFilter()];
  syncSelectionDragControllerVisuals(scene, selectedDecorations, centerX, centerY);
  syncSelectionDragControllerVisualTransforms(scene, selectedDecorations, centerX, centerY);
  scene.selectionDragControllerGraphic.clear();
  scene.selectionDragControllerGraphic.beginFill(0x000000, 0.001);
  scene.selectionDragControllerGraphic.drawRect(hitArea.x, hitArea.y, hitArea.width, hitArea.height);
  scene.selectionDragControllerGraphic.endFill();
}

function getDisplayRootPosition(container: Container, root: Container): { x: number; y: number } {
  const global = container.toGlobal({ x: 0, y: 0 });
  const local = root.toLocal(global);
  return { x: local.x, y: local.y };
}

function reparentPreservingPosition(container: Container, parent: Container): { x: number; y: number } {
  const global = container.toGlobal({ x: 0, y: 0 });
  if (container.parent) {
    container.parent.removeChild(container);
  }
  parent.addChild(container);
  const local = parent.toLocal(global);
  container.position.set(local.x, local.y);
  return { x: local.x, y: local.y };
}

function syncDecorationDisplays(
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

function buildActorClipForRole(role: RoleDocument, failedTextures: Set<string>, bodyAnimationLabel: string): ActorClip {
  const actorClip = new ActorClip(failedTextures, bodyAnimationLabel);

  const headOption = getBodyPartOption('head', role.parts.head);
  const handOption = getBodyPartOption('hand', role.parts.hand);
  const footOption = getBodyPartOption('foot', role.parts.foot);
  const capeOption = getBodyPartOption('cape', role.parts.cape);

  const headFrame = getRolePartFrame(role, 'head', headOption);
  const handFrame = getRolePartFrame(role, 'hand', handOption);
  const footFrame = getRolePartFrame(role, 'foot', footOption);
  const capeFrame = getRolePartFrame(role, 'cape', capeOption);

  actorClip.footContainer.scale.set(getRolePartScale(role, 'foot'));
  actorClip.rightFoot.setFrame(footFrame);
  actorClip.leftFoot.setFrame(footFrame);
  if (isRuntimeEmptyFrame('foot', footFrame)) {
    actorClip.rightFoot.clip.visible = false;
    actorClip.leftFoot.clip.visible = false;
  }

  const handScale = getRolePartScale(role, 'hand');
  actorClip.rightHand.setFrame(handFrame, handScale);
  actorClip.leftHand.setFrame(handFrame, handScale);
  if (isRuntimeEmptyFrame('hand', handFrame)) {
    actorClip.rightHand.clip.visible = false;
    actorClip.leftHand.clip.visible = false;
  }

  actorClip.capeClip.setFrame(capeFrame, getRolePartScale(role, 'cape'));
  if (isRuntimeEmptyFrame('cape', capeFrame)) {
    actorClip.capeClip.clip.visible = false;
  }

  actorClip.headClip.setFrame(headFrame, getRolePartScale(role, 'head'));

  return actorClip;
}

export function CharacterStage({
  role,
  selectedIds,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  bodyAnimationRestartKey,
  stageScale,
  facingQuarterTurns,
  onUpdateDecoration,
  onApplyDragDelta,
  onCommitDragDelta,
  onBeginTransient,
  onCommitTransient,
  brushFillActive = false,
  brushFillBrushSize = 18,
  brushFillMask = { points: [] },
  onBrushFillMaskChange
}: CharacterStageProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageBgRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const brushDrawRef = useRef<BrushDrawState | null>(null);
  const beginDecorationDragRef = useRef<(id: string, event: FederatedPointerEvent, root: Container) => void>(() => undefined);
  const sceneRef = useRef<StageSceneState | null>(null);
  const roleRef = useRef(role);
  const selectedIdsRef = useRef(selectedIds);
  const callbacksRef = useRef({
    onUpdateDecoration,
    onApplyDragDelta,
    onCommitDragDelta,
    onBeginTransient,
    onCommitTransient,
    onBrushFillMaskChange
  });
  const brushFillRef = useRef({
    active: brushFillActive,
    brushSize: brushFillBrushSize,
    mask: brushFillMask
  });
  const stageBuildGenerationRef = useRef(0);
  const stageTeardownRef = useRef<(() => void) | null>(null);
  const deferredStageSyncRef = useRef<{ type: 'idle' | 'raf'; id: number } | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const lastPlaybackResetRef = useRef({ sceneVersion: -1, label: '', restartKey: -1 });
  const sceneKey = actorSceneKey(role, bodyAnimationLabel);
  const [surfaceSize, setSurfaceSize] = useState({ width: 1, height: 1 });
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });

  beginDecorationDragRef.current = (id, event, root) => {
    if (brushFillRef.current.active) return;
    const currentRole = roleRef.current;
    const selectedIdsSnapshot = selectedIdsRef.current;
    const selectedSet = new Set(selectedIdsSnapshot);
    if (!selectedSet.has(id)) return;

    const deco = currentRole.decorations.find((item) => item.id === id);
    if (!deco) return;

    if (sceneRef.current) {
      hideSelectionDragController(sceneRef.current);
      syncDisguiseChildOrder(sceneRef.current, currentRole);
    }

    const isMultiDrag = selectedIdsSnapshot.length > 1;
    if (isMultiDrag && sceneRef.current) {
      const currentScene = sceneRef.current;
      const selectedDecos: DecorationLayer[] = [];
      const displayPositions = new Map<string, { x: number; y: number }>();
      let cx = 0;
      let cy = 0;
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (const item of currentRole.decorations) {
        if (!selectedSet.has(item.id)) continue;
        const record = currentScene.decoDisplays.get(item.id);
        const displayPosition = record
          ? getDisplayRootPosition(record.container, currentScene.disguiseRoot)
          : { x: item.x, y: item.y };
        selectedDecos.push(item);
        displayPositions.set(item.id, displayPosition);
        cx += displayPosition.x;
        cy += displayPosition.y;
        minX = Math.min(minX, displayPosition.x);
        minY = Math.min(minY, displayPosition.y);
        maxX = Math.max(maxX, displayPosition.x);
        maxY = Math.max(maxY, displayPosition.y);
      }

      if (selectedDecos.length < 2) {
        callbacksRef.current.onBeginTransient();
        const local = root.toLocal(event.global);
        dragRef.current = { id, offsetX: local.x - deco.x, offsetY: local.y - deco.y };
        return;
      }

      cx /= selectedDecos.length;
      cy /= selectedDecos.length;

      if (selectedDecos.length >= LARGE_MULTI_DRAG_THRESHOLD) {
        const preview = createLargeMultiDragPreview(maxX - minX, maxY - minY);
        preview.position.set(cx, cy);
        currentScene.disguiseRoot.addChild(preview);

        const local = root.toLocal(event.global);
        dragRef.current = {
          id,
          offsetX: local.x - cx,
          offsetY: local.y - cy,
          preview: { container: preview, startX: cx, startY: cy }
        };
        return;
      }

      const items: Array<{ id: string; decoContainer: Container; startX: number; startY: number }> = [];
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
        callbacksRef.current.onBeginTransient();
        const local = root.toLocal(event.global);
        dragRef.current = { id, offsetX: local.x - deco.x, offsetY: local.y - deco.y };
        return;
      }

      const overlay = new Container();
      overlay.position.set(cx, cy);
      overlay.filters = [getCachedGlowFilter()];
      currentScene.disguiseRoot.addChild(overlay);

      // Add in reverse order so childIndex matches bottom-to-top z-order.
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i];
        reparentPreservingPosition(item.decoContainer, overlay);
      }

      syncDisguiseChildOrder(currentScene, currentRole, overlay, selectedSet);

      const local = root.toLocal(event.global);
      dragRef.current = {
        id,
        offsetX: local.x - cx,
        offsetY: local.y - cy,
        overlay: { container: overlay, items, startX: cx, startY: cy }
      };
      return;
    }

    callbacksRef.current.onBeginTransient();
    const local = root.toLocal(event.global);
    dragRef.current = {
      id,
      offsetX: local.x - deco.x,
      offsetY: local.y - deco.y
    };
  };

  const cancelDeferredStageSync = () => {
    const pending = deferredStageSyncRef.current;
    if (!pending) return;
    if (pending.type === 'idle' && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(pending.id);
    } else {
      cancelAnimationFrame(pending.id);
    }
    deferredStageSyncRef.current = null;
  };

  const scheduleDeferredStageSync = (run: () => void) => {
    cancelDeferredStageSync();
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(
        () => {
          deferredStageSyncRef.current = null;
          run();
        },
        { timeout: 120 }
      );
      deferredStageSyncRef.current = { type: 'idle', id };
      return;
    }

    const id = requestAnimationFrame(() => {
      deferredStageSyncRef.current = null;
      run();
    });
    deferredStageSyncRef.current = { type: 'raf', id };
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSurfaceSize = () => {
      const viewportWidth = Math.max(1, viewport.clientWidth);
      const viewportHeight = Math.max(1, viewport.clientHeight);
      const zoom = Math.max(1, stageScale);
      const needsScrollSurface = zoom > 1;
      const nextViewportSize = { width: viewportWidth, height: viewportHeight };
      const nextSurfaceSize = {
        width: Math.ceil(viewportWidth * zoom + (needsScrollSurface ? SCROLL_SURFACE_PADDING * 2 : 0)),
        height: Math.ceil(viewportHeight * zoom + (needsScrollSurface ? SCROLL_SURFACE_PADDING * 2 : 0))
      };

      setViewportSize((current) => {
        if (current.width === nextViewportSize.width && current.height === nextViewportSize.height) return current;
        return nextViewportSize;
      });

      setSurfaceSize((current) => {
        if (current.width === nextSurfaceSize.width && current.height === nextSurfaceSize.height) return current;
        return nextSurfaceSize;
      });
    };

    updateSurfaceSize();

    const resizeObserver = new ResizeObserver(updateSurfaceSize);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [stageScale]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let followupRafId = 0;
    const rafId = requestAnimationFrame(() => {
      viewport.scrollTo({
        left: Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2),
        top: Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2)
      });
      followupRafId = requestAnimationFrame(() => {
        sceneRef.current?.updatePosition();
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (followupRafId) cancelAnimationFrame(followupRafId);
    };
  }, [stageScale, surfaceSize.width, surfaceSize.height]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let rafId = 0;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        sceneRef.current?.updatePosition();
      });
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    callbacksRef.current = {
      onUpdateDecoration,
      onApplyDragDelta,
      onCommitDragDelta,
      onBeginTransient,
      onCommitTransient,
      onBrushFillMaskChange
    };
  }, [onApplyDragDelta, onBeginTransient, onBrushFillMaskChange, onCommitDragDelta, onCommitTransient, onUpdateDecoration]);

  useEffect(() => {
    brushFillRef.current = {
      active: brushFillActive,
      brushSize: brushFillBrushSize,
      mask: brushFillMask
    };
    if (!brushFillActive) {
      brushDrawRef.current = null;
    }
  }, [brushFillActive, brushFillBrushSize, brushFillMask]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application({
      antialias: true,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: host
    });
    appRef.current = app;
    const canvas = app.view as HTMLCanvasElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    host.appendChild(canvas);

    const resizeObserver = new ResizeObserver(() => {
      app.renderer.resize(host.clientWidth, host.clientHeight);
      app.stage.hitArea = app.screen;
      sceneRef.current?.updatePosition();
    });
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      cancelDeferredStageSync();
      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
      if (appRef.current === app) {
        appRef.current = null;
      }
      if (!app.stage?.destroyed) {
        app.destroy(true, { children: true, texture: false });
      }
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const host = hostRef.current;
    const stage = app?.stage;
    if (!app || !host || !stage) return;

    const buildId = ++stageBuildGenerationRef.current;
    let cancelled = false;
    const buildRole = roleRef.current;
    const urls = collectAtlasTextureUrlsForRole(buildRole);
    urls.push(gafSources.assetsTexture);

    partitionAtlasTextureUrls(urls).then(({ failed: failedTextures }) => {
      if (cancelled || buildId !== stageBuildGenerationRef.current) return;

      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
      sceneRef.current = null;

      stage.removeChildren();
      stage.eventMode = 'static';
      stage.hitArea = app.screen;

      const actorStage = new Container();
      actorStage.scale.set(stageScale);
      actorStage.rotation = (((facingQuarterTurns % 4) + 4) % 4) * (Math.PI / 2);
      stage.addChild(actorStage);

      const actorClipRoot = new Container();
      actorClipRoot.scale.set(ACTOR_BODY_SCALE);
      actorStage.addChild(actorClipRoot);

      const actorClip = buildActorClipForRole(buildRole, failedTextures, bodyAnimationLabel);
      actorClipRoot.addChild(actorClip);

      const headOption = getBodyPartOption('head', buildRole.parts.head);
      const headFrame = getRolePartFrame(buildRole, 'head', headOption);
      const { disguiseRoot, headLayerClip } = prepareDisguiseRoot(buildRole, headFrame, failedTextures);
      actorClip.headClip.setDisguise(disguiseRoot);
      disguiseRoot.addChild(headLayerClip);
      const selectionDragController = new Container();
      const selectionDragControllerGraphic = new Graphics();
      const selectionDragControllerVisuals = new Container();
      selectionDragController.visible = false;
      selectionDragController.eventMode = 'none';
      selectionDragController.addChild(selectionDragControllerGraphic);
      selectionDragController.addChild(selectionDragControllerVisuals);
      selectionDragController.on('pointerdown', (event: FederatedPointerEvent) => {
        const currentScene = sceneRef.current;
        const targetId = currentScene?.selectionDragTargetId;
        if (!currentScene || !targetId) return;
        beginDecorationDragRef.current(targetId, event, currentScene.disguiseRoot);
      });
      const brushFillOverlay = new Container();
      const brushFillGraphic = new Graphics();
      brushFillOverlay.visible = false;
      brushFillOverlay.eventMode = 'none';
      brushFillOverlay.addChild(brushFillGraphic);

      const updatePosition = () => {
        const hostEl = hostRef.current;
        const bgEl = stageBgRef.current;
        if (!hostEl || !bgEl || actorStage.destroyed) return;
        const hostRect = hostEl.getBoundingClientRect();
        const bgRect = bgEl.getBoundingClientRect();
        // Old TWRoleCgEditor anchors to stageBg.offset() + (+68, +98). That
        // offset relied on the original stageBg's exact DOM metrics (195px
        // wide, 24% top, specific em-based piece margins). The rebuild's
        // stageBg has different runtime bounds, so we anchor to the visual
        // bbox center instead -- this keeps the chibi centered inside the
        // diamond regardless of stageScale.
        const posX = bgRect.left - hostRect.left + bgRect.width / 2;
        const posY = bgRect.top - hostRect.top + bgRect.height / 2;
        actorStage.position.set(posX, posY);
      };

      const scene: StageSceneState = {
        actorStage,
        actorClip,
        disguiseRoot,
        headLayerClip,
        selectionDragController,
        selectionDragControllerGraphic,
        selectionDragControllerVisuals,
        brushFillOverlay,
        brushFillGraphic,
        selectionDragVisualKey: '',
        selectionDragVisualsById: new Map(),
        selectionDragTargetId: null,
        failedTextures,
        decoDisplays: new Map(),
        lastDisguiseChildOrder: [],
        updatePosition
      };
      sceneRef.current = scene;
      setSceneVersion((version) => version + 1);

      const decoOptions: DisguiseDecoOptions = {
        onPointerDown: (id, _event, root) => {
          beginDecorationDragRef.current(id, _event, root);
        }
      };

      const currentRole = roleRef.current;
      applyHeadLayerDisplayTransform(headLayerClip, currentRole);
      drawBrushFillOverlay(scene, brushFillRef.current.mask);
      syncDecorationDisplays(scene, currentRole, selectedIdsRef.current, decoOptions);

      updatePosition();
      const rafId = requestAnimationFrame(updatePosition);

      const positionObserver = new ResizeObserver(updatePosition);
      positionObserver.observe(host);
      if (stageBgRef.current) {
        positionObserver.observe(stageBgRef.current);
      }

      const addBrushPoint = (event: FederatedPointerEvent) => {
        const currentScene = sceneRef.current;
        const drawing = brushDrawRef.current;
        if (!currentScene || !drawing || !brushFillRef.current.active) return;
        const local = currentScene.disguiseRoot.toLocal(event.global);
        const nextPoint: BrushFillPoint = {
          x: local.x,
          y: local.y,
          radius: Math.max(1, brushFillRef.current.brushSize / 2)
        };
        const nextPoints = appendBrushPoint(drawing.points, nextPoint);
        if (nextPoints === drawing.points) return;
        drawing.points = nextPoints;
        drawBrushFillOverlay(currentScene, brushFillRef.current.mask, drawing.points);
        syncDisguiseChildOrder(currentScene, roleRef.current);
      };

      const handleBrushDown = (event: FederatedPointerEvent) => {
        if (!brushFillRef.current.active) return;
        const currentScene = sceneRef.current;
        if (!currentScene) return;
        dragRef.current = null;
        const local = currentScene.disguiseRoot.toLocal(event.global);
        brushDrawRef.current = {
          points: [{
            x: local.x,
            y: local.y,
            radius: Math.max(1, brushFillRef.current.brushSize / 2)
          }]
        };
        drawBrushFillOverlay(currentScene, brushFillRef.current.mask, brushDrawRef.current.points);
        syncDisguiseChildOrder(currentScene, roleRef.current);
      };

      const handleMove = (event: FederatedPointerEvent) => {
        if (brushDrawRef.current) {
          addBrushPoint(event);
          return;
        }

        const dragging = dragRef.current;
        const currentScene = sceneRef.current;
        if (!dragging || !currentScene) return;
        const local = currentScene.disguiseRoot.toLocal(event.global);
        let nx = local.x - dragging.offsetX;
        let ny = local.y - dragging.offsetY;

        if (dragging.overlay) {
          const disc = clampToDisc(nx, ny, positionRange(roleRef.current));
          nx = disc.x;
          ny = disc.y;
          dragging.overlay.container.position.set(nx, ny);
          return;
        }

        if (dragging.preview) {
          const disc = clampToDisc(nx, ny, positionRange(roleRef.current));
          nx = disc.x;
          ny = disc.y;
          dragging.preview.container.position.set(nx, ny);
          return;
        }

        const disc = clampToDisc(nx, ny, positionRange(roleRef.current));
        nx = disc.x;
        ny = disc.y;

        const record = currentScene.decoDisplays.get(dragging.id);
        if (record) {
          record.container.position.set(nx, ny);
        }

        callbacksRef.current.onUpdateDecoration(
          dragging.id,
          {
            x: nx,
            y: ny
          },
          false
        );
      };

      const handleUp = () => {
        const drawing = brushDrawRef.current;
        if (drawing) {
          const currentScene = sceneRef.current;
          const nextMask = {
            points: [...brushFillRef.current.mask.points, ...drawing.points]
          };
          brushDrawRef.current = null;
          brushFillRef.current = { ...brushFillRef.current, mask: nextMask };
          if (currentScene) {
            drawBrushFillOverlay(currentScene, nextMask);
            syncDisguiseChildOrder(currentScene, roleRef.current);
          }
          callbacksRef.current.onBrushFillMaskChange?.(nextMask);
          return;
        }

        if (!dragRef.current) return;
        const dragging = dragRef.current;

        if (dragging.overlay) {
          const currentScene = sceneRef.current;
          const dx = dragging.overlay.container.position.x - dragging.overlay.startX;
          const dy = dragging.overlay.container.position.y - dragging.overlay.startY;

          if (currentScene) {
            for (const item of dragging.overlay.items) {
              reparentPreservingPosition(item.decoContainer, currentScene.disguiseRoot);
            }
            syncDisguiseChildOrder(currentScene, roleRef.current);
          }

          if (!dragging.overlay.container.destroyed) {
            dragging.overlay.container.destroy({ children: false });
          }

          // Defer React state update to next frame so pointerup returns immediately
          requestAnimationFrame(() => {
            callbacksRef.current.onCommitDragDelta(dx, dy);
          });

          dragRef.current = null;
          return;
        }

        if (dragging.preview) {
          const dx = dragging.preview.container.position.x - dragging.preview.startX;
          const dy = dragging.preview.container.position.y - dragging.preview.startY;

          if (!dragging.preview.container.destroyed) {
            dragging.preview.container.destroy({ children: true });
          }

          requestAnimationFrame(() => {
            callbacksRef.current.onCommitDragDelta(dx, dy);
          });

          dragRef.current = null;
          return;
        }

        dragRef.current = null;
        callbacksRef.current.onCommitTransient();
      };

      stage.on('pointerdown', handleBrushDown);
      stage.on('pointermove', handleMove);
      stage.on('pointerup', handleUp);
      stage.on('pointerupoutside', handleUp);

      stageTeardownRef.current = () => {
        dragRef.current = null;
        cancelAnimationFrame(rafId);
        positionObserver.disconnect();
        if (stage.destroyed) return;
        stage.off('pointerdown', handleBrushDown);
        stage.off('pointermove', handleMove);
        stage.off('pointerup', handleUp);
        stage.off('pointerupoutside', handleUp);
        for (const child of stage.removeChildren()) {
          if (!child.destroyed) child.destroy({ children: true });
        }
        scene.decoDisplays.clear();
        scene.lastDisguiseChildOrder = [];
        if (sceneRef.current === scene) {
          sceneRef.current = null;
        }
      };
    });

    return () => {
      cancelled = true;
      cancelDeferredStageSync();
      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
    };
  }, [sceneKey]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const decoOptions: DisguiseDecoOptions = {
      onPointerDown: (id, _event, root) => {
        beginDecorationDragRef.current(id, _event, root);
      }
    };

    const syncStage = () => {
      const currentScene = sceneRef.current;
      if (!currentScene) return;
      const activeOverlay = dragRef.current?.overlay
        ? {
            container: dragRef.current.overlay.container,
            selectedSet: new Set(dragRef.current.overlay.items.map((item) => item.id))
          }
        : null;
      applyHeadLayerDisplayTransform(currentScene.headLayerClip, role);
      syncDecorationDisplays(currentScene, role, selectedIds, decoOptions, activeOverlay);
    };

    if (role.decorations.length >= DEFER_STAGE_SYNC_DECO_COUNT) {
      scheduleDeferredStageSync(syncStage);
      return () => cancelDeferredStageSync();
    }

    cancelDeferredStageSync();
    syncStage();
  }, [role, selectedIds]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!brushDrawRef.current) {
      drawBrushFillOverlay(scene, brushFillMask);
    }
    syncDisguiseChildOrder(scene, roleRef.current);
    const canvas = appRef.current?.view as HTMLCanvasElement | undefined;
    if (canvas) {
      canvas.style.cursor = brushFillActive ? 'crosshair' : '';
    }
  }, [brushFillActive, brushFillMask, sceneVersion]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const lastReset = lastPlaybackResetRef.current;
    if (
      lastReset.sceneVersion !== sceneVersion ||
      lastReset.label !== bodyAnimationLabel ||
      lastReset.restartKey !== bodyAnimationRestartKey
    ) {
      scene.actorClip.setBodyFrame(bodyAnimationLabel);
      lastPlaybackResetRef.current = {
        sceneVersion,
        label: bodyAnimationLabel,
        restartKey: bodyAnimationRestartKey
      };
    }

    if (!bodyAnimationPlaying) return;

    let rafId = 0;
    let lastTime = performance.now();
    let accumulated = 0;

    const advanceFrame = () => {
      const currentScene = sceneRef.current;
      if (currentScene !== scene || scene.actorClip.destroyed) return;
      const range = scene.actorClip.getBodyFrameRange(bodyAnimationLabel);
      const currentFrame = scene.actorClip.body.currentFrame;
      const nextFrame = currentFrame >= range.endFrame ? range.startFrame : currentFrame + 1;
      scene.actorClip.setBodyFrame(nextFrame);
    };

    const tick = (time: number) => {
      const currentScene = sceneRef.current;
      if (currentScene !== scene || scene.actorClip.destroyed) return;
      accumulated += time - lastTime;
      lastTime = time;
      while (accumulated >= BODY_ANIMATION_FRAME_MS) {
        advanceFrame();
        accumulated -= BODY_ANIMATION_FRAME_MS;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [bodyAnimationLabel, bodyAnimationPlaying, bodyAnimationRestartKey, sceneVersion]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.actorStage.scale.set(stageScale);
    scene.actorStage.rotation = (((facingQuarterTurns % 4) + 4) % 4) * (Math.PI / 2);
    scene.updatePosition();
    const rafId = requestAnimationFrame(scene.updatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [stageScale, facingQuarterTurns]);

  return (
    <section className="stage-panel">
      <div
        ref={viewportRef}
        className="stage-viewport"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'auto',
          overscrollBehavior: 'contain'
        }}
      >
        <div
          className="stage-scroll-surface"
          style={{
            position: 'relative',
            width: `${surfaceSize.width}px`,
            height: `${surfaceSize.height}px`,
            minWidth: '100%',
            minHeight: '100%',
            overflow: 'visible',
            isolation: 'isolate'
          }}
        >
          <div
            ref={stageBgRef}
            className="stage-bg"
            aria-hidden="true"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(90deg) scale(${stageScale})`
            }}
          >
            <div className="piece" />
            <div className="piece piece-two" />
          </div>
          <div
            ref={hostRef}
            className="pixi-host"
            style={{
              position: 'sticky',
              top: 0,
              left: 0,
              zIndex: 2,
              width: `${viewportSize.width}px`,
              height: `${viewportSize.height}px`,
              pointerEvents: 'auto'
            }}
          />
        </div>
      </div>
      <div className="stage-help">{t(brushFillActive ? 'stage.brushHelp' : 'stage.help')}</div>
    </section>
  );
}
