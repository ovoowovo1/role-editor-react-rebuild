import { useRef, useState } from 'react';
import type { BrushFillMask } from '../lib/conversion/brushFillToDeco';
import { actorSceneKey } from '../lib/stage/characterStageHelpers';
import type { RoleDocument } from '../types/role';
import {
  useBodyAnimationPlayback,
  useDeferredStageSync,
  usePixiApplicationLifecycle,
  useStageDisplaySync,
  useStageSurfaceMetrics,
  useStageTransform
} from './character-stage/stageEffects';
import { useStageRuntimeController } from './character-stage/stageRuntimeController';
import { useStageSceneLifecycle } from './character-stage/stageSceneLifecycle';
import { StageViewport } from './character-stage/StageViewport';

interface CharacterStageProps {
  role: RoleDocument;
  selectedIds: string[];
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  bodyAnimationRestartKey: number;
  stageScale: number;
  facingQuarterTurns: number;
  onCommitDrag(selectionIds: readonly string[], dx: number, dy: number): void;
  onClearSelection(): void;
  brushFillActive?: boolean;
  brushFillBrushSize?: number;
  brushFillMask?: BrushFillMask;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
}

export function CharacterStage({
  role,
  selectedIds,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  bodyAnimationRestartKey,
  stageScale,
  facingQuarterTurns,
  onCommitDrag,
  onClearSelection,
  brushFillActive = false,
  brushFillBrushSize = 18,
  brushFillMask = { points: [] },
  onBrushFillMaskChange
}: CharacterStageProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageBgRef = useRef<HTMLDivElement | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const sceneKey = actorSceneKey(role);
  const { scheduleDeferredStageSync, cancelDeferredStageSync } = useDeferredStageSync();
  const stageRuntime = useStageRuntimeController({
    role,
    selectedIds,
    stageScale,
    facingQuarterTurns,
    bodyAnimationLabel,
    brushFillActive,
    brushFillBrushSize,
    brushFillMask,
    onCommitDrag,
    onClearSelection,
    onBrushFillMaskChange
  });
  const { surfaceSize, viewportSize } = useStageSurfaceMetrics(
    viewportRef,
    stageRuntime.sceneRef,
    stageScale
  );

  usePixiApplicationLifecycle({
    hostRef,
    appRef: stageRuntime.appRef,
    sceneRef: stageRuntime.sceneRef,
    stageTeardownRef: stageRuntime.stageTeardownRef,
    cancelDeferredStageSync
  });

  useStageSceneLifecycle({
    appRef: stageRuntime.appRef,
    roleRef: stageRuntime.roleRef,
    selectedIdsRef: stageRuntime.selectedIdsRef,
    brushFillRef: stageRuntime.brushFillRef,
    dragRef: stageRuntime.dragRef,
    sceneRef: stageRuntime.sceneRef,
    stageRuntimeRefs: stageRuntime.stageRuntimeRefs,
    stageBuildGenerationRef: stageRuntime.stageBuildGenerationRef,
    stageTeardownRef: stageRuntime.stageTeardownRef,
    sceneBuildConfigRef: stageRuntime.sceneBuildConfigRef,
    hostRef,
    stageBgRef,
    decoOptions: stageRuntime.decoOptions,
    sceneKey,
    cancelDeferredStageSync,
    setSceneVersion
  });

  useStageDisplaySync({
    role,
    selectedIds,
    brushFillActive,
    brushFillMask,
    sceneVersion,
    appRef: stageRuntime.appRef,
    roleRef: stageRuntime.roleRef,
    selectedIdsRef: stageRuntime.selectedIdsRef,
    sceneRef: stageRuntime.sceneRef,
    dragRef: stageRuntime.dragRef,
    brushDrawRef: stageRuntime.brushDrawRef,
    decoOptions: stageRuntime.decoOptions,
    scheduleDeferredStageSync,
    cancelDeferredStageSync
  });

  useBodyAnimationPlayback({
    sceneRef: stageRuntime.sceneRef,
    lastPlaybackResetRef: stageRuntime.lastPlaybackResetRef,
    sceneVersion,
    bodyAnimationLabel,
    bodyAnimationPlaying,
    bodyAnimationRestartKey
  });
  useStageTransform(stageRuntime.sceneRef, stageScale, facingQuarterTurns);

  return (
    <StageViewport
      viewportRef={viewportRef}
      hostRef={hostRef}
      stageBgRef={stageBgRef}
      surfaceSize={surfaceSize}
      viewportSize={viewportSize}
      stageScale={stageScale}
    />
  );
}
