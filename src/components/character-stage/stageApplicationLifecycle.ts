import { useEffect, type MutableRefObject } from 'react';
import { Application } from 'pixi.js';
import { stageRendererResolution } from '../../lib/stage/characterStageHelpers';
import type { StageSceneState } from './types';

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
