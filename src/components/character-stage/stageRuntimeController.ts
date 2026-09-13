import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Application } from 'pixi.js';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { RoleDocument } from '../../types/role';
import type { ReferenceImageLayer } from '../../types/referenceImage';
import { beginDecorationDrag, beginReferenceImageDrag } from './dragInteractions';
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
  selectedReferenceImageId: string | null;
  stageScale: number;
  facingQuarterTurns: number;
  bodyAnimationLabel: string;
  brushFillActive: boolean;
  brushFillBrushSize: number;
  brushFillMask: BrushFillMask;
  headGlowAlwaysOn: boolean;
  referenceImages: ReferenceImageLayer[];
  layerOrder: string[];
  onCommitDrag(selectionIds: readonly string[], dx: number, dy: number): void;
  onCommitReferenceImageDrag(id: string, dx: number, dy: number): void;
  onClearSelection(): void;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
}

export function useStageRuntimeController({
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
  onCommitDrag,
  onCommitReferenceImageDrag,
  onClearSelection,
  onBrushFillMaskChange
}: StageRuntimeControllerOptions) {
  const appRef = useRef<Application | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const brushDrawRef = useRef<BrushDrawState | null>(null);
  const sceneRef = useRef<StageSceneState | null>(null);
  const roleRef = useRef(role);
  const selectedIdsRef = useRef(selectedIds);
  const selectedReferenceImageIdRef = useRef(selectedReferenceImageId);
  const headGlowAlwaysOnRef = useRef(headGlowAlwaysOn);
  const referenceImagesRef = useRef(referenceImages);
  const layerOrderRef = useRef(layerOrder);
  const callbacksRef = useRef<StageCallbacks>({
    onCommitDrag,
    onCommitReferenceImageDrag,
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
    selectedReferenceImageIdRef.current = selectedReferenceImageId;
    headGlowAlwaysOnRef.current = headGlowAlwaysOn;
    referenceImagesRef.current = referenceImages;
    layerOrderRef.current = layerOrder;
    callbacksRef.current = {
      onCommitDrag,
      onCommitReferenceImageDrag,
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
    headGlowAlwaysOn,
    onCommitReferenceImageDrag,
    facingQuarterTurns,
    onBrushFillMaskChange,
    onClearSelection,
    onCommitDrag,
    role,
    selectedIds,
    selectedReferenceImageId,
    stageScale,
    layerOrder
  ]);

  const stageRuntimeRefs = useMemo<StageRuntimeRefs>(
    () => ({
      roleRef,
      selectedIdsRef,
      selectedReferenceImageIdRef,
      callbacksRef,
      brushFillRef,
      sceneRef,
      dragRef,
      brushDrawRef,
      referenceImagesRef,
      layerOrderRef
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

  const referenceImageOptions = useMemo(
    () => ({
      onPointerDown: (id: string, global: { x: number; y: number }, root: import('pixi.js').Container) => {
        if (stageRuntimeRefs.selectedReferenceImageIdRef.current !== id) return;
        beginReferenceImageDrag(id, global, root, stageRuntimeRefs);
      }
    }),
    [stageRuntimeRefs]
  );

  return {
    appRef,
    dragRef,
    brushDrawRef,
    referenceImagesRef,
    layerOrderRef,
    sceneRef,
    roleRef,
    selectedIdsRef,
    selectedReferenceImageIdRef,
    headGlowAlwaysOnRef,
    brushFillRef,
    stageBuildGenerationRef,
    stageTeardownRef,
    lastPlaybackResetRef,
    sceneBuildConfigRef,
    stageRuntimeRefs,
    decoOptions,
    referenceImageOptions
  };
}
