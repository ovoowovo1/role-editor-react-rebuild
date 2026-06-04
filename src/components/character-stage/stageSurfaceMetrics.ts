import { useEffect, useState, type MutableRefObject } from 'react';
import { stageSurfaceMetrics } from '../../lib/stage/characterStageHelpers';
import type { StageSceneState } from './types';

interface Size {
  width: number;
  height: number;
}

export function useStageSurfaceMetrics(
  viewportRef: MutableRefObject<HTMLDivElement | null>,
  sceneRef: MutableRefObject<StageSceneState | null>,
  stageScale: number
): { surfaceSize: Size; viewportSize: Size } {
  const [surfaceSize, setSurfaceSize] = useState<Size>({ width: 1, height: 1 });
  const [viewportSize, setViewportSize] = useState<Size>({ width: 1, height: 1 });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSurfaceSize = () => {
      const { viewportSize: nextViewportSize, surfaceSize: nextSurfaceSize } = stageSurfaceMetrics(
        viewport.clientWidth,
        viewport.clientHeight,
        stageScale
      );

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
  }, [stageScale, viewportRef]);

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
  }, [sceneRef, stageScale, surfaceSize.width, surfaceSize.height, viewportRef]);

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
  }, [sceneRef, viewportRef]);

  return { surfaceSize, viewportSize };
}
