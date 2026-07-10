import { useEffect, type MutableRefObject } from 'react';
import type { Application } from 'pixi.js';
import { DEFER_STAGE_SYNC_DECO_COUNT } from '../../constants/stage';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { RoleDocument } from '../../types/role';
import { applyHeadLayerDisplayTransform } from './actorVisuals';
import {
  setDecorationInteractionEnabled,
  syncDecorationDisplays,
  syncDisguiseChildOrder
} from './sceneSync';
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
  decoOptions: DisguiseDecoOptions;
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
  decoOptions,
  scheduleDeferredStageSync,
  cancelDeferredStageSync
}: StageDisplaySyncOptions): void {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const syncStage = () => {
      const currentScene = sceneRef.current;
      if (!currentScene) return;
      const activeDrag = dragRef.current;
      const activeOverlay = activeDrag?.visual.kind === 'overlay'
        ? {
            container: activeDrag.visual.container,
            selectedSet: new Set(activeDrag.selectionIds)
          }
        : null;
      applyHeadLayerDisplayTransform(currentScene.headLayerClip, role);
      syncDecorationDisplays(
        currentScene,
        role,
        selectedIds,
        decoOptions,
        activeOverlay,
        Boolean(activeDrag) || brushFillActive,
        !brushFillActive && !activeDrag
      );
    };

    if (role.decorations.length >= DEFER_STAGE_SYNC_DECO_COUNT) {
      scheduleDeferredStageSync(syncStage);
      return () => cancelDeferredStageSync();
    }

    cancelDeferredStageSync();
    syncStage();
  }, [
    decoOptions,
    brushFillActive,
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
    setDecorationInteractionEnabled(
      scene,
      !brushFillActive && !dragRef.current
    );
    syncDisguiseChildOrder(scene, roleRef.current);
    const canvas = appRef.current?.view as HTMLCanvasElement | undefined;
    if (canvas) {
      canvas.style.cursor = brushFillActive ? 'crosshair' : '';
    }
  }, [appRef, brushDrawRef, brushFillActive, brushFillMask, dragRef, roleRef, sceneRef, sceneVersion]);
}
