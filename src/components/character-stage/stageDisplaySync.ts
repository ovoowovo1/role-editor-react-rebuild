import { useEffect, type MutableRefObject } from 'react';
import type { Application } from 'pixi.js';
import { DEFER_STAGE_SYNC_DECO_COUNT } from '../../constants/stage';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { RoleDocument } from '../../types/role';
import { applyHeadLayerDisplayTransform } from './actorVisuals';
import {
  setDecorationInteractionEnabled,
  syncDecorationDisplayRecords,
  syncDisguiseChildOrder,
  syncSelectionControllerForIds,
  type ActiveDecorationOverlay
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
  selectedIdsRef: MutableRefObject<string[]>;
  sceneRef: MutableRefObject<StageSceneState | null>;
  dragRef: MutableRefObject<DragState | null>;
  brushDrawRef: MutableRefObject<BrushDrawState | null>;
  decoOptions: DisguiseDecoOptions;
  scheduleDeferredStageSync(run: () => void): void;
  cancelDeferredStageSync(): void;
}

function activeDecorationOverlay(drag: DragState | null): ActiveDecorationOverlay | null {
  return drag?.visual.kind === 'overlay'
    ? {
        container: drag.visual.container,
        selectedSet: new Set(drag.selectionIds)
      }
    : null;
}

export function useStageDisplaySync({
  role,
  selectedIds,
  brushFillActive,
  brushFillMask,
  sceneVersion,
  appRef,
  roleRef,
  selectedIdsRef,
  sceneRef,
  dragRef,
  brushDrawRef,
  decoOptions,
  scheduleDeferredStageSync,
  cancelDeferredStageSync
}: StageDisplaySyncOptions): void {
  // Interaction is independent from role and selection updates. Running this
  // first also means displays created in the same commit inherit the right mode.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    setDecorationInteractionEnabled(scene, !brushFillActive && !dragRef.current);
    const canvas = appRef.current?.view as HTMLCanvasElement | undefined;
    if (canvas) canvas.style.cursor = brushFillActive ? 'crosshair' : '';
  }, [appRef, brushFillActive, dragRef, sceneRef, sceneVersion]);

  useEffect(() => {
    const syncDisplays = (repairDependentPaths: boolean) => {
      const currentScene = sceneRef.current;
      if (!currentScene) return;
      const activeDrag = dragRef.current;
      const activeOverlay = activeDecorationOverlay(activeDrag);
      const currentRole = roleRef.current;
      applyHeadLayerDisplayTransform(currentScene.headLayerClip, currentRole);
      syncDecorationDisplayRecords(currentScene, currentRole, decoOptions, activeOverlay);

      // Selection/order effects may have run before a deferred display update.
      // Repair them from current refs without turning ordinary selection changes
      // back into a full decoration scan.
      if (repairDependentPaths) {
        syncSelectionControllerForIds(
          currentScene,
          selectedIdsRef.current,
          Boolean(activeDrag)
        );
        syncDisguiseChildOrder(
          currentScene,
          currentRole,
          activeOverlay?.container,
          activeOverlay?.selectedSet
        );
      }
    };

    if (role.decorations.length >= DEFER_STAGE_SYNC_DECO_COUNT) {
      scheduleDeferredStageSync(() => syncDisplays(true));
      return () => cancelDeferredStageSync();
    }

    cancelDeferredStageSync();
    syncDisplays(false);
  }, [
    cancelDeferredStageSync,
    decoOptions,
    dragRef,
    role.decorations,
    role.headLayer,
    role.partFrames?.head,
    role.partScales?.head,
    role.parts.head,
    roleRef,
    sceneRef,
    scheduleDeferredStageSync,
    selectedIdsRef
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    syncSelectionControllerForIds(scene, selectedIds, Boolean(dragRef.current));
  }, [dragRef, role.decorations, sceneRef, sceneVersion, selectedIds]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || brushDrawRef.current) return;
    drawBrushFillOverlay(scene, brushFillMask);
  }, [brushDrawRef, brushFillMask, sceneRef, sceneVersion]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const activeOverlay = activeDecorationOverlay(dragRef.current);
    syncDisguiseChildOrder(
      scene,
      role,
      activeOverlay?.container,
      activeOverlay?.selectedSet
    );
  }, [dragRef, role.decorations, role.headLayerIndex, sceneRef, sceneVersion]);
}
