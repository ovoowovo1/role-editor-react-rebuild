import { useEffect, useRef, useState } from 'react';
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { BodyPartTab, DecorationLayer, PartOption, RoleDocument } from '../types/role';
import { getBodyPartOption, optionById } from '../mock/options';
import {
  actorAtlasFrames,
  actorRuntimeManifest,
  decorationAtlasFrames,
  decorationRuntimeManifest,
  gafSources
} from '../mock/gafManifest';
import { clamp, clampToDisc } from '../lib/math';
import { ACTOR_BODY_SCALE } from '../lib/actorClipAdapter';
import { actorPartRuntime, getPartFrame, isRuntimeEmptyFrame, sanitizePartScale } from '../lib/twlibPartRuntime';
import { collectAtlasTextureUrlsForRole, partitionAtlasTextureUrls } from '../lib/atlasTextureAvailability';
import { applyGafAtlasToSprite } from '../lib/gafAtlasSprite';
import { createDecoSelectionGlowFilter } from '../lib/decoSelectionFilter';
import { ActorClip } from '../lib/actorClip';
import { createActorGafClip, createGafClip, type GafMovieClip } from '../lib/gafMovieClip';
import { isMissingDecoAssetId } from '../lib/roleSerialization';

interface CharacterStageProps {
  role: RoleDocument;
  selectedIds: string[];
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  bodyAnimationRestartKey: number;
  stageScale: number;
  facingQuarterTurns: number;
  onSelectDecoration(id: string, additive: boolean): void;
  onClearSelection(): void;
  onUpdateDecoration(id: string, patch: Partial<DecorationLayer>, commit?: boolean): void;
  onBeginTransient(): void;
  onCommitTransient(): void;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface DisguiseDecoOptions {
  onPointerDown(id: string, event: FederatedPointerEvent, disguiseRoot: Container): void;
}

interface DecoDisplayRecord {
  container: Container;
  displayKey: string;
  selected: boolean;
}

interface StageSceneState {
  actorStage: Container;
  actorClip: ActorClip;
  disguiseRoot: Container;
  headLayerClip: GafMovieClip;
  failedTextures: Set<string>;
  decoDisplays: Map<string, DecoDisplayRecord>;
  updatePosition(): void;
}

const ALPHA_MASK_DECO_CODES = new Set(['third_deco_34', 'third_deco_05', 'skydow_deco_302']);
const BODY_ANIMATION_FRAME_MS = 1000 / 12;

function actorSceneKey(role: RoleDocument, bodyAnimationLabel: string): string {
  return JSON.stringify({
    camp: role.camp,
    gender: role.gender,
    parts: role.parts,
    partFrames: role.partFrames,
    partScales: role.partScales,
    bodyAnimationLabel
  });
}

function decorationDisplayKey(deco: DecorationLayer): string {
  return `${deco.assetId}\u0000${deco.code}`;
}

function positionRange(role: RoleDocument): number {
  const raw = role.positionRange;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 60;
}

function makeOptionSprite(option: PartOption | undefined, failedTextures: Set<string>): Sprite | null {
  if (!option?.atlas) {
    return Sprite.from(option?.icon ?? optionById[Object.keys(optionById)[0]].icon);
  }
  if (failedTextures.has(option.atlas.texture)) {
    return null;
  }
  const atlasTexture = Texture.from(option.atlas.texture);
  const texture = new Texture(
    atlasTexture.baseTexture,
    new Rectangle(option.atlas.x, option.atlas.y, option.atlas.width, option.atlas.height)
  );
  return new Sprite(texture);
}

/**
 * Draws a small dashed outlined rectangle as the visual placeholder for
 * decorations whose original `code` has no PartOption in the current manifest.
 * The old `fixIngameRoleDesign` drops unknown symbols silently; for the
 * rebuild we keep the layer so users can tell something is missing instead of
 * rendering an unrelated sprite with the imported sx/sy/r.
 */
function makeMissingDecoGraphic(size = 28): Graphics {
  const half = size / 2;
  const graphic = new Graphics();
  graphic.beginFill(0xff66aa, 0.18);
  graphic.lineStyle({ width: 1.5, color: 0xff66aa, alpha: 0.9 });
  graphic.drawRect(-half, -half, size, size);
  graphic.endFill();
  graphic.lineStyle({ width: 1, color: 0xff66aa, alpha: 0.9 });
  graphic.moveTo(-half, -half);
  graphic.lineTo(half, half);
  graphic.moveTo(half, -half);
  graphic.lineTo(-half, half);
  return graphic;
}

function applySpriteRegistration(
  sprite: Sprite,
  option: PartOption | undefined,
  fallbackSize: number,
  failedTextures: Set<string>
) {
  if (option?.atlas && !failedTextures.has(option.atlas.texture)) {
    applyGafAtlasToSprite(sprite, option.atlas);
    return;
  }
  sprite.anchor.set(0.5);
  sprite.width = fallbackSize;
  sprite.height = fallbackSize;
}

function getRolePartFrame(role: RoleDocument, category: BodyPartTab, option: PartOption | undefined): number {
  return role.partFrames?.[category] ?? getPartFrame(option) ?? actorPartRuntime[category].defaultFrame;
}

function getRolePartScale(role: RoleDocument, category: BodyPartTab): number {
  return sanitizePartScale(role.partScales?.[category], 1);
}

function prepareDisguiseRoot(
  role: RoleDocument,
  headFrame: number,
  failedTextures: Set<string>
): { disguiseRoot: Container; headLayerClip: GafMovieClip } {
  const disguiseRoot = new Container();

  const headLibrary = actorPartRuntime.head.library;
  const headLayerClip = createActorGafClip(
    failedTextures,
    headLibrary,
    actorRuntimeManifest,
    gafSources.actorTexture,
    actorAtlasFrames[headLibrary] ?? []
  );
  headLayerClip.gotoAndStop(headFrame);

  const headLayer = role.headLayer ?? {
    x: 0,
    y: 0,
    scaleX: getRolePartScale(role, 'head'),
    scaleY: getRolePartScale(role, 'head'),
    rotation: 0,
    visible: true,
    opacity: 1
  };
  headLayerClip.position.set(headLayer.x, headLayer.y);
  headLayerClip.rotation = (headLayer.rotation * Math.PI) / 180;
  headLayerClip.scale.set(headLayer.scaleX, headLayer.scaleY);
  headLayerClip.alpha = clamp(headLayer.opacity, 0, 1);
  headLayerClip.visible = headLayer.visible !== false;
  if (isRuntimeEmptyFrame('head', headFrame)) {
    headLayerClip.visible = false;
  }

  return { disguiseRoot, headLayerClip };
}

function createDisguiseEntryDisplay(
  deco: DecorationLayer,
  failedTextures: Set<string>,
  disguiseRoot: Container,
  decoOptions: DisguiseDecoOptions
): Container | null {
  const option = optionById[deco.assetId];
  const missing = !option || isMissingDecoAssetId(deco.assetId);
  const wrapper = new Container();
  wrapper.position.set(deco.x, deco.y);
  wrapper.rotation = (deco.rotation * Math.PI) / 180;
  wrapper.scale.set(deco.scaleX, deco.scaleY);
  wrapper.alpha = clamp(deco.opacity, 0, 1);
  wrapper.visible = deco.visible !== false;
  wrapper.eventMode = 'static';
  wrapper.cursor = 'pointer';

  if (missing) {
    wrapper.addChild(makeMissingDecoGraphic(28));
  } else if (decorationRuntimeManifest) {
    const linkage = option.code || deco.code;
    const fallback = option.atlas ? [option.atlas] : decorationAtlasFrames[linkage] ? [decorationAtlasFrames[linkage]] : [];
    const clip = createGafClip(
      failedTextures,
      linkage,
      decorationRuntimeManifest,
      gafSources.decorationsTexture,
      fallback,
      { alphaMask: ALPHA_MASK_DECO_CODES.has(linkage) }
    );
    wrapper.addChild(clip);
  } else {
    const sprite = makeOptionSprite(option, failedTextures);
    if (!sprite) return null;
    applySpriteRegistration(sprite, option, 64, failedTextures);
    wrapper.addChild(sprite);
  }

  wrapper.on('pointerdown', (event: FederatedPointerEvent) => {
    decoOptions.onPointerDown(deco.id, event, disguiseRoot);
  });
  return wrapper;
}

function applyDecorationDisplayTransform(wrapper: Container, deco: DecorationLayer): void {
  wrapper.position.set(deco.x, deco.y);
  wrapper.rotation = (deco.rotation * Math.PI) / 180;
  wrapper.scale.set(deco.scaleX, deco.scaleY);
  wrapper.alpha = clamp(deco.opacity, 0, 1);
  wrapper.visible = deco.visible !== false;
}

function applyHeadLayerDisplayTransform(headLayerClip: GafMovieClip, role: RoleDocument): void {
  const headLayer = role.headLayer ?? {
    x: 0,
    y: 0,
    scaleX: getRolePartScale(role, 'head'),
    scaleY: getRolePartScale(role, 'head'),
    rotation: 0,
    visible: true,
    opacity: 1
  };
  const headOption = getBodyPartOption('head', role.parts.head);
  const headFrame = getRolePartFrame(role, 'head', headOption);

  headLayerClip.position.set(headLayer.x, headLayer.y);
  headLayerClip.rotation = (headLayer.rotation * Math.PI) / 180;
  headLayerClip.scale.set(headLayer.scaleX, headLayer.scaleY);
  headLayerClip.alpha = clamp(headLayer.opacity, 0, 1);
  headLayerClip.visible = headLayer.visible !== false && !isRuntimeEmptyFrame('head', headFrame);
}

function syncDecorationSelection(record: DecoDisplayRecord, selected: boolean): void {
  if (record.selected === selected) return;
  record.container.filters = selected ? [createDecoSelectionGlowFilter()] : null;
  record.selected = selected;
}

function getClampedHeadLayerIndex(role: RoleDocument): number {
  const raw = role.headLayerIndex;
  const n = typeof raw === 'number' ? raw : Number(raw);
  const index = Number.isFinite(n) ? Math.round(n) : role.decorations.length;
  return Math.max(0, Math.min(role.decorations.length, index));
}

function syncDisguiseChildOrder(scene: StageSceneState, role: RoleDocument): void {
  const topFirstChildren: Container[] = [];

  for (const deco of role.decorations) {
    const record = scene.decoDisplays.get(deco.id);
    if (record) topFirstChildren.push(record.container);
  }

  const headIndex = getClampedHeadLayerIndex(role);
  topFirstChildren.splice(headIndex, 0, scene.headLayerClip);

  // PIXI renders lower childIndex first, so convert top-first state to bottom-to-top display order.
  const orderedChildren = topFirstChildren.slice().reverse();

  orderedChildren.forEach((child, index) => {
    if (child.parent !== scene.disguiseRoot) {
      scene.disguiseRoot.addChild(child);
    }
    if (scene.disguiseRoot.getChildIndex(child) !== index) {
      scene.disguiseRoot.setChildIndex(child, index);
    }
  });
}

function syncDecorationDisplays(
  scene: StageSceneState,
  role: RoleDocument,
  selectedIds: string[],
  decoOptions: DisguiseDecoOptions
): void {
  const decorationsById = new Map(role.decorations.map((deco) => [deco.id, deco]));
  const selectedSet = new Set(selectedIds);

  for (const [id, record] of scene.decoDisplays) {
    const deco = decorationsById.get(id);
    if (deco && record.displayKey === decorationDisplayKey(deco)) continue;
    if (record.container.parent === scene.disguiseRoot) {
      scene.disguiseRoot.removeChild(record.container);
    }
    if (!record.container.destroyed) {
      record.container.destroy({ children: true });
    }
    scene.decoDisplays.delete(id);
  }

  for (const deco of role.decorations) {
    let record = scene.decoDisplays.get(deco.id);
    if (!record) {
      const container = createDisguiseEntryDisplay(deco, scene.failedTextures, scene.disguiseRoot, decoOptions);
      if (!container) continue;
      record = {
        container,
        displayKey: decorationDisplayKey(deco),
        selected: false
      };
      scene.decoDisplays.set(deco.id, record);
    }

    applyDecorationDisplayTransform(record.container, deco);
    syncDecorationSelection(record, selectedSet.has(deco.id));
  }

  syncDisguiseChildOrder(scene, role);
}

function buildActorClipForRole(role: RoleDocument, failedTextures: Set<string>, bodyAnimationLabel: string): ActorClip {
  const actorClip = new ActorClip(failedTextures, bodyAnimationLabel);

  const headOption = getBodyPartOption('head', role.parts.head);
  const handOption = getBodyPartOption('hand', role.parts.hand);
  const footOption = getBodyPartOption('foot', role.parts.foot);
  const capeOption = getBodyPartOption('cape', role.parts.cape);

  const headFrame = getRolePartFrame(role, 'head', headOption);
  const handFrame = getRolePartFrame(role, 'hand', handOption);
  const footFrame = getRolePartFrame(role, 'foot', footOption);
  const capeFrame = getRolePartFrame(role, 'cape', capeOption);

  actorClip.footContainer.scale.set(getRolePartScale(role, 'foot'));
  actorClip.rightFoot.setFrame(footFrame);
  actorClip.leftFoot.setFrame(footFrame);
  if (isRuntimeEmptyFrame('foot', footFrame)) {
    actorClip.rightFoot.clip.visible = false;
    actorClip.leftFoot.clip.visible = false;
  }

  const handScale = getRolePartScale(role, 'hand');
  actorClip.rightHand.setFrame(handFrame, handScale);
  actorClip.leftHand.setFrame(handFrame, handScale);
  if (isRuntimeEmptyFrame('hand', handFrame)) {
    actorClip.rightHand.clip.visible = false;
    actorClip.leftHand.clip.visible = false;
  }

  actorClip.capeClip.setFrame(capeFrame, getRolePartScale(role, 'cape'));
  if (isRuntimeEmptyFrame('cape', capeFrame)) {
    actorClip.capeClip.clip.visible = false;
  }

  actorClip.headClip.setFrame(headFrame, getRolePartScale(role, 'head'));

  return actorClip;
}

export function CharacterStage({
  role,
  selectedIds,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  bodyAnimationRestartKey,
  stageScale,
  facingQuarterTurns,
  onSelectDecoration,
  onClearSelection,
  onUpdateDecoration,
  onBeginTransient,
  onCommitTransient
}: CharacterStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageBgRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const sceneRef = useRef<StageSceneState | null>(null);
  const roleRef = useRef(role);
  const selectedIdsRef = useRef(selectedIds);
  const callbacksRef = useRef({
    onSelectDecoration,
    onClearSelection,
    onUpdateDecoration,
    onBeginTransient,
    onCommitTransient
  });
  const stageBuildGenerationRef = useRef(0);
  const stageTeardownRef = useRef<(() => void) | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const lastPlaybackResetRef = useRef({ sceneVersion: -1, label: '', restartKey: -1 });
  const sceneKey = actorSceneKey(role, bodyAnimationLabel);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    callbacksRef.current = {
      onSelectDecoration,
      onClearSelection,
      onUpdateDecoration,
      onBeginTransient,
      onCommitTransient
    };
  }, [onBeginTransient, onClearSelection, onCommitTransient, onSelectDecoration, onUpdateDecoration]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application({
      antialias: true,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: host
    });
    appRef.current = app;
    host.appendChild(app.view as HTMLCanvasElement);

    const resizeObserver = new ResizeObserver(() => {
      app.renderer.resize(host.clientWidth, host.clientHeight);
    });
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
      if (appRef.current === app) {
        appRef.current = null;
      }
      if (!app.stage?.destroyed) {
        app.destroy(true, { children: true, texture: false });
      }
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const host = hostRef.current;
    const stage = app?.stage;
    if (!app || !host || !stage) return;

    const buildId = ++stageBuildGenerationRef.current;
    let cancelled = false;
    const buildRole = roleRef.current;
    const urls = collectAtlasTextureUrlsForRole(buildRole);
    urls.push(gafSources.assetsTexture);

    partitionAtlasTextureUrls(urls).then(({ failed: failedTextures }) => {
      if (cancelled || buildId !== stageBuildGenerationRef.current) return;

      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
      sceneRef.current = null;

      stage.removeChildren();
      stage.eventMode = 'static';
      stage.hitArea = app.screen;

      const actorStage = new Container();
      actorStage.scale.set(stageScale);
      actorStage.rotation = (((facingQuarterTurns % 4) + 4) % 4) * (Math.PI / 2);
      stage.addChild(actorStage);

      const actorClipRoot = new Container();
      actorClipRoot.scale.set(ACTOR_BODY_SCALE);
      actorStage.addChild(actorClipRoot);

      const actorClip = buildActorClipForRole(buildRole, failedTextures, bodyAnimationLabel);
      actorClipRoot.addChild(actorClip);

      const headOption = getBodyPartOption('head', buildRole.parts.head);
      const headFrame = getRolePartFrame(buildRole, 'head', headOption);
      const { disguiseRoot, headLayerClip } = prepareDisguiseRoot(buildRole, headFrame, failedTextures);
      actorClip.headClip.setDisguise(disguiseRoot);
      disguiseRoot.addChild(headLayerClip);

      const updatePosition = () => {
        const hostEl = hostRef.current;
        const bgEl = stageBgRef.current;
        if (!hostEl || !bgEl || actorStage.destroyed) return;
        const hostRect = hostEl.getBoundingClientRect();
        const bgRect = bgEl.getBoundingClientRect();
        // Old TWRoleCgEditor anchors to stageBg.offset() + (+68, +98). That
        // offset relied on the original stageBg's exact DOM metrics (195px
        // wide, 24% top, specific em-based piece margins). The rebuild's
        // stageBg has different runtime bounds, so we anchor to the visual
        // bbox center instead -- this keeps the chibi centered inside the
        // diamond regardless of stageScale.
        const posX = bgRect.left - hostRect.left + bgRect.width / 2;
        const posY = bgRect.top - hostRect.top + bgRect.height / 2;
        actorStage.position.set(posX, posY);
      };

      const scene: StageSceneState = {
        actorStage,
        actorClip,
        disguiseRoot,
        headLayerClip,
        failedTextures,
        decoDisplays: new Map(),
        updatePosition
      };
      sceneRef.current = scene;
      setSceneVersion((version) => version + 1);

      const decoOptions: DisguiseDecoOptions = {
        onPointerDown: (id, event, root) => {
          const deco = roleRef.current.decorations.find((item) => item.id === id);
          if (!deco) return;
          event.stopPropagation();
          callbacksRef.current.onSelectDecoration(id, event.ctrlKey || event.metaKey);
          callbacksRef.current.onBeginTransient();
          const local = root.toLocal(event.global);
          dragRef.current = {
            id,
            offsetX: local.x - deco.x,
            offsetY: local.y - deco.y
          };
        }
      };

      const currentRole = roleRef.current;
      applyHeadLayerDisplayTransform(headLayerClip, currentRole);
      syncDecorationDisplays(scene, currentRole, selectedIdsRef.current, decoOptions);

      updatePosition();
      const rafId = requestAnimationFrame(updatePosition);

      const positionObserver = new ResizeObserver(updatePosition);
      positionObserver.observe(host);
      if (stageBgRef.current) {
        positionObserver.observe(stageBgRef.current);
      }

      const handleMove = (event: FederatedPointerEvent) => {
        const dragging = dragRef.current;
        const currentScene = sceneRef.current;
        if (!dragging || !currentScene) return;
        const local = currentScene.disguiseRoot.toLocal(event.global);
        let nx = local.x - dragging.offsetX;
        let ny = local.y - dragging.offsetY;
        const disc = clampToDisc(nx, ny, positionRange(roleRef.current));
        nx = disc.x;
        ny = disc.y;

        const record = currentScene.decoDisplays.get(dragging.id);
        if (record) {
          record.container.position.set(nx, ny);
        }

        callbacksRef.current.onUpdateDecoration(
          dragging.id,
          {
            x: nx,
            y: ny
          },
          false
        );
      };

      const handleUp = () => {
        if (!dragRef.current) return;
        dragRef.current = null;
        callbacksRef.current.onCommitTransient();
      };

      const handleStagePointerDown = (event: FederatedPointerEvent) => {
        if (event.target === stage) callbacksRef.current.onClearSelection();
      };

      stage.on('pointermove', handleMove);
      stage.on('pointerup', handleUp);
      stage.on('pointerupoutside', handleUp);
      stage.on('pointerdown', handleStagePointerDown);

      stageTeardownRef.current = () => {
        dragRef.current = null;
        cancelAnimationFrame(rafId);
        positionObserver.disconnect();
        if (stage.destroyed) return;
        stage.off('pointermove', handleMove);
        stage.off('pointerup', handleUp);
        stage.off('pointerupoutside', handleUp);
        stage.off('pointerdown', handleStagePointerDown);
        for (const child of stage.removeChildren()) {
          if (!child.destroyed) child.destroy({ children: true });
        }
        scene.decoDisplays.clear();
        if (sceneRef.current === scene) {
          sceneRef.current = null;
        }
      };
    });

    return () => {
      cancelled = true;
      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
    };
  }, [sceneKey]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const decoOptions: DisguiseDecoOptions = {
      onPointerDown: (id, event, root) => {
        const deco = roleRef.current.decorations.find((item) => item.id === id);
        if (!deco) return;
        event.stopPropagation();
        callbacksRef.current.onSelectDecoration(id, event.ctrlKey || event.metaKey);
        callbacksRef.current.onBeginTransient();
        const local = root.toLocal(event.global);
        dragRef.current = {
          id,
          offsetX: local.x - deco.x,
          offsetY: local.y - deco.y
        };
      }
    };

    applyHeadLayerDisplayTransform(scene.headLayerClip, role);
    syncDecorationDisplays(scene, role, selectedIds, decoOptions);
  }, [role, selectedIds]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const lastReset = lastPlaybackResetRef.current;
    if (
      lastReset.sceneVersion !== sceneVersion ||
      lastReset.label !== bodyAnimationLabel ||
      lastReset.restartKey !== bodyAnimationRestartKey
    ) {
      scene.actorClip.setBodyFrame(bodyAnimationLabel);
      lastPlaybackResetRef.current = {
        sceneVersion,
        label: bodyAnimationLabel,
        restartKey: bodyAnimationRestartKey
      };
    }

    if (!bodyAnimationPlaying) return;

    let rafId = 0;
    let lastTime = performance.now();
    let accumulated = 0;

    const advanceFrame = () => {
      const currentScene = sceneRef.current;
      if (currentScene !== scene || scene.actorClip.destroyed) return;
      const range = scene.actorClip.getBodyFrameRange(bodyAnimationLabel);
      const currentFrame = scene.actorClip.body.currentFrame;
      const nextFrame = currentFrame >= range.endFrame ? range.startFrame : currentFrame + 1;
      scene.actorClip.setBodyFrame(nextFrame);
    };

    const tick = (time: number) => {
      const currentScene = sceneRef.current;
      if (currentScene !== scene || scene.actorClip.destroyed) return;
      accumulated += time - lastTime;
      lastTime = time;
      while (accumulated >= BODY_ANIMATION_FRAME_MS) {
        advanceFrame();
        accumulated -= BODY_ANIMATION_FRAME_MS;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [bodyAnimationLabel, bodyAnimationPlaying, bodyAnimationRestartKey, sceneVersion]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.actorStage.scale.set(stageScale);
    scene.actorStage.rotation = (((facingQuarterTurns % 4) + 4) % 4) * (Math.PI / 2);
    scene.updatePosition();
    const rafId = requestAnimationFrame(scene.updatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [stageScale, facingQuarterTurns]);

  return (
    <section className="stage-panel">
      <div
        ref={stageBgRef}
        className="stage-bg"
        aria-hidden="true"
        style={{
          top: '50%',
          transform: `translate(-50%, -50%) rotate(90deg) scale(${stageScale})`
        }}
      >
        <div className="piece" />
        <div className="piece piece-two" />
      </div>
      <div ref={hostRef} className="pixi-host" />
      <div className="stage-help">Drag selected Deco on canvas · Ctrl/Cmd-click for multi-select</div>
    </section>
  );
}
