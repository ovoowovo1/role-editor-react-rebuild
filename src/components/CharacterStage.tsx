import { useRef, useState } from 'react';
import type { BrushFillMask } from '../lib/conversion/brushFillToDeco';
import { actorSceneKey } from '../lib/stage/characterStageHelpers';
import type { RoleDocument } from '../types/role';
import type { ReferenceImageLayer } from '../types/referenceImage';
import type { PinOutlineState } from '../types/pinOutline';
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
  selectedReferenceImageId: string | null;
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  bodyAnimationRestartKey: number;
  stageScale: number;
  facingQuarterTurns: number;
  onCommitDrag(selectionIds: readonly string[], dx: number, dy: number): void;
  referenceImages: ReferenceImageLayer[];
  layerOrder: string[];
  onCommitReferenceImageDrag(id: string, dx: number, dy: number): void;
  pinOutline: PinOutlineState;
  onPinAdd(x: number, y: number): void;
  onPinMove(id: string, x: number, y: number): void;
  onClearSelection(): void;
  brushFillActive?: boolean;
  brushFillBrushSize?: number;
  brushFillMask?: BrushFillMask;
  headGlowAlwaysOn?: boolean;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
}

export function CharacterStage({
  role,
  selectedIds,
  selectedReferenceImageId,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  bodyAnimationRestartKey,
  stageScale,
  facingQuarterTurns,
  onCommitDrag,
  referenceImages,
  layerOrder,
  onCommitReferenceImageDrag,
  pinOutline,
  onPinAdd,
  onPinMove,
  onClearSelection,
  brushFillActive = false,
  brushFillBrushSize = 18,
  brushFillMask = { points: [] },
  headGlowAlwaysOn = false,
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
    selectedReferenceImageId,
    stageScale,
    facingQuarterTurns,
    bodyAnimationLabel,
    brushFillActive,
    brushFillBrushSize,
    brushFillMask,
    headGlowAlwaysOn,
    referenceImages,
    layerOrder,
    pinOutline,
    onCommitDrag,
    onCommitReferenceImageDrag,
    onPinAdd,
    onPinMove,
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
    headGlowAlwaysOnRef: stageRuntime.headGlowAlwaysOnRef,
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
    referenceImageOptions: stageRuntime.referenceImageOptions,
    sceneKey,
    cancelDeferredStageSync,
    setSceneVersion
  });

  useStageDisplaySync({
    role,
    selectedIds,
    brushFillActive,
    brushFillMask,
    pinOutline,
    pinOutlineRef: stageRuntime.pinOutlineRef,
    pinOutlineOptions: stageRuntime.pinOutlineOptions,
    sceneVersion,
    appRef: stageRuntime.appRef,
    roleRef: stageRuntime.roleRef,
    selectedIdsRef: stageRuntime.selectedIdsRef,
    sceneRef: stageRuntime.sceneRef,
    dragRef: stageRuntime.dragRef,
    brushDrawRef: stageRuntime.brushDrawRef,
    headGlowAlwaysOn,
    referenceImages,
    layerOrder,
    referenceImageOptions: stageRuntime.referenceImageOptions,
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
