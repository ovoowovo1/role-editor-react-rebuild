import type { MutableRefObject } from 'react';
import type { Container, FederatedPointerEvent, Graphics } from 'pixi.js';
import type { BrushFillMask, BrushFillPoint } from '../../lib/conversion/brushFillToDeco';
import type { ActorClip } from '../../lib/runtime/actorClip';
import type { GafMovieClip } from '../../lib/runtime/gafMovieClip';
import type { DecorationLayer, RoleDocument } from '../../types/role';

export interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
  overlay?: {
    container: Container;
    items: Array<{ id: string; decoContainer: Container; startX: number; startY: number }>;
    startX: number;
    startY: number;
  };
  preview?: {
    container: Container;
    startX: number;
    startY: number;
  };
}

export interface BrushDrawState {
  points: BrushFillPoint[];
}

export interface StageCallbacks {
  onUpdateDecoration(id: string, patch: Partial<DecorationLayer>, commit?: boolean): void;
  onApplyDragDelta(dx: number, dy: number): void;
  onCommitDragDelta(dx: number, dy: number): void;
  onBeginTransient(): void;
  onCommitTransient(): void;
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
  onPointerDown(id: string, event: FederatedPointerEvent, disguiseRoot: Container): void;
}

export interface DecoDisplayRecord {
  container: Container;
  displayKey: string;
  transformKey: string;
  selected: boolean;
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
  brushFillGraphic: Graphics;
  selectionDragVisualKey: string;
  selectionDragVisualsById: Map<string, Container>;
  selectionDragTargetId: string | null;
  failedTextures: Set<string>;
  decoDisplays: Map<string, DecoDisplayRecord>;
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
