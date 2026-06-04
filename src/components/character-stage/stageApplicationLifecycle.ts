import { useEffect, type MutableRefObject } from 'react';
import { Application } from 'pixi.js';
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
}) {
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
  }, [appRef, cancelDeferredStageSync, hostRef, sceneRef, stageTeardownRef]);
}
