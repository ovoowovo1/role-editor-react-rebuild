import { useEffect, useRef } from 'react';
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { BodyPartTab, DecorationLayer, PartOption, RoleDocument } from '../types/role';
import { getBodyPartOption, optionById } from '../mock/options';
import { actorAtlasFrames } from '../mock/gafManifest';
import { clamp, clampToDisc } from '../lib/math';
import { ACTOR_BODY_SCALE } from '../lib/actorClipAdapter';
import { actorPartRuntime, getPartFrame, isRuntimeEmptyFrame, sanitizePartScale } from '../lib/twlibPartRuntime';
import { collectAtlasTextureUrlsForRole, partitionAtlasTextureUrls } from '../lib/atlasTextureAvailability';
import { applyGafAtlasToSprite } from '../lib/gafAtlasSprite';
import { createDecoSelectionGlowFilter } from '../lib/decoSelectionFilter';
import { ActorClip } from '../lib/actorClip';
import { GafMovieClip } from '../lib/gafMovieClip';
import { isMissingDecoAssetId } from '../lib/roleSerialization';

interface CharacterStageProps {
  role: RoleDocument;
  selectedIds: string[];
  stageScale: number;
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

/**
 * Builds a decoManager.root equivalent: a plain Container that is attached to
 * `actorClip.headClip.setDisguise(...)`. The head layer clip and decoration
 * sprites are inserted bottom-to-top to mirror RoleDecosConfig.generateDisguise.
 */
function buildDisguiseRoot(
  role: RoleDocument,
  headFrame: number,
  failedTextures: Set<string>,
  decoOptions: {
    selectedSet: Set<string>;
    onPointerDown(deco: DecorationLayer, event: FederatedPointerEvent, disguiseRoot: Container): void;
  }
): { disguiseRoot: Container; headLayerClip: GafMovieClip } {
  const disguiseRoot = new Container();

  const headLibrary = actorPartRuntime.head.library;
  const headLayerClip = new GafMovieClip(actorAtlasFrames[headLibrary] ?? [], failedTextures);
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

  const headLayerIndex = Math.max(
    0,
    Math.min(role.decorations.length, Math.round(role.headLayerIndex ?? role.decorations.length))
  );

  type LayerEntry = { kind: 'head' } | { kind: 'deco'; deco: DecorationLayer };
  const ordered: LayerEntry[] = role.decorations.map((deco) => ({ kind: 'deco' as const, deco }));
  ordered.splice(headLayerIndex, 0, { kind: 'head' as const });

  ordered
    .slice()
    .reverse()
    .forEach((entry) => {
      if (entry.kind === 'head') {
        disguiseRoot.addChild(headLayerClip);
        return;
      }

      const deco = entry.deco;
      if (!deco.visible) return;

      const option = optionById[deco.assetId];
      const missing = !option || isMissingDecoAssetId(deco.assetId);

      const wrapper = new Container();
      wrapper.position.set(deco.x, deco.y);
      wrapper.rotation = (deco.rotation * Math.PI) / 180;
      wrapper.scale.set(deco.scaleX, deco.scaleY);
      wrapper.alpha = clamp(deco.opacity, 0, 1);
      wrapper.eventMode = 'static';
      wrapper.cursor = 'pointer';

      if (missing) {
        // Preserve the imported transform on a visible placeholder instead of
        // swapping the layer onto an unrelated deco. fixIngameRoleDesign would
        // drop the entry entirely; we keep it so the user can decide whether
        // to delete or remap the unknown `c` code.
        wrapper.addChild(makeMissingDecoGraphic(28));
      } else {
        const sprite = makeOptionSprite(option, failedTextures);
        if (!sprite) return;
        applySpriteRegistration(sprite, option, 64, failedTextures);
        wrapper.addChild(sprite);
      }

      if (decoOptions.selectedSet.has(deco.id)) {
        wrapper.filters = [createDecoSelectionGlowFilter()];
      }

      wrapper.on('pointerdown', (event: FederatedPointerEvent) => {
        decoOptions.onPointerDown(deco, event, disguiseRoot);
      });

      disguiseRoot.addChild(wrapper);
    });

  return { disguiseRoot, headLayerClip };
}

function buildActorClipForRole(role: RoleDocument, failedTextures: Set<string>): ActorClip {
  const actorClip = new ActorClip(failedTextures);

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
  stageScale,
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
  const stageBuildGenerationRef = useRef(0);
  const stageTeardownRef = useRef<(() => void) | null>(null);
  const baseDevicePixelRatioRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const selectedSet = new Set(selectedIds);

  const browserZoomRatio =
    typeof window !== 'undefined' ? (window.devicePixelRatio || 1) / (baseDevicePixelRatioRef.current || 1) : 1;
  const stageBgTop = `${0.2 * stageScale * browserZoomRatio * 100}%`;

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

    const urls = collectAtlasTextureUrlsForRole(role);

    partitionAtlasTextureUrls(urls).then(({ failed: failedTextures }) => {
      if (cancelled || buildId !== stageBuildGenerationRef.current) return;

      stageTeardownRef.current?.();
      stageTeardownRef.current = null;

      stage.removeChildren();
      stage.eventMode = 'static';
      stage.hitArea = app.screen;

      const actorStage = new Container();
      actorStage.scale.set(stageScale);
      stage.addChild(actorStage);

      const actorClipRoot = new Container();
      actorClipRoot.scale.set(ACTOR_BODY_SCALE);
      actorStage.addChild(actorClipRoot);

      const actorClip = buildActorClipForRole(role, failedTextures);
      actorClipRoot.addChild(actorClip);

      const range = positionRange(role);
      const headOption = getBodyPartOption('head', role.parts.head);
      const headFrame = getRolePartFrame(role, 'head', headOption);

      const { disguiseRoot } = buildDisguiseRoot(role, headFrame, failedTextures, {
        selectedSet,
        onPointerDown: (deco, event, root) => {
          event.stopPropagation();
          onSelectDecoration(deco.id, event.ctrlKey || event.metaKey);
          onBeginTransient();
          const local = root.toLocal(event.global);
          dragRef.current = {
            id: deco.id,
            offsetX: local.x - deco.x,
            offsetY: local.y - deco.y
          };
        }
      });

      actorClip.headClip.setDisguise(disguiseRoot);

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

      updatePosition();
      const rafId = requestAnimationFrame(updatePosition);

      const positionObserver = new ResizeObserver(updatePosition);
      positionObserver.observe(host);
      if (stageBgRef.current) {
        positionObserver.observe(stageBgRef.current);
      }

      const handleMove = (event: FederatedPointerEvent) => {
        const dragging = dragRef.current;
        if (!dragging) return;
        const local = disguiseRoot.toLocal(event.global);
        let nx = local.x - dragging.offsetX;
        let ny = local.y - dragging.offsetY;
        const disc = clampToDisc(nx, ny, range);
        nx = disc.x;
        ny = disc.y;
        onUpdateDecoration(
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
        onCommitTransient();
      };

      const handleStagePointerDown = (event: FederatedPointerEvent) => {
        if (event.target === stage) onClearSelection();
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
        stage.removeChildren();
      };
    });

    return () => {
      cancelled = true;
      stageTeardownRef.current?.();
      stageTeardownRef.current = null;
    };
  }, [role, selectedIds, stageScale, onBeginTransient, onClearSelection, onCommitTransient, onSelectDecoration, onUpdateDecoration]);

  return (
    <section className="stage-panel">
      <div
        ref={stageBgRef}
        className="stage-bg"
        aria-hidden="true"
        style={{
          top: stageBgTop,
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
