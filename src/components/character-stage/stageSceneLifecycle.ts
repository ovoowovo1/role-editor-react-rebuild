import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { Application } from 'pixi.js';
import { DEFAULT_ACTOR_BODY_ANIMATION_LABEL } from '../../lib/runtime/actorBodyAnimation';
import { weaponAtlasNeedsLoad } from '../../lib/runtime/weaponAtlasAvailability';
import {
  collectAtlasTextureUrlsForRole,
  partitionAtlasTextureUrls
} from '../../lib/runtime/atlasTextureAvailability';
import type { RoleDocument } from '../../types/role';
import { applyHeadLayerDisplayTransform } from './actorVisuals';
import {
  setDecorationInteractionEnabled,
  syncDecorationDisplayRecords,
  syncReferenceImages,
  syncDisguiseChildOrder,
  syncSelectionControllerForIds
} from './sceneSync';
import { createStagePointerHandlers } from './stageInteractions';
import { ensureRenderWhenTexturesLoad, requestStageRender } from './stageApplicationLifecycle';
import { gafSources } from '../../mock/gafManifest';
import { destroyReferenceImageDisplay } from './referenceImageVisuals';
import { drawBrushFillOverlay } from './stageOverlayVisuals';
import { buildStageScene } from './stageSceneBuilder';
import type {
  BrushFillState,
  DisguiseDecoOptions,
  DragState,
  ReferenceImageOptions,
  StageRuntimeRefs,
  StageSceneBuildConfig,
  StageSceneState
} from './types';

export function useStageSceneLifecycle({
  appRef,
  roleRef,
  selectedIdsRef,
  headGlowAlwaysOnRef,
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
  referenceImageOptions,
  sceneKey,
  cancelDeferredStageSync,
  setSceneVersion
}: {
  appRef: MutableRefObject<Application | null>;
  roleRef: MutableRefObject<RoleDocument>;
  selectedIdsRef: MutableRefObject<string[]>;
  headGlowAlwaysOnRef: MutableRefObject<boolean>;
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
  referenceImageOptions: ReferenceImageOptions;
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
        // Render the current role immediately if a newly selected weapon
        // still needs its optional atlas; playback applies the label when ready.
        bodyAnimationLabel: weaponAtlasNeedsLoad(bodyAnimationLabel)
          ? DEFAULT_ACTOR_BODY_ANIMATION_LABEL
          : bodyAnimationLabel,
        onSelectionDragPointerDown: (event, currentScene) => {
          const targetId = currentScene.selectionDragTargetId;
          if (!targetId) return;
          decoOptions.onPointerDown(
            targetId,
            { x: event.global.x, y: event.global.y },
            currentScene.disguiseRoot
          );
        },
        onPositionUpdated: () => requestStageRender(app)
      });
      sceneRef.current = scene;
      setSceneVersion((version) => version + 1);

      const currentRole = roleRef.current;
      applyHeadLayerDisplayTransform(scene.headLayerClip, currentRole);
      drawBrushFillOverlay(scene, brushFillRef.current.mask);
      setDecorationInteractionEnabled(scene, !brushFillRef.current.active);
      syncDecorationDisplayRecords(scene, currentRole, decoOptions);
      if (stageRuntimeRefs.referenceImagesRef) {
        syncReferenceImages(
          scene,
          stageRuntimeRefs.referenceImagesRef.current,
          referenceImageOptions
        );
      }
      syncSelectionControllerForIds(
        scene,
        selectedIdsRef.current,
        false,
        headGlowAlwaysOnRef.current
      );
      syncDisguiseChildOrder(scene, currentRole, stageRuntimeRefs.layerOrderRef?.current);
      scene.updatePosition();
      const cleanupTextureListeners = ensureRenderWhenTexturesLoad(app, [
        ...urls,
        gafSources.actorTexture,
        gafSources.decorationsTexture
      ]);
      requestStageRender(app);

      const pointerHandlers = createStagePointerHandlers(stageRuntimeRefs, () => requestStageRender(app));
      stage.on('pointerdown', pointerHandlers.handlePointerDown);
      stage.on('pointermove', pointerHandlers.handleMove);
      stage.on('pointerup', pointerHandlers.handleUp);
      stage.on('pointerupoutside', pointerHandlers.handleUpOutside);
      stage.on('pointercancel', pointerHandlers.handleUpOutside);

      stageTeardownRef.current = () => {
        cleanupTextureListeners();
        pointerHandlers.dispose();
        dragRef.current = null;
        stageRuntimeRefs.brushDrawRef.current = null;
        for (const record of scene.referenceImageDisplays.values()) {
          destroyReferenceImageDisplay(record);
        }
        scene.referenceImageDisplays.clear();
        scene.referenceImagesById.clear();
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
        scene.decorationsById.clear();
        scene.selectionDragVisualsById.clear();
        scene.selectionDragVisualDisplayKeysById.clear();
        if (!scene.referenceImagesOverlay.destroyed) scene.referenceImagesOverlay.destroy({ children: true });
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
    referenceImageOptions,
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
