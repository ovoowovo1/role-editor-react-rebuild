import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Application } from 'pixi.js';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { RoleDocument } from '../../types/role';
import type { ReferenceImageLayer } from '../../types/referenceImage';
import type { PinOutlineState } from '../../types/pinOutline';
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
  pinOutline: PinOutlineState;
  onCommitDrag(selectionIds: readonly string[], dx: number, dy: number): void;
  onCommitReferenceImageDrag(id: string, dx: number, dy: number): void;
  onClearSelection(): void;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
  onPinAdd?(x: number, y: number): void;
  onPinMove?(id: string, x: number, y: number): void;
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
  pinOutline,
  onCommitDrag,
  onCommitReferenceImageDrag,
  onClearSelection,
  onBrushFillMaskChange,
  onPinAdd,
  onPinMove
}: StageRuntimeControllerOptions) {
  const appRef = useRef<Application | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const brushDrawRef = useRef<BrushDrawState | null>(null);
  const pinDragRef = useRef<import('./types').PinDragState | null>(null);
  const sceneRef = useRef<StageSceneState | null>(null);
  const roleRef = useRef(role);
  const selectedIdsRef = useRef(selectedIds);
  const selectedReferenceImageIdRef = useRef(selectedReferenceImageId);
  const headGlowAlwaysOnRef = useRef(headGlowAlwaysOn);
  const referenceImagesRef = useRef(referenceImages);
  const layerOrderRef = useRef(layerOrder);
  const pinOutlineRef = useRef(pinOutline);
  const callbacksRef = useRef<StageCallbacks>({
    onCommitDrag,
    onCommitReferenceImageDrag,
    onClearSelection,
    onBrushFillMaskChange,
    onPinAdd,
    onPinMove
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
    pinOutlineRef.current = pinOutline;
    callbacksRef.current = {
      onCommitDrag,
      onCommitReferenceImageDrag,
      onClearSelection,
      onBrushFillMaskChange,
      onPinAdd,
      onPinMove
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
    layerOrder,
    pinOutline
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
      pinDragRef,
      referenceImagesRef,
      layerOrderRef,
      pinOutlineRef
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

  const pinOutlineOptions = useMemo(
    () => ({
      onPointerDown: (id: string, global: { x: number; y: number }, root: import('pixi.js').Container) => {
        const scene = stageRuntimeRefs.sceneRef.current;
        if (!scene || !stageRuntimeRefs.pinOutlineRef?.current.active) return;
        const pinDragRef = stageRuntimeRefs.pinDragRef;
        if (!pinDragRef) return;
        const pin = scene.pinOutlineState.pins.find((item) => item.id === id);
        if (!pin) return;
        const local = root.toLocal(global);
        pinDragRef.current = {
          id,
          offsetX: local.x - pin.x,
          offsetY: local.y - pin.y
        };
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
    pinDragRef,
    pinOutlineRef,
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
    referenceImageOptions,
    pinOutlineOptions
  };
}
