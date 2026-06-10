import { Application, Assets } from 'pixi.js';
import { actorAtlasFrames, actorRuntimeManifest, gafSources } from '../../mock/gafManifest';
import type { PartOption } from '../../types/role';
import { createActorGafClip, type CreateGafClipOptions } from './gafMovieClip';

const previewCache = new Map<string, Promise<string | null>>();
const PREVIEW_PADDING = 3;
const MAX_PREVIEW_CANVAS_SIZE = 180;
const RUNTIME_PREVIEW_CAPE_FRAMES = new Set([2, 7, 13, 15, 16, 21, 24]);

function canRenderActorPartPreview(option: PartOption): boolean {
  return shouldUseActorPartRuntimePreview(option);
}

function cacheKey(option: PartOption): string {
  return `${option.actorLibrary}:${option.frame}`;
}

function safeDimension(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.ceil(value));
}

function actorPreviewClipOptions(option: PartOption): CreateGafClipOptions {
  return option.category === 'cape' ? { nestedTimelineFrame: 'first' } : {};
}

export function shouldUseActorPartRuntimePreview(option: PartOption | undefined): boolean {
  if (!option?.actorLibrary || option.frame == null || option.category !== 'cape' || option.isEmpty) return false;
  return RUNTIME_PREVIEW_CAPE_FRAMES.has(option.frame);
}

async function renderActorPartPreview(option: PartOption): Promise<string | null> {
  if (!canRenderActorPartPreview(option)) return null;

  try {
    await Assets.load(gafSources.actorTexture);
  } catch {
    return null;
  }

  const failedTextures = new Set<string>();
  const clip = createActorGafClip(
    failedTextures,
    option.actorLibrary!,
    actorRuntimeManifest,
    gafSources.actorTexture,
    actorAtlasFrames[option.actorLibrary!] ?? [],
    actorPreviewClipOptions(option)
  );

  try {
    clip.gotoAndStop(option.frame!);
    const bounds = clip.getLocalBounds();
    const contentWidth = safeDimension(bounds.width);
    const contentHeight = safeDimension(bounds.height);
    const fitScale = Math.min(MAX_PREVIEW_CANVAS_SIZE / contentWidth, MAX_PREVIEW_CANVAS_SIZE / contentHeight, 1);
    const width = safeDimension(contentWidth * fitScale + PREVIEW_PADDING * 2);
    const height = safeDimension(contentHeight * fitScale + PREVIEW_PADDING * 2);

    const app = new Application({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: 1,
      autoDensity: false,
      preserveDrawingBuffer: true
    });

    try {
      clip.position.set(-bounds.x * fitScale + PREVIEW_PADDING, -bounds.y * fitScale + PREVIEW_PADDING);
      clip.scale.set(fitScale);
      app.stage.addChild(clip);
      app.renderer.render(app.stage);
      return (app.view as HTMLCanvasElement).toDataURL('image/png');
    } finally {
      app.destroy(true, { children: true, texture: false });
    }
  } catch {
    if (!clip.destroyed) {
      clip.destroy({ children: true });
    }
    return null;
  }
}

export function loadActorPartPreview(option: PartOption): Promise<string | null> | null {
  if (!canRenderActorPartPreview(option)) return null;
  const key = cacheKey(option);
  const cached = previewCache.get(key);
  if (cached) return cached;
  const promise = renderActorPartPreview(option);
  previewCache.set(key, promise);
  return promise;
}
