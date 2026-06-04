import { useRef, useState } from 'react';
import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { t } from '../i18n';
import type { DecorationLayer, RoleDocument } from '../types/role';
import type { BrushFillMask } from '../lib/conversion/brushFillToDeco';
import { actorSceneKey } from '../lib/stage/characterStageHelpers';
import { beginDecorationDrag } from './character-stage/stageInteractions';
import {
  useBodyAnimationPlayback,
  useStageDisplaySync,
  useDeferredStageSync,
  usePixiApplicationLifecycle,
  useStageSurfaceMetrics,
  useStageTransform,
  useStageRuntimeRefSync
} from './character-stage/stageEffects';
import { useStageSceneLifecycle } from './character-stage/stageSceneLifecycle';
import type {
  BrushFillState,
  BrushDrawState,
  DragState,
  StageCallbacks,
  StageRuntimeRefs,
  StageSceneState
} from './character-stage/types';

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
  const appRef = useRef<Application | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const brushDrawRef = useRef<BrushDrawState | null>(null);
  const beginDecorationDragRef = useRef<(id: string, event: FederatedPointerEvent, root: Container) => void>(() => undefined);
  const sceneRef = useRef<StageSceneState | null>(null);
  const roleRef = useRef(role);
  const selectedIdsRef = useRef(selectedIds);
  const callbacksRef = useRef<StageCallbacks>({
    onUpdateDecoration,
    onApplyDragDelta,
    onCommitDragDelta,
    onBeginTransient,
    onCommitTransient,
    onBrushFillMaskChange
  });
  const brushFillRef = useRef<BrushFillState>({
    active: brushFillActive,
    brushSize: brushFillBrushSize,
    mask: brushFillMask
  });
  const stageBuildGenerationRef = useRef(0);
  const stageTeardownRef = useRef<(() => void) | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const lastPlaybackResetRef = useRef({ sceneVersion: -1, label: '', restartKey: -1 });
  const sceneKey = actorSceneKey(role, bodyAnimationLabel);
  const { scheduleDeferredStageSync, cancelDeferredStageSync } = useDeferredStageSync();

  const stageRuntimeRefs: StageRuntimeRefs = {
    roleRef,
    selectedIdsRef,
    callbacksRef,
    brushFillRef,
    sceneRef,
    dragRef,
    brushDrawRef
  };

  beginDecorationDragRef.current = (id, event, root) => beginDecorationDrag(id, event, root, stageRuntimeRefs);

  const { surfaceSize, viewportSize } = useStageSurfaceMetrics(viewportRef, sceneRef, stageScale);

  usePixiApplicationLifecycle({
    hostRef,
    appRef,
    sceneRef,
    stageTeardownRef,
    cancelDeferredStageSync
  });

  useStageRuntimeRefSync({
    role,
    selectedIds,
    brushFillActive,
    brushFillBrushSize,
    brushFillMask,
    roleRef,
    selectedIdsRef,
    callbacksRef,
    brushFillRef,
    brushDrawRef,
    onUpdateDecoration,
    onApplyDragDelta,
    onCommitDragDelta,
    onBeginTransient,
    onCommitTransient,
    onBrushFillMaskChange
  });

  useStageSceneLifecycle({
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
  });

  useStageDisplaySync({
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
  });

  useBodyAnimationPlayback({
    sceneRef,
    lastPlaybackResetRef,
    sceneVersion,
    bodyAnimationLabel,
    bodyAnimationPlaying,
    bodyAnimationRestartKey
  });
  useStageTransform(sceneRef, stageScale, facingQuarterTurns);

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
