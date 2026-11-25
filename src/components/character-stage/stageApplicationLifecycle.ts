import { useEffect, type MutableRefObject } from 'react';
import { Application, Texture } from 'pixi.js';
import { stageRendererResolution } from '../../lib/stage/characterStageHelpers';
import type { StageSceneState } from './types';

const pendingStageRenderRaf = new WeakMap<Application, number>();

export function cancelStageRender(app: Application | null | undefined): void {
  if (!app) return;
  const rafId = pendingStageRenderRaf.get(app);
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId);
    pendingStageRenderRaf.delete(app);
  }
}

/**
 * Coalesce multiple scene/selection/transform updates within the same frame
 * into a single imperative Pixi render, avoiding idle 60fps ticker burn.
 */
export function requestStageRender(app: Application | null | undefined): void {
  if (!app || app.stage?.destroyed) return;
  if (pendingStageRenderRaf.has(app)) return;
  const rafId = requestAnimationFrame(() => {
    pendingStageRenderRaf.delete(app);
    if (!app.stage?.destroyed) {
      app.render();
    }
  });
  pendingStageRenderRaf.set(app, rafId);
}

export function ensureRenderWhenTexturesLoad(
  app: Application | null | undefined,
  urls: readonly string[]
): () => void {
  if (!app || app.stage?.destroyed || !urls.length) return () => {};
  const cleanups: Array<() => void> = [];
  for (const url of new Set(urls)) {
    if (!url) continue;
    const baseTexture = Texture.from(url).baseTexture;
    if (baseTexture.valid) continue;
    const onReady = () => requestStageRender(app);
    baseTexture.once('loaded', onReady);
    baseTexture.once('update', onReady);
    cleanups.push(() => {
      baseTexture.off('loaded', onReady);
      baseTexture.off('update', onReady);
    });
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

export function usePixiApplicationLifecycle({
  hostRef,
  appRef,
  sceneRef,
  stageTeardownRef,
  cancelDeferredStageSync
}: {
  hostRef: MutableRefObject<HTMLDivElement | null>;
  appRef: MutableRefObject<Application | null>;
  sceneRef: MutableRefObject<StageSceneState | null>;
  stageTeardownRef: MutableRefObject<(() => void) | null>;
  cancelDeferredStageSync(): void;
}): void {
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application({
      antialias: true,
      autoStart: false,
      backgroundAlpha: 0,
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      resolution: stageRendererResolution(window.devicePixelRatio || 1),
      autoDensity: true
    });
    appRef.current = app;

    const canvas = app.view as HTMLCanvasElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    host.appendChild(canvas);

    let resizeRafId = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    const resizeRenderer = () => {
      resizeRafId = 0;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      app.renderer.resize(width, height);
      app.stage.hitArea = app.screen;
      app.render();
    };
    const scheduleRendererResize = () => {
      if (!resizeRafId) resizeRafId = requestAnimationFrame(resizeRenderer);
    };

    resizeRenderer();
    const resizeObserver = new ResizeObserver(scheduleRendererResize);
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      cancelStageRender(app);
      cancelDeferredStageSync();
      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
      sceneRef.current = null;
      if (appRef.current === app) {
        appRef.current = null;
      }
      if (!app.stage?.destroyed) {
        app.destroy(true, { children: true, texture: false });
      }
    };
  }, [appRef, cancelDeferredStageSync, hostRef, sceneRef, stageTeardownRef]);
}
