import type { MutableRefObject } from 'react';
import type { Container, Graphics, Sprite } from 'pixi.js';
import type { BrushFillMask, BrushFillPoint } from '../../lib/conversion/brushFillToDeco';
import type { ActorClip } from '../../lib/runtime/actorClip';
import type { GafMovieClip } from '../../lib/runtime/gafMovieClip';
import type { DecorationLayer, RoleDocument } from '../../types/role';
import type { ReferenceImageLayer } from '../../types/referenceImage';
import type { PinOutlineState } from '../../types/pinOutline';

export interface StagePointerPosition {
  x: number;
  y: number;
}

export interface DraggedDisplayItem {
  id: string;
  container: Container;
  startX: number;
  startY: number;
}

export type DragVisual =
  | {
      kind: 'direct';
      container: Container;
      startX: number;
      startY: number;
    }
  | {
      kind: 'multi';
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      items: DraggedDisplayItem[];
    }
  | {
      kind: 'preview';
      container: Container;
      startX: number;
      startY: number;
    }
  | {
      kind: 'reference-image';
      id: string;
      container: Container;
      startX: number;
      startY: number;
    };

export interface DragState {
  selectionIds: string[];
  offsetX: number;
  offsetY: number;
  controllerStartX: number;
  controllerStartY: number;
  visual: DragVisual;
}

export interface BrushDrawState {
  points: BrushFillPoint[];
}

export interface PinDragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

export interface StageCallbacks {
  onCommitDrag(selectionIds: readonly string[], dx: number, dy: number): void;
  onCommitReferenceImageDrag?(id: string, dx: number, dy: number): void;
  onClearSelection(): void;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
  onPinAdd?(x: number, y: number): void;
  onPinMove?(id: string, x: number, y: number): void;
}

export interface BrushFillState {
  active: boolean;
  brushSize: number;
  mask: BrushFillMask;
}

export interface StageSceneBuildConfig {
  stageScale: number;
  facingQuarterTurns: number;
  bodyAnimationLabel: string;
}

export interface DisguiseDecoOptions {
  onPointerDown(id: string, global: StagePointerPosition, disguiseRoot: Container): void;
}

export interface ReferenceImageOptions {
  onPointerDown(id: string, global: StagePointerPosition, disguiseRoot: Container): void;
}

export interface PinOutlineOptions {
  onPointerDown(id: string, global: StagePointerPosition, disguiseRoot: Container): void;
}

export interface DecoDisplayRecord {
  container: Container;
  displayKey: string;
  transformKey: string;
  appliedDecoration?: DecorationLayer;
}

export interface ReferenceImageDisplayRecord {
  container: Container;
  sprite: Sprite;
  displayKey: string;
  appliedImage?: ReferenceImageLayer;
}

export interface StageSceneState {
  actorStage: Container;
  actorClip: ActorClip;
  disguiseRoot: Container;
  headLayerClip: GafMovieClip;
  referenceImagesOverlay: Container;
  pinOutlineOverlay: Container;
  pinOutlinePathGraphic: Graphics;
  pinOutlinePins: Map<string, Graphics>;
  pinOutlineMaterialDisplays: Map<string, Container[]>;
  pinOutlineMetricsCleanup: (() => void) | null;
  headLayerSelectionOverlay: Container;
  headLayerSelectionVisual: GafMovieClip;
  selectionDragController: Container;
  selectionDragControllerGraphic: Graphics;
  selectionDragControllerVisuals: Container;
  brushFillOverlay: Container;
  brushFillCommittedGraphic: Graphics;
  brushFillDraftGraphic: Graphics;
  selectionDragVisualKey: string;
  selectionDragVisualsById: Map<string, Container>;
  selectionDragVisualDisplayKeysById: Map<string, string>;
  selectionDragTargetId: string | null;
  headLayerSelectionActive: boolean;
  headLayerGlowActive: boolean;
  failedTextures: Set<string>;
  decoDisplays: Map<string, DecoDisplayRecord>;
  decorationsById: Map<string, DecorationLayer>;
  referenceImageDisplays: Map<string, ReferenceImageDisplayRecord>;
  referenceImagesById: Map<string, ReferenceImageLayer>;
  pinOutlineState: PinOutlineState;
  layerOrder: string[];
  decorationInteractionEnabled: boolean;
  lastDisguiseChildOrder: Container[];
  updatePosition(): void;
}

export interface StageRuntimeRefs {
  roleRef: MutableRefObject<RoleDocument>;
  selectedIdsRef: MutableRefObject<string[]>;
  selectedReferenceImageIdRef: MutableRefObject<string | null>;
  callbacksRef: MutableRefObject<StageCallbacks>;
  brushFillRef: MutableRefObject<BrushFillState>;
  sceneRef: MutableRefObject<StageSceneState | null>;
  dragRef: MutableRefObject<DragState | null>;
  brushDrawRef: MutableRefObject<BrushDrawState | null>;
  pinDragRef?: MutableRefObject<PinDragState | null>;
  referenceImagesRef?: MutableRefObject<ReferenceImageLayer[]>;
  layerOrderRef?: MutableRefObject<string[]>;
  pinOutlineRef?: MutableRefObject<PinOutlineState>;
}
