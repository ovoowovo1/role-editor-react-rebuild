import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { BodyPartTab, DecorationLayer, PartOption, RoleDocument } from '../../types/role';
import { ACTOR_BODY_SCALE } from '../runtime/actorClipAdapter';
import { ActorClip } from '../runtime/actorClip';
import { createActorGafClip, createGafClip, type GafMovieClip } from '../runtime/gafMovieClip';
import { applyGafAtlasToSprite } from '../runtime/gafAtlasSprite';
import { actorPartRuntime, getPartFrame, isRuntimeEmptyFrame, sanitizePartScale } from '../runtime/twlibPartRuntime';
import { isMissingDecoAssetId, normalizeImportedRole } from '../serialization/roleSerialization';
import { collectAtlasTextureUrlsForRole, partitionAtlasTextureUrls } from '../runtime/atlasTextureAvailability';
import { clampedHeadLayerIndex, displayTransformPatchForDecoration, displayTransformPatchForHeadLayer } from './characterStageHelpers';
import { getBodyPartOption, optionById } from '../../mock/options';
import {
  actorAtlasFrames,
  actorRuntimeManifest,
  decorationAtlasFrames,
  decorationRuntimeManifest,
  gafSources
} from '../../mock/gafManifest';
import { DEFAULT_ACTOR_BODY_ANIMATION_LABEL } from '../runtime/actorBodyAnimation';

const ALPHA_MASK_DECO_CODES: Set<string> = new Set();

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

function makeOptionSprite(option: PartOption | undefined, failedTextures: Set<string>): Sprite | null {
  if (!option?.atlas) {
    const fallback = option?.icon ?? optionById[Object.keys(optionById)[0]]?.icon;
    return fallback ? Sprite.from(fallback) : null;
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

function applyDisplayTransform(wrapper: Container, patch: ReturnType<typeof displayTransformPatchForDecoration>): void {
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

function createDecorationVisual(deco: DecorationLayer, failedTextures: Set<string>): Container | null {
  const option = optionById[deco.assetId];
  const missing = !option || isMissingDecoAssetId(deco.assetId);
  const wrapper = new Container();
  const patch = displayTransformPatchForDecoration(deco);
  applyDisplayTransform(wrapper, patch);
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
  let alphaPixels = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha <= 0) continue;
      alphaPixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    alphaPixels,
    nonTransparentBounds: alphaPixels
      ? { minX, minY, maxX, maxY }
      : null
  };
}

async function prepareRoleAssets(rawRole: unknown): Promise<{
  role: RoleDocument;
  warnings: string[];
  failedTextures: Set<string>;
}> {
  const { role, warnings } = normalizeImportedRole(rawRole);
  const urls = collectAtlasTextureUrlsForRole(role);
  urls.push(gafSources.assetsTexture);
  const { failed } = await partitionAtlasTextureUrls(urls);
  const okUrls = [...new Set(urls.filter((url) => url && !failed.has(url)))];
  if (okUrls.length) {
    await Assets.load(okUrls);
  }
  return { role, warnings, failedTextures: failed };
}

export async function renderFullRoleToDataUrl(
  rawRole: unknown,
  renderOptions: FullRoleRenderOptions = {}
): Promise<FullRoleRenderResult> {
  const options = normalizeRenderOptions(renderOptions);
  const background = parseBackground(options.background);
  const { role, warnings, failedTextures } = await prepareRoleAssets(rawRole);

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

    const canvas = app.view as HTMLCanvasElement;
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
      missingTextureCount: failedTextures.size
    };
  } finally {
    app.destroy(true, { children: true, texture: false });
  }
}
