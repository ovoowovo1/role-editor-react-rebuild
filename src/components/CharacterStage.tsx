import { useRef, useState } from 'react';
import { t } from '../i18n';
import type { DecorationLayer, RoleDocument } from '../types/role';
import type { BrushFillMask } from '../lib/conversion/brushFillToDeco';
import { actorSceneKey } from '../lib/stage/characterStageHelpers';
import {
  useBodyAnimationPlayback,
  useStageDisplaySync,
  useDeferredStageSync,
  usePixiApplicationLifecycle,
  useStageSurfaceMetrics,
  useStageTransform,
  useStageRuntimeRefSync
} from './character-stage/stageEffects';
import { useStageRuntimeController } from './character-stage/stageRuntimeController';
import { useStageSceneLifecycle } from './character-stage/stageSceneLifecycle';

interface CharacterStageProps {
  role: RoleDocument;
  selectedIds: string[];
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  bodyAnimationRestartKey: number;
  stageScale: number;
  facingQuarterTurns: number;
  onUpdateDecoration(id: string, patch: Partial<DecorationLayer>, commit?: boolean): void;
  onApplyDragDelta(dx: number, dy: number): void;
  onCommitDragDelta(dx: number, dy: number): void;
  onBeginTransient(): void;
  onCommitTransient(): void;
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
  onUpdateDecoration,
  onApplyDragDelta,
  onCommitDragDelta,
  onBeginTransient,
  onCommitTransient,
  brushFillActive = false,
  brushFillBrushSize = 18,
  brushFillMask = { points: [] },
  onBrushFillMaskChange
}: CharacterStageProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageBgRef = useRef<HTMLDivElement | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const sceneKey = actorSceneKey(role, bodyAnimationLabel);
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
    onUpdateDecoration,
    onApplyDragDelta,
    onCommitDragDelta,
    onBeginTransient,
    onCommitTransient,
    onBrushFillMaskChange
  });

  const { surfaceSize, viewportSize } = useStageSurfaceMetrics(viewportRef, stageRuntime.sceneRef, stageScale);

  usePixiApplicationLifecycle({
    hostRef,
    appRef: stageRuntime.appRef,
    sceneRef: stageRuntime.sceneRef,
    stageTeardownRef: stageRuntime.stageTeardownRef,
    cancelDeferredStageSync
  });

  useStageRuntimeRefSync({
    role,
    selectedIds,
    brushFillActive,
    brushFillBrushSize,
    brushFillMask,
    roleRef: stageRuntime.roleRef,
    selectedIdsRef: stageRuntime.selectedIdsRef,
    callbacksRef: stageRuntime.callbacksRef,
    brushFillRef: stageRuntime.brushFillRef,
    brushDrawRef: stageRuntime.brushDrawRef,
    onUpdateDecoration,
    onApplyDragDelta,
    onCommitDragDelta,
    onBeginTransient,
    onCommitTransient,
    onBrushFillMaskChange
  });

  useStageSceneLifecycle({
    appRef: stageRuntime.appRef,
    hostRef,
    stageBgRef,
    roleRef: stageRuntime.roleRef,
    selectedIdsRef: stageRuntime.selectedIdsRef,
    brushFillRef: stageRuntime.brushFillRef,
    dragRef: stageRuntime.dragRef,
    sceneRef: stageRuntime.sceneRef,
    stageRuntimeRefs: stageRuntime.stageRuntimeRefs,
    stageBuildGenerationRef: stageRuntime.stageBuildGenerationRef,
    stageTeardownRef: stageRuntime.stageTeardownRef,
    beginDecorationDragRef: stageRuntime.beginDecorationDragRef,
    sceneBuildConfigRef: stageRuntime.sceneBuildConfigRef,
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
    sceneRef: stageRuntime.sceneRef,
    dragRef: stageRuntime.dragRef,
    brushDrawRef: stageRuntime.brushDrawRef,
    beginDecorationDragRef: stageRuntime.beginDecorationDragRef,
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
    <section className="stage-panel">
      <div
        ref={viewportRef}
        className="stage-viewport"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'auto',
          overscrollBehavior: 'contain'
        }}
      >
        <div
          className="stage-scroll-surface"
          style={{
            position: 'relative',
            width: `${surfaceSize.width}px`,
            height: `${surfaceSize.height}px`,
            minWidth: '100%',
            minHeight: '100%',
            overflow: 'visible',
            isolation: 'isolate'
          }}
        >
          <div
            ref={stageBgRef}
            className="stage-bg"
            aria-hidden="true"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(90deg) scale(${stageScale})`
            }}
          >
            <div className="piece" />
            <div className="piece piece-two" />
          </div>
          <div
            ref={hostRef}
            className="pixi-host"
            style={{
              position: 'sticky',
              top: 0,
              left: 0,
              zIndex: 2,
              width: `${viewportSize.width}px`,
              height: `${viewportSize.height}px`,
              pointerEvents: 'auto'
            }}
          />
        </div>
      </div>
      <div className="stage-help">{t(brushFillActive ? 'stage.brushHelp' : 'stage.help')}</div>
    </section>
  );
}
