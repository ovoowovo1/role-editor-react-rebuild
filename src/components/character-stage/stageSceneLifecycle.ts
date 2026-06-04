import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { gafSources } from '../../mock/gafManifest';
import { collectAtlasTextureUrlsForRole, partitionAtlasTextureUrls } from '../../lib/runtime/atlasTextureAvailability';
import { applyHeadLayerDisplayTransform } from './actorVisuals';
import { drawBrushFillOverlay } from './stageOverlayVisuals';
import { syncDecorationDisplays } from './sceneSync';
import { createStagePointerHandlers } from './stageInteractions';
import { buildStageScene } from './stageSceneBuilder';
import type {
  BrushFillState,
  DisguiseDecoOptions,
  DragState,
  StageRuntimeRefs,
  StageSceneState
} from './types';
import type { RoleDocument } from '../../types/role';

export function useStageSceneLifecycle({
  appRef,
  hostRef,
  stageBgRef,
  roleRef,
  selectedIdsRef,
  brushFillRef,
  dragRef,
  sceneRef,
  stageRuntimeRefs,
  stageBuildGenerationRef,
  stageTeardownRef,
  beginDecorationDragRef,
  sceneKey,
  stageScale,
  facingQuarterTurns,
  bodyAnimationLabel,
  cancelDeferredStageSync,
  setSceneVersion
}: {
  appRef: MutableRefObject<Application | null>;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  stageBgRef: MutableRefObject<HTMLDivElement | null>;
  roleRef: MutableRefObject<RoleDocument>;
  selectedIdsRef: MutableRefObject<string[]>;
  brushFillRef: MutableRefObject<BrushFillState>;
  dragRef: MutableRefObject<DragState | null>;
  sceneRef: MutableRefObject<StageSceneState | null>;
  stageRuntimeRefs: StageRuntimeRefs;
  stageBuildGenerationRef: MutableRefObject<number>;
  stageTeardownRef: MutableRefObject<(() => void) | null>;
  beginDecorationDragRef: MutableRefObject<(id: string, event: FederatedPointerEvent, root: Container) => void>;
  sceneKey: string;
  stageScale: number;
  facingQuarterTurns: number;
  bodyAnimationLabel: string;
  cancelDeferredStageSync(): void;
  setSceneVersion: Dispatch<SetStateAction<number>>;
}) {
  useEffect(() => {
    const app = appRef.current;
    const host = hostRef.current;
    const stage = app?.stage;
    if (!app || !host || !stage) return;

    const buildId = ++stageBuildGenerationRef.current;
    let cancelled = false;
    const buildRole = roleRef.current;
    const urls = collectAtlasTextureUrlsForRole(buildRole);
    urls.push(gafSources.assetsTexture);

    partitionAtlasTextureUrls(urls).then(({ failed: failedTextures }) => {
      if (cancelled || buildId !== stageBuildGenerationRef.current) return;

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
          beginDecorationDragRef.current(targetId, event, currentScene.disguiseRoot);
        }
      });
      sceneRef.current = scene;
      setSceneVersion((version) => version + 1);

      const decoOptions: DisguiseDecoOptions = {
        onPointerDown: (id, _event, root) => {
          beginDecorationDragRef.current(id, _event, root);
        }
      };

      const currentRole = roleRef.current;
      applyHeadLayerDisplayTransform(scene.headLayerClip, currentRole);
      drawBrushFillOverlay(scene, brushFillRef.current.mask);
      syncDecorationDisplays(scene, currentRole, selectedIdsRef.current, decoOptions);

      scene.updatePosition();
      const rafId = requestAnimationFrame(scene.updatePosition);

      const positionObserver = new ResizeObserver(scene.updatePosition);
      positionObserver.observe(host);
      if (stageBgRef.current) {
        positionObserver.observe(stageBgRef.current);
      }

      const { handleBrushDown, handleMove, handleUp } = createStagePointerHandlers(stageRuntimeRefs);

      stage.on('pointerdown', handleBrushDown);
      stage.on('pointermove', handleMove);
      stage.on('pointerup', handleUp);
      stage.on('pointerupoutside', handleUp);

      stageTeardownRef.current = () => {
        dragRef.current = null;
        cancelAnimationFrame(rafId);
        positionObserver.disconnect();
        if (stage.destroyed) return;
        stage.off('pointerdown', handleBrushDown);
        stage.off('pointermove', handleMove);
        stage.off('pointerup', handleUp);
        stage.off('pointerupoutside', handleUp);
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
  }, [sceneKey]); // eslint-disable-line react-hooks/exhaustive-deps
}
