import type { MutableRefObject } from 'react';
import { Container, type FederatedPointerEvent, Graphics } from 'pixi.js';
import type { Rectangle } from 'pixi.js';
import type { RoleDocument } from '../../types/role';
import {
  quarterTurnRotationRadians
} from '../../lib/stage/characterStageHelpers';
import {
  ACTOR_BODY_SCALE,
  buildActorClipForRole,
  prepareDisguiseRoot
} from './actorVisuals';
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
  selectionDragController.addChild(selectionDragControllerVisuals, selectionDragControllerGraphic);

  const brushFillOverlay = new Container();
  const brushFillCommittedGraphic = new Graphics();
  const brushFillDraftGraphic = new Graphics();
  brushFillOverlay.visible = false;
  brushFillOverlay.eventMode = 'none';
  brushFillOverlay.addChild(brushFillCommittedGraphic, brushFillDraftGraphic);

  const updatePosition = () => {
    const host = hostRef.current;
    const background = stageBgRef.current;
    if (!host || !background || actorStage.destroyed) return;
    const hostRect = host.getBoundingClientRect();
    const backgroundRect = background.getBoundingClientRect();
    actorStage.position.set(
      backgroundRect.left - hostRect.left + backgroundRect.width / 2,
      backgroundRect.top - hostRect.top + backgroundRect.height / 2
    );
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
    brushFillCommittedGraphic,
    brushFillDraftGraphic,
    selectionDragVisualKey: '',
    selectionDragVisualsById: new Map(),
    selectionDragTargetId: null,
    failedTextures,
    decoDisplays: new Map(),
    decorationInteractionEnabled: true,
    lastDisguiseChildOrder: [],
    updatePosition
  };

  selectionDragController.on('pointerdown', (event: FederatedPointerEvent) => {
    onSelectionDragPointerDown(event, scene);
  });

  return scene;
}
