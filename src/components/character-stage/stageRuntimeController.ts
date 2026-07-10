import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Application } from 'pixi.js';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { RoleDocument } from '../../types/role';
import { beginDecorationDrag } from './dragInteractions';
import type {
  BrushDrawState,
  BrushFillState,
  DisguiseDecoOptions,
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
  onCommitDrag(selectionIds: readonly string[], dx: number, dy: number): void;
  onClearSelection(): void;
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
  onCommitDrag,
  onClearSelection,
  onBrushFillMaskChange
}: StageRuntimeControllerOptions) {
  const appRef = useRef<Application | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const brushDrawRef = useRef<BrushDrawState | null>(null);
  const sceneRef = useRef<StageSceneState | null>(null);
  const roleRef = useRef(role);
  const selectedIdsRef = useRef(selectedIds);
  const callbacksRef = useRef<StageCallbacks>({
    onCommitDrag,
    onClearSelection,
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

  // Keep imperative Pixi handlers on committed React state. A layout effect
  // runs before pointer input can resume and avoids exposing aborted renders.
  useLayoutEffect(() => {
    roleRef.current = role;
    selectedIdsRef.current = selectedIds;
    callbacksRef.current = {
      onCommitDrag,
      onClearSelection,
      onBrushFillMaskChange
    };
    brushFillRef.current = {
      active: brushFillActive,
      brushSize: brushFillBrushSize,
      mask: brushFillMask
    };
    if (!brushFillActive) {
      brushDrawRef.current = null;
    }
    sceneBuildConfigRef.current = {
      stageScale,
      facingQuarterTurns,
      bodyAnimationLabel
    };
  }, [
    bodyAnimationLabel,
    brushFillActive,
    brushFillBrushSize,
    brushFillMask,
    facingQuarterTurns,
    onBrushFillMaskChange,
    onClearSelection,
    onCommitDrag,
    role,
    selectedIds,
    stageScale
  ]);

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

  const decoOptions = useMemo<DisguiseDecoOptions>(
    () => ({
      onPointerDown: (id, global, root) => {
        beginDecorationDrag(id, global, root, stageRuntimeRefs);
      }
    }),
    [stageRuntimeRefs]
  );

  return {
    appRef,
    dragRef,
    brushDrawRef,
    sceneRef,
    roleRef,
    selectedIdsRef,
    brushFillRef,
    stageBuildGenerationRef,
    stageTeardownRef,
    lastPlaybackResetRef,
    sceneBuildConfigRef,
    stageRuntimeRefs,
    decoOptions
  };
}
