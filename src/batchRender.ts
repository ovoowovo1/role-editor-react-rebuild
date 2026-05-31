import { Assets } from 'pixi.js';
import { renderFullRoleToDataUrl, type FullRoleRenderOptions, type FullRoleRenderResult } from './lib/stage/fullRoleRenderer';
import {
  computeRenderMetrics,
  compositeScore,
  contributionFromAblations,
  imageDeltaMagnitude,
  stripPngDataUrlPrefix,
  type MetricMap,
  type PartContribution,
  type RenderMetricName
} from './lib/stage/renderMetrics';
import { defaultGafAssetManifest, gafSources } from './mock/gafManifest';

type RenderMode =
  | 'full'
  | 'without_head'
  | 'without_hand'
  | 'without_foot'
  | 'without_cape'
  | 'without_decorations'
  | 'without_head_layer'
  | 'only_decorations'
  | 'only_head';

interface RenderRoleRequest {
  payload: unknown;
  width?: number;
  height?: number;
  background?: FullRoleRenderOptions['background'];
  debug?: FullRoleRenderOptions['debug'];
}

interface RenderRoleResponse {
  ok: boolean;
  pngBase64: string;
  width: number;
  height: number;
  renderMs: number;
  warnings?: string[];
  missingTextureCount?: number;
}

interface RenderBatchRequest {
  items: Array<{ id: string; payload: unknown }>;
  width?: number;
  height?: number;
  background?: FullRoleRenderOptions['background'];
  debug?: FullRoleRenderOptions['debug'];
}

type RenderBatchItemResponse =
  | { id: string; ok: true; pngBase64: string; width: number; height: number; renderMs: number }
  | { id: string; ok: false; error: string };

interface RenderBatchResponse {
  ok: boolean;
  items: RenderBatchItemResponse[];
}

interface ScoreRoleRequest {
  targetPngBase64: string;
  candidate: unknown;
  metrics: RenderMetricName[];
  width?: number;
  height?: number;
  background?: FullRoleRenderOptions['background'];
  debug?: FullRoleRenderOptions['debug'];
}

interface ScoreRoleResponse {
  ok: true;
  score: number;
  metrics: MetricMap;
  renderMs: number;
}

interface RenderAblationRequest {
  payload: unknown;
  modes: RenderMode[];
  width?: number;
  height?: number;
  background?: FullRoleRenderOptions['background'];
}

interface RenderAblationResponse {
  ok: true;
  renders: Record<string, string>;
  partContribution: PartContribution;
}

interface RendererInfo {
  ok: true;
  renderer: 'role-editor-react-rebuild';
  version: 'v1';
  pixiReady: boolean;
  assetsReady: boolean;
  assetManifestHash: string;
  canvasSize: { width: number; height: number };
  renderMode: 'react-pixi-browser-page';
}

interface TwroleBrowserRenderer {
  ready: boolean;
  render(role: unknown, options?: FullRoleRenderOptions): Promise<FullRoleRenderResult>;
  renderRole(request: RenderRoleRequest): Promise<RenderRoleResponse>;
  renderRoleBatch(request: RenderBatchRequest): Promise<RenderBatchResponse>;
  scoreRole(request: ScoreRoleRequest): Promise<ScoreRoleResponse>;
  renderAblation(request: RenderAblationRequest): Promise<RenderAblationResponse>;
  getRendererInfo(): RendererInfo;
}

declare global {
  interface Window {
    __TWROLE_RENDER_TO_DATA_URL__?: TwroleBrowserRenderer;
    twroleBatchRenderer?: {
      ready: boolean;
      render(role: unknown, options?: FullRoleRenderOptions): Promise<FullRoleRenderResult>;
    };
  }
}

let assetsReady = false;
let lastCanvasSize = { width: 256, height: 256 };

function elapsedSince(start: number): number {
  return Math.round((performance.now() - start) * 10) / 10;
}

function rendererOptions(request: {
  width?: number;
  height?: number;
  background?: FullRoleRenderOptions['background'];
  debug?: FullRoleRenderOptions['debug'];
}, includeImageData = false): FullRoleRenderOptions {
  return {
    width: request.width,
    height: request.height,
    background: request.background ?? 'transparent',
    debug: request.debug,
    includeImageData
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function renderRole(request: RenderRoleRequest): Promise<RenderRoleResponse> {
  const start = performance.now();
  const rendered = await renderFullRoleToDataUrl(request.payload, rendererOptions(request));
  lastCanvasSize = { width: rendered.width, height: rendered.height };
  return {
    ok: true,
    pngBase64: stripPngDataUrlPrefix(rendered.dataUrl),
    width: rendered.width,
    height: rendered.height,
    renderMs: elapsedSince(start),
    warnings: rendered.warnings,
    missingTextureCount: rendered.missingTextureCount
  };
}

async function renderRoleBatch(request: RenderBatchRequest): Promise<RenderBatchResponse> {
  const items: RenderBatchItemResponse[] = [];
  for (const item of request.items ?? []) {
    try {
      const rendered = await renderRole({
        payload: item.payload,
        width: request.width,
        height: request.height,
        background: request.background,
        debug: request.debug
      });
      items.push({
        id: item.id,
        ok: true,
        pngBase64: rendered.pngBase64,
        width: rendered.width,
        height: rendered.height,
        renderMs: rendered.renderMs
      });
    } catch (error) {
      items.push({ id: item.id, ok: false, error: errorMessage(error) });
    }
  }
  return { ok: items.every((item) => item.ok), items };
}

async function decodePngBase64ToImageData(base64: string): Promise<ImageData> {
  const image = new Image();
  image.decoding = 'async';
  image.src = `data:image/png;base64,${stripPngDataUrlPrefix(base64)}`;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not create 2D context for target PNG.');
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function ablationOptions(mode: RenderMode): FullRoleRenderOptions['debug'] {
  if (mode === 'without_head') return { hideParts: ['head'], hideHeadLayer: true };
  if (mode === 'without_hand') return { hideParts: ['hand'] };
  if (mode === 'without_foot') return { hideParts: ['foot'] };
  if (mode === 'without_cape') return { hideParts: ['cape'] };
  if (mode === 'without_decorations') return { hideDecorations: true };
  if (mode === 'without_head_layer') return { hideHeadLayer: true };
  if (mode === 'only_decorations') return { onlyDecorations: true };
  if (mode === 'only_head') return { onlyHead: true };
  return {};
}

function mergedDebug(
  base: FullRoleRenderOptions['debug'] | undefined,
  override: FullRoleRenderOptions['debug'] | undefined
): FullRoleRenderOptions['debug'] {
  return {
    hideParts: [...(base?.hideParts ?? []), ...(override?.hideParts ?? [])],
    hideDecorations: !!base?.hideDecorations || !!override?.hideDecorations,
    hideHeadLayer: !!base?.hideHeadLayer || !!override?.hideHeadLayer,
    onlyDecorations: !!base?.onlyDecorations || !!override?.onlyDecorations,
    onlyHead: !!base?.onlyHead || !!override?.onlyHead
  };
}

async function renderImageData(
  payload: unknown,
  options: Omit<FullRoleRenderOptions, 'includeImageData'>
): Promise<FullRoleRenderResult & { imageData: ImageData }> {
  const rendered = await renderFullRoleToDataUrl(payload, { ...options, includeImageData: true });
  if (!rendered.imageData) throw new Error('Renderer did not return ImageData.');
  return rendered as FullRoleRenderResult & { imageData: ImageData };
}

async function scoreRole(request: ScoreRoleRequest): Promise<ScoreRoleResponse> {
  const start = performance.now();
  const target = await decodePngBase64ToImageData(request.targetPngBase64);
  const width = request.width ?? target.width;
  const height = request.height ?? target.height;
  const candidate = await renderImageData(request.candidate, {
    ...rendererOptions({ ...request, width, height }, true),
    width,
    height
  });
  let contribution: PartContribution | undefined;

  if (request.metrics.includes('fake_part_score')) {
    const full = await renderImageData(request.candidate, {
      width,
      height,
      background: request.background ?? 'transparent',
      debug: request.debug
    });
    const withoutHead = await renderImageData(request.candidate, {
      width,
      height,
      background: request.background ?? 'transparent',
      debug: mergedDebug(request.debug, ablationOptions('without_head'))
    });
    const withoutHand = await renderImageData(request.candidate, {
      width,
      height,
      background: request.background ?? 'transparent',
      debug: mergedDebug(request.debug, ablationOptions('without_hand'))
    });
    const withoutFoot = await renderImageData(request.candidate, {
      width,
      height,
      background: request.background ?? 'transparent',
      debug: mergedDebug(request.debug, ablationOptions('without_foot'))
    });
    const withoutCape = await renderImageData(request.candidate, {
      width,
      height,
      background: request.background ?? 'transparent',
      debug: mergedDebug(request.debug, ablationOptions('without_cape'))
    });
    const withoutDeco = await renderImageData(request.candidate, {
      width,
      height,
      background: request.background ?? 'transparent',
      debug: mergedDebug(request.debug, ablationOptions('without_decorations'))
    });
    contribution = contributionFromAblations({
      head: imageDeltaMagnitude(full.imageData, withoutHead.imageData),
      hand: imageDeltaMagnitude(full.imageData, withoutHand.imageData),
      foot: imageDeltaMagnitude(full.imageData, withoutFoot.imageData),
      cape: imageDeltaMagnitude(full.imageData, withoutCape.imageData),
      deco: imageDeltaMagnitude(full.imageData, withoutDeco.imageData)
    });
  }

  const metrics = computeRenderMetrics(target, candidate.imageData, request.metrics, contribution);
  return {
    ok: true,
    score: compositeScore(metrics, width, height),
    metrics,
    renderMs: elapsedSince(start)
  };
}

async function renderAblation(request: RenderAblationRequest): Promise<RenderAblationResponse> {
  const modes: RenderMode[] = request.modes?.length ? request.modes : ['full'];
  const baseOptions = rendererOptions(request, true);
  const renders: Record<string, string> = {};
  const imageDataByMode = new Map<RenderMode, ImageData>();

  for (const mode of modes) {
    const rendered = await renderImageData(request.payload, {
      ...baseOptions,
      debug: mergedDebug(baseOptions.debug, ablationOptions(mode))
    });
    renders[mode] = stripPngDataUrlPrefix(rendered.dataUrl);
    imageDataByMode.set(mode, rendered.imageData);
    lastCanvasSize = { width: rendered.width, height: rendered.height };
  }

  const full = imageDataByMode.get('full') ?? (await renderImageData(request.payload, baseOptions)).imageData;
  const ablated = async (mode: RenderMode) => {
    const existing = imageDataByMode.get(mode);
    if (existing) return existing;
    const rendered = await renderImageData(request.payload, {
      ...baseOptions,
      debug: mergedDebug(baseOptions.debug, ablationOptions(mode))
    });
    return rendered.imageData;
  };

  const partContribution = contributionFromAblations({
    head: imageDeltaMagnitude(full, await ablated('without_head')),
    hand: imageDeltaMagnitude(full, await ablated('without_hand')),
    foot: imageDeltaMagnitude(full, await ablated('without_foot')),
    cape: imageDeltaMagnitude(full, await ablated('without_cape')),
    deco: imageDeltaMagnitude(full, await ablated('without_decorations'))
  });

  return { ok: true, renders, partContribution };
}

function stableHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getRendererInfo(): RendererInfo {
  return {
    ok: true,
    renderer: 'role-editor-react-rebuild',
    version: 'v1',
    pixiReady: true,
    assetsReady,
    assetManifestHash: stableHash(defaultGafAssetManifest),
    canvasSize: lastCanvasSize,
    renderMode: 'react-pixi-browser-page'
  };
}

const browserRenderer: TwroleBrowserRenderer = {
  ready: false,
  render: renderFullRoleToDataUrl,
  renderRole,
  renderRoleBatch,
  scoreRole,
  renderAblation,
  getRendererInfo
};

window.__TWROLE_RENDER_TO_DATA_URL__ = browserRenderer;
window.twroleBatchRenderer = {
  ready: false,
  render: renderFullRoleToDataUrl
};

async function initializeRenderer(): Promise<void> {
  document.body.style.margin = '0';
  document.body.style.background = 'transparent';
  const textures = [gafSources.actorTexture, gafSources.decorationsTexture, gafSources.assetsTexture].filter(Boolean);
  await Assets.load([...new Set(textures)]);
  assetsReady = true;
  browserRenderer.ready = true;
  if (window.twroleBatchRenderer) window.twroleBatchRenderer.ready = true;
  document.body.dataset.twroleBatchRenderer = 'ready';
  document.body.textContent = 'twrole batch renderer ready';
}

void initializeRenderer().catch((error) => {
  document.body.dataset.twroleBatchRenderer = 'error';
  document.body.textContent = `twrole batch renderer failed: ${errorMessage(error)}`;
  throw error;
});
