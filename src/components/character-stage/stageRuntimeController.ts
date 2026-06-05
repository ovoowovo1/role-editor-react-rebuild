import { useMemo, useRef } from 'react';
import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { DecorationLayer, RoleDocument } from '../../types/role';
import { beginDecorationDrag } from './stageInteractions';
import type {
  BrushDrawState,
  BrushFillState,
  DragState,
  StageCallbacks,
  StageRuntimeRefs,
  StageSceneBuildConfig,
  StageSceneState
} from './types';

interface StageRuntimeControllerOptions {
  role: RoleDocument;
  selectedIds: string[];
  stageScale: number;
  facingQuarterTurns: number;
  bodyAnimationLabel: string;
  brushFillActive: boolean;
  brushFillBrushSize: number;
  brushFillMask: BrushFillMask;
  onUpdateDecoration(id: string, patch: Partial<DecorationLayer>, commit?: boolean): void;
  onApplyDragDelta(dx: number, dy: number): void;
  onCommitDragDelta(dx: number, dy: number): void;
  onBeginTransient(): void;
  onCommitTransient(): void;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
}

export function useStageRuntimeController({
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
}: StageRuntimeControllerOptions) {
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
  const lastPlaybackResetRef = useRef({ sceneVersion: -1, label: '', restartKey: -1 });
  const sceneBuildConfigRef = useRef<StageSceneBuildConfig>({
    stageScale,
    facingQuarterTurns,
    bodyAnimationLabel
  });

  sceneBuildConfigRef.current = {
    stageScale,
    facingQuarterTurns,
    bodyAnimationLabel
  };

  const stageRuntimeRefs = useMemo<StageRuntimeRefs>(
    () => ({
      roleRef,
      selectedIdsRef,
      callbacksRef,
      brushFillRef,
      sceneRef,
      dragRef,
      brushDrawRef
    }),
    []
  );

  beginDecorationDragRef.current = (id, event, root) => beginDecorationDrag(id, event, root, stageRuntimeRefs);

  return {
    appRef,
    dragRef,
    brushDrawRef,
    beginDecorationDragRef,
    sceneRef,
    roleRef,
    selectedIdsRef,
    callbacksRef,
    brushFillRef,
    stageBuildGenerationRef,
    stageTeardownRef,
    lastPlaybackResetRef,
    sceneBuildConfigRef,
    stageRuntimeRefs
  };
}
