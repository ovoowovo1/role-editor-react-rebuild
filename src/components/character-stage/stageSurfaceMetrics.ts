import {
  useEffect,
  useLayoutEffect,
  useState,
  type MutableRefObject
} from 'react';
import { stageSurfaceMetrics } from '../../lib/stage/characterStageHelpers';
import type { StageSceneState } from './types';

interface Size {
  width: number;
  height: number;
}

interface StageSurfaceState {
  surfaceSize: Size;
  viewportSize: Size;
}

export function useStageSurfaceMetrics(
  viewportRef: MutableRefObject<HTMLDivElement | null>,
  sceneRef: MutableRefObject<StageSceneState | null>,
  stageScale: number
): StageSurfaceState {
  const [surfaceSize, setSurfaceSize] = useState<Size>({ width: 1, height: 1 });
  const [viewportSize, setViewportSize] = useState<Size>({ width: 1, height: 1 });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSurfaceSize = () => {
      const metrics = stageSurfaceMetrics(
        viewport.clientWidth,
        viewport.clientHeight,
        stageScale
      );

      sceneRef.current?.updatePosition();

      setViewportSize((current) => {
        if (
          current.width === metrics.viewportSize.width &&
          current.height === metrics.viewportSize.height
        ) {
          return current;
        }
        return metrics.viewportSize;
      });

      setSurfaceSize((current) => {
        if (
          current.width === metrics.surfaceSize.width &&
          current.height === metrics.surfaceSize.height
        ) {
          return current;
        }
        return metrics.surfaceSize;
      });
    };

    updateSurfaceSize();
    const resizeObserver = new ResizeObserver(updateSurfaceSize);
    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [sceneRef, stageScale, viewportRef]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const scrollLeft = Math.max(0, (surfaceSize.width - viewport.clientWidth) / 2);
    const scrollTop = Math.max(0, (surfaceSize.height - viewport.clientHeight) / 2);
    viewport.scrollLeft = scrollLeft;
    viewport.scrollTop = scrollTop;
    sceneRef.current?.updatePosition();
  }, [sceneRef, stageScale, surfaceSize.height, surfaceSize.width, viewportRef]);

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
