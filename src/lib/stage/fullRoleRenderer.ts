import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import type { BodyPartTab, PartOption, RoleDocument } from '../../types/role';
import { ACTOR_BODY_SCALE } from '../runtime/actorClipAdapter';
import { ActorClip } from '../runtime/actorClip';
import { createActorGafClip, type GafMovieClip } from '../runtime/gafMovieClip';
import { actorPartRuntime, getPartFrame, isRuntimeEmptyFrame, sanitizePartScale } from '../runtime/twlibPartRuntime';
import { normalizeImportedRole } from '../serialization/roleSerializationImport';
import { collectAtlasTextureUrlsForRole, partitionAtlasTextureUrls } from '../runtime/atlasTextureAvailability';
import {
  clampedHeadLayerIndex,
  displayTransformPatchForHeadLayer,
  type DisplayTransformPatch
} from './characterStageHelpers';
import { createDecorationVisual } from './decorationVisual';
import { scanAlphaCoverage } from './renderMetrics';
import { getBodyPartOption } from '../../mock/options';
import { actorAtlasFrames, gafSources } from '../../mock/gafManifest';
import { actorRuntimeManifest } from '../runtime/gafRuntimeManifest';
import { DEFAULT_ACTOR_BODY_ANIMATION_LABEL } from '../runtime/actorBodyAnimation';
import { prepareWeaponAtlasForAnimation, recordWeaponAtlasResult } from '../runtime/weaponAtlasAvailability';

export type RenderBackground = 'transparent' | string;
export type RenderPart = BodyPartTab;

export interface FullRoleRenderDebugOptions {
  hideParts?: RenderPart[];
  hideDecorations?: boolean;
  hideHeadLayer?: boolean;
  onlyDecorations?: boolean;
  onlyHead?: boolean;
}

export interface FullRoleRenderOptions {
  imageSize?: number;
  width?: number;
  height?: number;
  background?: RenderBackground;
  debug?: FullRoleRenderDebugOptions;
  includeImageData?: boolean;
  bodyAnimationLabel?: string;
  facingQuarterTurns?: number;
  stageScale?: number;
}

export interface FullRoleRenderResult {
  dataUrl: string;
  imageData?: ImageData;
  width: number;
  height: number;
  alphaPixels: number;
  nonTransparentBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  warnings: string[];
  missingTextureCount: number;
}

interface NormalizedRenderOptions {
  width: number;
  height: number;
  background: RenderBackground;
  debug: Required<FullRoleRenderDebugOptions>;
  includeImageData: boolean;
  bodyAnimationLabel: string;
  facingQuarterTurns: number;
  stageScale: number;
}

interface BackgroundSpec {
  color: number;
  alpha: number;
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function normalizeRenderDimensions(options: FullRoleRenderOptions = {}): { width: number; height: number } {
  const fallbackSize = Math.max(1, Math.round(options.imageSize ?? 256));
  return {
    width: Math.max(1, Math.round(options.width ?? fallbackSize)),
    height: Math.max(1, Math.round(options.height ?? options.width ?? fallbackSize))
  };
}

export function normalizeRenderOptions(renderOptions: FullRoleRenderOptions = {}): NormalizedRenderOptions {
  const { width, height } = normalizeRenderDimensions(renderOptions);
  return {
    width,
    height,
    background: renderOptions.background ?? 'transparent',
    debug: {
      hideParts: renderOptions.debug?.hideParts ?? [],
      hideDecorations: renderOptions.debug?.hideDecorations ?? false,
      hideHeadLayer: renderOptions.debug?.hideHeadLayer ?? false,
      onlyDecorations: renderOptions.debug?.onlyDecorations ?? false,
      onlyHead: renderOptions.debug?.onlyHead ?? false
    },
    includeImageData: renderOptions.includeImageData ?? false,
    bodyAnimationLabel: renderOptions.bodyAnimationLabel ?? DEFAULT_ACTOR_BODY_ANIMATION_LABEL,
    facingQuarterTurns: Math.round(renderOptions.facingQuarterTurns ?? 0),
    stageScale: Number.isFinite(renderOptions.stageScale) ? Math.max(0.01, renderOptions.stageScale ?? 1) : 1
  };
}

function parseBackground(background: RenderBackground): BackgroundSpec {
  if (background === 'transparent') return { color: 0x000000, alpha: 0 };
  const trimmed = String(background).trim();
  const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const r = hex[0] + hex[0];
    const g = hex[1] + hex[1];
    const b = hex[2] + hex[2];
    return { color: Number.parseInt(`${r}${g}${b}`, 16), alpha: 1 };
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) return { color: Number.parseInt(hex, 16), alpha: 1 };
  return { color: 0x000000, alpha: 0 };
}

function getRolePartFrame(role: RoleDocument, category: BodyPartTab, option: PartOption | undefined): number {
  return role.partFrames?.[category] ?? getPartFrame(option) ?? actorPartRuntime[category].defaultFrame;
}

function getRolePartScale(role: RoleDocument, category: BodyPartTab): number {
  return sanitizePartScale(role.partScales?.[category], 1);
}

function applyDisplayTransform(wrapper: Container, patch: DisplayTransformPatch): void {
  wrapper.position.set(patch.x, patch.y);
  wrapper.rotation = patch.rotationRadians;
  wrapper.scale.set(patch.scaleX, patch.scaleY);
  wrapper.alpha = patch.alpha;
  wrapper.visible = patch.visible;
}

function prepareDisguiseRoot(
  role: RoleDocument,
  headFrame: number,
  failedTextures: Set<string>,
  debug: Required<FullRoleRenderDebugOptions>
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
  applyDisplayTransform(headLayerClip, displayTransformPatchForHeadLayer(headLayer, isRuntimeEmptyFrame('head', headFrame)));
  headLayerClip.visible = headLayerClip.visible && !debug.hideHeadLayer && !debug.hideParts.includes('head');

  return { disguiseRoot, headLayerClip };
}

function buildActorClipForRole(
  role: RoleDocument,
  failedTextures: Set<string>,
  bodyAnimationLabel: string,
  debug: Required<FullRoleRenderDebugOptions>
): ActorClip {
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
  if (isRuntimeEmptyFrame('foot', footFrame) || debug.hideParts.includes('foot') || debug.onlyHead || debug.onlyDecorations) {
    actorClip.rightFoot.clip.visible = false;
    actorClip.leftFoot.clip.visible = false;
  }

  const handScale = getRolePartScale(role, 'hand');
  actorClip.rightHand.setFrame(handFrame, handScale);
  actorClip.leftHand.setFrame(handFrame, handScale);
  if (isRuntimeEmptyFrame('hand', handFrame) || debug.hideParts.includes('hand') || debug.onlyHead || debug.onlyDecorations) {
    actorClip.rightHand.clip.visible = false;
    actorClip.leftHand.clip.visible = false;
  }

  actorClip.capeClip.setFrame(capeFrame, getRolePartScale(role, 'cape'));
  if (isRuntimeEmptyFrame('cape', capeFrame) || debug.hideParts.includes('cape') || debug.onlyHead || debug.onlyDecorations) {
    actorClip.capeClip.clip.visible = false;
  }

  actorClip.headClip.setFrame(headFrame, getRolePartScale(role, 'head'));
  if (debug.hideParts.includes('head') || debug.onlyDecorations) {
    actorClip.headClip.clip.visible = false;
  }

  if (debug.onlyDecorations || debug.onlyHead) {
    hideRenderableLeaves(actorClip.body);
  }

  return actorClip;
}

function hideRenderableLeaves(container: Container): void {
  for (const child of container.children) {
    if (child instanceof Sprite || child instanceof Graphics) {
      child.visible = false;
    }
    if (child instanceof Container) {
      hideRenderableLeaves(child);
    }
  }
}

export function addRoleDisplay(
  app: Application,
  role: RoleDocument,
  failedTextures: Set<string>,
  options: NormalizedRenderOptions
): void {
  const actorStage = new Container();
  actorStage.position.set(options.width / 2, options.height / 2);
  actorStage.scale.set(options.stageScale);
  actorStage.rotation = (((options.facingQuarterTurns % 4) + 4) % 4) * (Math.PI / 2);
  app.stage.addChild(actorStage);

  const actorClipRoot = new Container();
  actorClipRoot.scale.set(ACTOR_BODY_SCALE);
  actorStage.addChild(actorClipRoot);

  const actorClip = buildActorClipForRole(role, failedTextures, options.bodyAnimationLabel, options.debug);
  actorClipRoot.addChild(actorClip);

  const headOption = getBodyPartOption('head', role.parts.head);
  const headFrame = getRolePartFrame(role, 'head', headOption);
  const { disguiseRoot, headLayerClip } = prepareDisguiseRoot(role, headFrame, failedTextures, options.debug);
  actorClip.headClip.setDisguise(disguiseRoot);

  const topFirstChildren: Container[] = [];
  const hideDecorations = options.debug.hideDecorations || options.debug.onlyHead;
  if (!hideDecorations) {
    for (const deco of role.decorations) {
      const visual = createDecorationVisual(deco, failedTextures);
      if (visual) topFirstChildren.push(visual);
    }
  }
  topFirstChildren.splice(clampedHeadLayerIndex(role), 0, headLayerClip);
  disguiseRoot.addChild(...topFirstChildren.reverse());
}

function readCanvasImageData(canvas: HTMLCanvasElement): ImageData | null {
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(canvas, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function alphaStats(canvas: HTMLCanvasElement, imageData?: ImageData | null): Pick<FullRoleRenderResult, 'alphaPixels' | 'nonTransparentBounds'> {
  const data = (imageData ?? readCanvasImageData(canvas))?.data;
  if (!data) return { alphaPixels: 0, nonTransparentBounds: null };
  return scanAlphaCoverage({ width: canvas.width, height: canvas.height, data });
}

interface RoleCaptureInput {
  role: RoleDocument;
  warnings: string[];
  urls: string[];
}

function describeRoleForCapture(rawRole: unknown): RoleCaptureInput {
  const { role, warnings } = normalizeImportedRole(rawRole);
  return { role, warnings, urls: collectAtlasTextureUrlsForRole(role) };
}

async function prepareRoleAssets({ urls }: RoleCaptureInput, bodyAnimationLabel: string): Promise<Set<string>> {
  const weaponAtlas = prepareWeaponAtlasForAnimation(bodyAnimationLabel);
  const { failed } = await partitionAtlasTextureUrls(urls);
  const okUrls = [...new Set(urls.filter((url) => url && !failed.has(url)))];
  if (okUrls.length) {
    await Assets.load(okUrls);
  }
  if (weaponAtlas) recordWeaponAtlasResult(failed, await weaponAtlas);
  return failed;
}

interface RenderedRoleCanvas {
  canvas: HTMLCanvasElement;
  warnings: string[];
  missingTextureCount: number;
}

async function withRenderedRoleCanvas<T>(
  describeRole: () => RoleCaptureInput,
  options: NormalizedRenderOptions,
  capture: (rendered: RenderedRoleCanvas) => T
): Promise<T> {
  const background = parseBackground(options.background);
  const input = describeRole();
  const failedTextures = await prepareRoleAssets(input, options.bodyAnimationLabel);
  const { role, warnings } = input;

  const app = new Application({
    antialias: true,
    background: background.color,
    backgroundAlpha: background.alpha,
    width: options.width,
    height: options.height,
    resolution: 1,
    autoDensity: false,
    preserveDrawingBuffer: true
  });

  try {
    addRoleDisplay(app, role, failedTextures, options);
    app.renderer.render(app.stage);
    await waitForNextFrame();
    app.renderer.render(app.stage);
    return capture({ canvas: app.view as HTMLCanvasElement, warnings, missingTextureCount: failedTextures.size });
  } finally {
    app.destroy(true, { children: true, texture: false });
  }
}

export async function renderFullRoleToDataUrl(
  rawRole: unknown,
  renderOptions: FullRoleRenderOptions = {}
): Promise<FullRoleRenderResult> {
  const options = normalizeRenderOptions(renderOptions);
  return withRenderedRoleCanvas(() => describeRoleForCapture(rawRole), options, ({ canvas, warnings, missingTextureCount }) => {
    const imageData = readCanvasImageData(canvas);
    const stats = alphaStats(canvas, imageData);
    return {
      dataUrl: canvas.toDataURL('image/png'),
      imageData: options.includeImageData ? imageData ?? undefined : undefined,
      width: canvas.width,
      height: canvas.height,
      alphaPixels: stats.alphaPixels,
      nonTransparentBounds: stats.nonTransparentBounds,
      warnings,
      missingTextureCount
    };
  });
}

export interface RoleThumbnailCapture {
  imageData: ImageData | null;
  width: number;
  height: number;
  nonTransparentBounds: FullRoleRenderResult['nonTransparentBounds'];
  encodeSourcePng(): string;
}

/** Finish capture synchronously while the underlying WebGL canvas is alive.
 * On the normal cropped path, the encoder for the discarded source is never called.
 */
export async function captureRoleThumbnail<T>(rawRole: unknown, capture: (rendered: RoleThumbnailCapture) => T): Promise<T> {
  const options = normalizeRenderOptions({ imageSize: 256, background: 'transparent' });
  return withRenderedRoleCanvas(() => describeRoleForCapture(rawRole), options, ({ canvas }) => {
    const imageData = readCanvasImageData(canvas);
    return capture({
      imageData,
      width: canvas.width,
      height: canvas.height,
      nonTransparentBounds: alphaStats(canvas, imageData).nonTransparentBounds,
      encodeSourcePng: () => canvas.toDataURL('image/png')
    });
  });
}

type BatchCaptureMode = 'png' | 'pixels' | 'both';

export type FullRoleBatchCapture = Omit<FullRoleRenderResult, 'alphaPixels' | 'nonTransparentBounds'>;

/**
 * Internal batch endpoints either return a PNG or score raw pixels. Use the
 * identical render lifecycle but omit captures/statistics no caller consumes.
 */
export async function captureFullRoleForBatch(
  rawRole: unknown,
  renderOptions: FullRoleRenderOptions,
  mode: BatchCaptureMode
): Promise<FullRoleBatchCapture> {
  return captureDescribedRoleForBatch(() => describeRoleForCapture(rawRole), renderOptions, mode);
}

/** Reuse static role inputs only. Each capture prepares textures and owns
 * its own Pixi app, including the existing retry behavior of missing atlases.
 */
export function createBatchRoleCapture(rawRole: unknown): BatchRoleCapture {
  let input: RoleCaptureInput | undefined;
  return (options, mode) =>
    captureDescribedRoleForBatch(() => (input ??= describeRoleForCapture(rawRole)), options, mode);
}

type BatchRoleCapture = (
  options: FullRoleRenderOptions,
  mode: BatchCaptureMode
) => Promise<FullRoleBatchCapture>;

async function captureDescribedRoleForBatch(
  describeRole: () => RoleCaptureInput,
  renderOptions: FullRoleRenderOptions,
  mode: BatchCaptureMode
): Promise<FullRoleBatchCapture> {
  const options = normalizeRenderOptions(renderOptions);
  return withRenderedRoleCanvas(describeRole, options, ({ canvas, warnings, missingTextureCount }) => {
    const imageData = mode === 'png' ? undefined : readCanvasImageData(canvas) ?? undefined;
    return {
      dataUrl: mode === 'pixels' ? '' : canvas.toDataURL('image/png'),
      imageData,
      width: canvas.width,
      height: canvas.height,
      warnings,
      missingTextureCount
    };
  });
}
