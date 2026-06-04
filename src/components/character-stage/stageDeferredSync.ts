import { useCallback, useEffect, useRef } from 'react';

type DeferredStageSync = { type: 'idle' | 'raf'; id: number };

export function useDeferredStageSync(): {
  scheduleDeferredStageSync(run: () => void): void;
  cancelDeferredStageSync(): void;
} {
  const deferredStageSyncRef = useRef<DeferredStageSync | null>(null);

  const cancelDeferredStageSync = useCallback(() => {
    const pending = deferredStageSyncRef.current;
    if (!pending) return;
    if (pending.type === 'idle' && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(pending.id);
    } else {
      cancelAnimationFrame(pending.id);
    }
    deferredStageSyncRef.current = null;
  }, []);

  const scheduleDeferredStageSync = useCallback((run: () => void) => {
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
  }, [cancelDeferredStageSync]);

  useEffect(() => cancelDeferredStageSync, [cancelDeferredStageSync]);

  return { scheduleDeferredStageSync, cancelDeferredStageSync };
}
