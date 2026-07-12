import type { MutableRefObject } from 'react';
import type { Container, Graphics } from 'pixi.js';
import type { BrushFillMask, BrushFillPoint } from '../../lib/conversion/brushFillToDeco';
import type { ActorClip } from '../../lib/runtime/actorClip';
import type { GafMovieClip } from '../../lib/runtime/gafMovieClip';
import type { DecorationLayer, RoleDocument } from '../../types/role';

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
      kind: 'overlay';
      container: Container;
      startX: number;
      startY: number;
      items: DraggedDisplayItem[];
    }
  | {
      kind: 'preview';
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

export interface StageCallbacks {
  onCommitDrag(selectionIds: readonly string[], dx: number, dy: number): void;
  onClearSelection(): void;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
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

export interface DecoDisplayRecord {
  container: Container;
  displayKey: string;
  transformKey: string;
}

export interface StageSceneState {
  actorStage: Container;
  actorClip: ActorClip;
  disguiseRoot: Container;
  headLayerClip: GafMovieClip;
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
  failedTextures: Set<string>;
  decoDisplays: Map<string, DecoDisplayRecord>;
  decorationsById: Map<string, DecorationLayer>;
  decorationInteractionEnabled: boolean;
  lastDisguiseChildOrder: Container[];
  updatePosition(): void;
}

export interface StageRuntimeRefs {
  roleRef: MutableRefObject<RoleDocument>;
  selectedIdsRef: MutableRefObject<string[]>;
  callbacksRef: MutableRefObject<StageCallbacks>;
  brushFillRef: MutableRefObject<BrushFillState>;
  sceneRef: MutableRefObject<StageSceneState | null>;
  dragRef: MutableRefObject<DragState | null>;
  brushDrawRef: MutableRefObject<BrushDrawState | null>;
}
