import { useEffect, type MutableRefObject } from 'react';
import type { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { DEFER_STAGE_SYNC_DECO_COUNT } from '../../constants/stage';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { RoleDocument } from '../../types/role';
import { applyHeadLayerDisplayTransform } from './actorVisuals';
import { syncDecorationDisplays, syncDisguiseChildOrder } from './sceneSync';
import { drawBrushFillOverlay } from './stageOverlayVisuals';
import type { BrushDrawState, DisguiseDecoOptions, DragState, StageSceneState } from './types';

interface StageDisplaySyncOptions {
  role: RoleDocument;
  selectedIds: string[];
  brushFillActive: boolean;
  brushFillMask: BrushFillMask;
  sceneVersion: number;
  appRef: MutableRefObject<Application | null>;
  roleRef: MutableRefObject<RoleDocument>;
  sceneRef: MutableRefObject<StageSceneState | null>;
  dragRef: MutableRefObject<DragState | null>;
  brushDrawRef: MutableRefObject<BrushDrawState | null>;
  beginDecorationDragRef: MutableRefObject<(id: string, event: FederatedPointerEvent, root: Container) => void>;
  scheduleDeferredStageSync(run: () => void): void;
  cancelDeferredStageSync(): void;
}

export function useStageDisplaySync({
  role,
  selectedIds,
  brushFillActive,
  brushFillMask,
  sceneVersion,
  appRef,
  roleRef,
  sceneRef,
  dragRef,
  brushDrawRef,
  beginDecorationDragRef,
  scheduleDeferredStageSync,
  cancelDeferredStageSync
}: StageDisplaySyncOptions): void {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const decoOptions: DisguiseDecoOptions = {
      onPointerDown: (id, event, root) => {
        beginDecorationDragRef.current(id, event, root);
      }
    };

    const syncStage = () => {
      const currentScene = sceneRef.current;
      if (!currentScene) return;
      const activeOverlay = dragRef.current?.overlay
        ? {
            container: dragRef.current.overlay.container,
            selectedSet: new Set(dragRef.current.overlay.items.map((item) => item.id))
          }
        : null;
      applyHeadLayerDisplayTransform(currentScene.headLayerClip, role);
      syncDecorationDisplays(currentScene, role, selectedIds, decoOptions, activeOverlay);
    };

    if (role.decorations.length >= DEFER_STAGE_SYNC_DECO_COUNT) {
      scheduleDeferredStageSync(syncStage);
      return () => cancelDeferredStageSync();
    }

    cancelDeferredStageSync();
    syncStage();
  }, [
    beginDecorationDragRef,
    cancelDeferredStageSync,
    dragRef,
    role,
    sceneRef,
    scheduleDeferredStageSync,
    selectedIds
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!brushDrawRef.current) {
      drawBrushFillOverlay(scene, brushFillMask);
    }
    syncDisguiseChildOrder(scene, roleRef.current);
    const canvas = appRef.current?.view as HTMLCanvasElement | undefined;
    if (canvas) {
      canvas.style.cursor = brushFillActive ? 'crosshair' : '';
    }
  }, [appRef, brushDrawRef, brushFillActive, brushFillMask, roleRef, sceneRef, sceneVersion]);
}
