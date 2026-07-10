import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { Application } from 'pixi.js';
import { gafSources } from '../../mock/gafManifest';
import {
  collectAtlasTextureUrlsForRole,
  partitionAtlasTextureUrls
} from '../../lib/runtime/atlasTextureAvailability';
import type { RoleDocument } from '../../types/role';
import { applyHeadLayerDisplayTransform } from './actorVisuals';
import { syncDecorationDisplays } from './sceneSync';
import { createStagePointerHandlers } from './stageInteractions';
import { drawBrushFillOverlay } from './stageOverlayVisuals';
import { buildStageScene } from './stageSceneBuilder';
import type {
  BrushFillState,
  DisguiseDecoOptions,
  DragState,
  StageRuntimeRefs,
  StageSceneBuildConfig,
  StageSceneState
} from './types';

export function useStageSceneLifecycle({
  appRef,
  roleRef,
  selectedIdsRef,
  brushFillRef,
  dragRef,
  sceneRef,
  stageRuntimeRefs,
  stageBuildGenerationRef,
  stageTeardownRef,
  sceneBuildConfigRef,
  hostRef,
  stageBgRef,
  decoOptions,
  sceneKey,
  cancelDeferredStageSync,
  setSceneVersion
}: {
  appRef: MutableRefObject<Application | null>;
  roleRef: MutableRefObject<RoleDocument>;
  selectedIdsRef: MutableRefObject<string[]>;
  brushFillRef: MutableRefObject<BrushFillState>;
  dragRef: MutableRefObject<DragState | null>;
  sceneRef: MutableRefObject<StageSceneState | null>;
  stageRuntimeRefs: StageRuntimeRefs;
  stageBuildGenerationRef: MutableRefObject<number>;
  stageTeardownRef: MutableRefObject<(() => void) | null>;
  sceneBuildConfigRef: MutableRefObject<StageSceneBuildConfig>;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  stageBgRef: MutableRefObject<HTMLDivElement | null>;
  decoOptions: DisguiseDecoOptions;
  sceneKey: string;
  cancelDeferredStageSync(): void;
  setSceneVersion: Dispatch<SetStateAction<number>>;
}): void {
  useEffect(() => {
    const app = appRef.current;
    const stage = app?.stage;
    if (!app || !stage) return;

    const buildId = ++stageBuildGenerationRef.current;
    let cancelled = false;
    const buildRole = roleRef.current;
    const urls = collectAtlasTextureUrlsForRole(buildRole);
    urls.push(gafSources.assetsTexture);

    partitionAtlasTextureUrls(urls).then(({ failed: failedTextures }) => {
      if (cancelled || buildId !== stageBuildGenerationRef.current) return;
      const { stageScale, facingQuarterTurns, bodyAnimationLabel } = sceneBuildConfigRef.current;

      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
      sceneRef.current = null;

      const scene = buildStageScene({
        stage,
        hitArea: app.screen,
        hostRef,
        stageBgRef,
        role: buildRole,
        failedTextures,
        stageScale,
        facingQuarterTurns,
        bodyAnimationLabel,
        onSelectionDragPointerDown: (event, currentScene) => {
          const targetId = currentScene.selectionDragTargetId;
          if (!targetId) return;
          decoOptions.onPointerDown(
            targetId,
            { x: event.global.x, y: event.global.y },
            currentScene.disguiseRoot
          );
        }
      });
      sceneRef.current = scene;
      setSceneVersion((version) => version + 1);

      const currentRole = roleRef.current;
      applyHeadLayerDisplayTransform(scene.headLayerClip, currentRole);
      drawBrushFillOverlay(scene, brushFillRef.current.mask);
      syncDecorationDisplays(
        scene,
        currentRole,
        selectedIdsRef.current,
        decoOptions,
        null,
        false,
        !brushFillRef.current.active
      );
      scene.updatePosition();

      const pointerHandlers = createStagePointerHandlers(stageRuntimeRefs);
      stage.on('pointerdown', pointerHandlers.handlePointerDown);
      stage.on('pointermove', pointerHandlers.handleMove);
      stage.on('pointerup', pointerHandlers.handleUp);
      stage.on('pointerupoutside', pointerHandlers.handleUpOutside);
      stage.on('pointercancel', pointerHandlers.handleUpOutside);

      stageTeardownRef.current = () => {
        pointerHandlers.dispose();
        dragRef.current = null;
        stageRuntimeRefs.brushDrawRef.current = null;
        if (stage.destroyed) return;
        stage.off('pointerdown', pointerHandlers.handlePointerDown);
        stage.off('pointermove', pointerHandlers.handleMove);
        stage.off('pointerup', pointerHandlers.handleUp);
        stage.off('pointerupoutside', pointerHandlers.handleUpOutside);
        stage.off('pointercancel', pointerHandlers.handleUpOutside);
        for (const child of stage.removeChildren()) {
          if (!child.destroyed) child.destroy({ children: true });
        }
        scene.decoDisplays.clear();
        scene.lastDisguiseChildOrder = [];
        if (sceneRef.current === scene) {
          sceneRef.current = null;
        }
      };
    });

    return () => {
      cancelled = true;
      cancelDeferredStageSync();
      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
    };
  }, [
    appRef,
    brushFillRef,
    cancelDeferredStageSync,
    decoOptions,
    dragRef,
    roleRef,
    sceneBuildConfigRef,
    sceneKey,
    sceneRef,
    selectedIdsRef,
    setSceneVersion,
    stageBuildGenerationRef,
    stageRuntimeRefs,
    stageTeardownRef,
    hostRef,
    stageBgRef
  ]);
}
