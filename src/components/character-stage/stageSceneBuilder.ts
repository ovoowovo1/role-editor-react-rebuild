import type { MutableRefObject } from 'react';
import { Container, FederatedPointerEvent, Graphics } from 'pixi.js';
import type { Rectangle } from 'pixi.js';
import type { RoleDocument } from '../../types/role';
import {
  ACTOR_BODY_SCALE,
  buildActorClipForRole,
  prepareDisguiseRoot
} from './actorVisuals';
import { quarterTurnRotationRadians } from '../../lib/stage/characterStageHelpers';
import type { StageSceneState } from './types';

export function buildStageScene({
  stage,
  hitArea,
  hostRef,
  stageBgRef,
  role,
  failedTextures,
  stageScale,
  facingQuarterTurns,
  bodyAnimationLabel,
  onSelectionDragPointerDown
}: {
  stage: Container;
  hitArea: Rectangle;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  stageBgRef: MutableRefObject<HTMLDivElement | null>;
  role: RoleDocument;
  failedTextures: Set<string>;
  stageScale: number;
  facingQuarterTurns: number;
  bodyAnimationLabel: string;
  onSelectionDragPointerDown(event: FederatedPointerEvent, scene: StageSceneState): void;
}): StageSceneState {
  stage.removeChildren();
  stage.eventMode = 'static';
  stage.hitArea = hitArea;

  const actorStage = new Container();
  actorStage.scale.set(stageScale);
  actorStage.rotation = quarterTurnRotationRadians(facingQuarterTurns);
  stage.addChild(actorStage);

  const actorClipRoot = new Container();
  actorClipRoot.scale.set(ACTOR_BODY_SCALE);
  actorStage.addChild(actorClipRoot);

  const actorClip = buildActorClipForRole(role, failedTextures, bodyAnimationLabel);
  actorClipRoot.addChild(actorClip);

  const { disguiseRoot, headLayerClip } = prepareDisguiseRoot(role, failedTextures);
  actorClip.headClip.setDisguise(disguiseRoot);
  disguiseRoot.addChild(headLayerClip);

  const selectionDragController = new Container();
  const selectionDragControllerGraphic = new Graphics();
  const selectionDragControllerVisuals = new Container();
  selectionDragController.visible = false;
  selectionDragController.eventMode = 'none';
  selectionDragController.addChild(selectionDragControllerGraphic);
  selectionDragController.addChild(selectionDragControllerVisuals);

  const brushFillOverlay = new Container();
  const brushFillGraphic = new Graphics();
  brushFillOverlay.visible = false;
  brushFillOverlay.eventMode = 'none';
  brushFillOverlay.addChild(brushFillGraphic);

  const updatePosition = () => {
    const hostEl = hostRef.current;
    const bgEl = stageBgRef.current;
    if (!hostEl || !bgEl || actorStage.destroyed) return;
    const hostRect = hostEl.getBoundingClientRect();
    const bgRect = bgEl.getBoundingClientRect();
    // Old TWRoleCgEditor anchored to stageBg.offset() + (+68, +98). The
    // rebuild keeps the same visual center by anchoring to the bbox center.
    const posX = bgRect.left - hostRect.left + bgRect.width / 2;
    const posY = bgRect.top - hostRect.top + bgRect.height / 2;
    actorStage.position.set(posX, posY);
  };

  const scene: StageSceneState = {
    actorStage,
    actorClip,
    disguiseRoot,
    headLayerClip,
    selectionDragController,
    selectionDragControllerGraphic,
    selectionDragControllerVisuals,
    brushFillOverlay,
    brushFillGraphic,
    selectionDragVisualKey: '',
    selectionDragVisualsById: new Map(),
    selectionDragTargetId: null,
    failedTextures,
    decoDisplays: new Map(),
    lastDisguiseChildOrder: [],
    updatePosition
  };

  selectionDragController.on('pointerdown', (event: FederatedPointerEvent) => {
    onSelectionDragPointerDown(event, scene);
  });

  return scene;
}
