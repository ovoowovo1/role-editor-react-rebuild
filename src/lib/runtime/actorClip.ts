import { Container, Matrix } from 'pixi.js';
import { actorAtlasFrames, actorRuntimeManifest, assetsRuntimeManifest, gafSources } from '../../mock/gafManifest';
import { actorPreviewSlots, type ActorPreviewSlot } from './actorClipAdapter';
import { actorPartRuntime } from './twlibPartRuntime';
import { DEFAULT_ACTOR_BODY_ANIMATION_LABEL } from './actorBodyAnimation';
import {
  createActorGafClip,
  createGafClip,
  resolveGafTimelineId,
  type CreateGafClipOptions,
  type GafMovieClip
} from './gafMovieClip';

/**
 * Lightweight recreation of the TWLibLib ActorClip runtime hierarchy used by
 * the original RoleEditor preview. When `actorRuntime` is present in the GAF manifest,
 * each part uses timeline display-list rendering (`GafMovieClip` timeline mode).
 * Missing runtime (CI fallback) falls back to one cropped atlas sprite per frame.
 * These wrappers only expose the subset of API touched by the editor:
 *
 *   actorClip.footContainer.{loop, gotoAndPlay}
 *   actorClip.leftFoot/rightFoot/leftHand/rightHand.setFrame
 *   actorClip.capeClip.setFrame
 *   actorClip.headClip.clip.gotoAndStop
 *   actorClip.headClip.setDisguise / removeDisguise
 */

function applySlotMatrix(target: Container, slot: ActorPreviewSlot): void {
  if (slot.matrix) {
    const m = new Matrix(
      slot.matrix.a,
      slot.matrix.b,
      slot.matrix.c,
      slot.matrix.d,
      slot.matrix.tx,
      slot.matrix.ty
    );
    const transformWithMatrix = target.transform as typeof target.transform & {
      setFromMatrix?: (matrix: Matrix) => void;
    };
    if (transformWithMatrix.setFromMatrix) {
      transformWithMatrix.setFromMatrix(m);
    } else {
      target.position.set(m.tx, m.ty);
      target.rotation = Math.atan2(m.b, m.a);
      target.scale.set(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
    }
  } else {
    const scale = slot.scale ?? 1;
    target.position.set(slot.x ?? 0, slot.y ?? 0);
    target.rotation = slot.rotation ?? 0;
    target.scale.set(slot.mirrorX ? -scale : scale, scale);
  }
  target.alpha = slot.alpha ?? 1;
}

function makeClip(
  library: string,
  failedTextures: Set<string>,
  options: CreateGafClipOptions = {}
): GafMovieClip {
  return createActorGafClip(
    failedTextures,
    library,
    actorRuntimeManifest,
    gafSources.actorTexture,
    actorAtlasFrames[library] ?? [],
    options
  );
}

function bodyFrameNameFromLabel(label: string): string {
  return label.replace(/^(IDLE|FIRE|RELOAD)_/, '');
}

function findWeaponPreviewConfig(label: string): WeaponPreviewConfig | null {
  const frameName = bodyFrameNameFromLabel(label);
  if (frameName === 'KONGFU_TYPE') return null;
  return WEAPON_PREVIEW_CONFIGS.find((config) => frameName.startsWith(config.frameName)) ?? null;
}

function resolvePreviewClip(linkage: string | undefined, preferredSource?: WeaponClipSource): WeaponPreviewClipConfig | null {
  if (!linkage) return null;

  const hasActorClip = !!actorRuntimeManifest && !!resolveGafTimelineId(actorRuntimeManifest, linkage);
  const hasAssetsClip = !!assetsRuntimeManifest && !!resolveGafTimelineId(assetsRuntimeManifest, linkage);

  if (preferredSource === 'actor' && hasActorClip) return { linkage, source: 'actor' };
  if (preferredSource === 'assets' && hasAssetsClip) return { linkage, source: 'assets' };
  if (hasAssetsClip) return { linkage, source: 'assets' };
  if (hasActorClip) return { linkage, source: 'actor' };
  return null;
}

function resolveWeaponClipConfig(config: WeaponPreviewConfig): WeaponPreviewClipConfig | null {
  return (
    resolvePreviewClip(config.animClip?.weapon, 'actor') ??
    resolvePreviewClip(config.weaponClip) ??
    resolvePreviewClip(config.clip)
  );
}

function resolveReloadClipConfig(config: WeaponPreviewConfig): WeaponPreviewClipConfig | null {
  return resolvePreviewClip(config.animClip?.reload, 'actor') ?? resolvePreviewClip(config.weaponClip) ?? resolvePreviewClip(config.clip);
}

function clearSlotChildren(slot: Container): void {
  for (const child of slot.removeChildren()) {
    if (!child.destroyed) {
      child.destroy({ children: true });
    }
  }
}

const ACTOR_BODY_LIBRARY = 'actor01_body';

type NamedBodyAnimation = Container & {
  rightHand?: Container;
  leftHand?: Container;
  headClip?: Container;
};

type WeaponClipSource = 'actor' | 'assets';

interface WeaponPreviewClipConfig {
  linkage: string;
  source: WeaponClipSource;
}

interface WeaponPreviewConfig {
  frameName: string;
  clip: string;
  weaponClip?: string;
  animClip?: {
    weapon?: string;
    reload?: string;
  };
}

const WEAPON_PREVIEW_CONFIGS: readonly WeaponPreviewConfig[] = [
  { frameName: 'HANDGUN_TYPE', clip: 'lib_handgun', animClip: { weapon: 'anim_handgun', reload: 'anim_handgun_reload' } },
  { frameName: 'RIFLE_TYPE', clip: 'lib_rifle', animClip: { weapon: 'anim_rifle', reload: 'anim_rifle_reload' } },
  { frameName: 'SNIPEGUN_TYPE', clip: 'lib_snipegun', animClip: { weapon: 'anim_sniper', reload: 'anim_sniper_reload' } },
  { frameName: 'SHOTGUN_TYPE', clip: 'lib_shotgun', animClip: { weapon: 'anim_shotgun', reload: 'anim_shotgun_reload' } },
  { frameName: 'BOW_TYPE', clip: 'lib_bow' },
  {
    frameName: 'ANAESTHETIC',
    clip: 'lib_weapon_anaesthetic',
    animClip: { weapon: 'anim_anaestheticRifle', reload: 'anim_anaestheticRifle_reload' }
  },
  {
    frameName: 'FLAMETHROWER_TYPE',
    clip: 'lib_weapon_icon_flamethrower',
    animClip: { weapon: 'anim_flamethrower', reload: 'anim_flamethrower_reload' }
  },
  { frameName: 'LAUNCHER_TYPE', clip: 'lib_weapon_icon_launcher', animClip: { weapon: 'anim_rocketlauncher' } },
  {
    frameName: 'DOUBLEGUNS_TYPE',
    clip: 'lib_doubleguns',
    animClip: { weapon: 'anim_silvereagle', reload: 'anim_silvereagle_reload' }
  },
  { frameName: 'GATLING', clip: 'lib_icon_gatling', weaponClip: 'lib_weapon_gatling' },
  { frameName: 'LASERGUN', clip: 'lib_weapon_lasergun', animClip: { weapon: 'anim_lasergun' } },
  { frameName: 'SHURIKEN', clip: 'lib_shuriken_icon' },
  { frameName: 'MINIGUN', clip: 'lib_minigun', animClip: { weapon: 'anim_minigun' } },
  { frameName: 'KNIFE_TYPE', clip: 'lib_knife' },
  { frameName: 'HOOK_TYPE', clip: 'lib_hook' },
  { frameName: 'SWORD_TYPE', clip: 'lib_sword' },
  { frameName: 'SHIELD_TYPE', clip: 'lib_shieldweapon' },
  { frameName: 'FRISBEE_TYPE', clip: 'lib_frisbee' },
  { frameName: 'SCYTHE', clip: 'lib_weapon_scythe' },
  { frameName: 'GIANTAXE_TYPE', clip: 'lib_giantAxe' },
  { frameName: 'GRENADE_TYPE', clip: 'lib_timebomb' },
  { frameName: 'ICESABER_TYPE', clip: 'lib_icon_icesaber' },
  { frameName: 'ESHOSTSTAFF', clip: 'lib_icon_eshoststaff' },
  { frameName: 'BITE_TYPE', clip: 'lib_zombie_claw' },
  { frameName: 'SPIT_TYPE', clip: 'lib_zombie_claw' },
  { frameName: 'NUNCHAKU', clip: 'lib_weapon_nunchaku' },
  { frameName: 'BLADE_TYPE', clip: 'lib_actor_blade' },
  { frameName: 'REVENGE_BLADE', clip: 'lib_actor_blade' },
  { frameName: 'MAGIC_WAND', clip: 'lib_weapon_magicwand' }
];

/**
 * ActorPart matches the old TWLibLib wrapper: it owns a MovieClip and exposes
 * setFrame(frame, scale). It is intentionally NOT a PIXI Container — only its
 * `.clip` (and `.container` for head/cape) gets parented into the scene graph,
 * which mirrors how ActorClip uses ActorHead / ActorCape in TWLibLib.
 */
export class ActorPart {
  clip: GafMovieClip;

  constructor(library: string, failedTextures: Set<string>) {
    this.clip = makeClip(library, failedTextures);
  }

  setFrame(frame: number, scale = 1): void {
    this.clip.gotoAndStop(frame);
    this.clip.scale.set(scale);
  }

  get frame(): number {
    return this.clip.currentFrame;
  }
}

export class ActorHand extends ActorPart {
  constructor(failedTextures: Set<string>) {
    super(actorPartRuntime.hand.library, failedTextures);
  }
}

export class ActorFoot extends ActorPart {
  constructor(failedTextures: Set<string>) {
    super(actorPartRuntime.foot.library, failedTextures);
  }
}

export class ActorCape extends ActorPart {
  container: Container;

  constructor(failedTextures: Set<string>) {
    super(actorPartRuntime.cape.library, failedTextures);
    this.container = new Container();
    this.container.addChild(this.clip);
  }

  /**
   * Mirrors ActorPart.setFrame + keeps the cape container untouched. In the
   * old TWLibLib ActorCape the `s` scalar is applied only to `this.clip`, NOT
   * the container: the container inherits the GAF placeholder matrix from
   * ActorClip. Overriding this method keeps the explicit contract so future
   * changes to ActorPart.setFrame cannot accidentally touch the outer
   * container's slot transform.
   */
  override setFrame(frame: number, scale = 1): void {
    this.clip.gotoAndStop(frame);
    this.clip.scale.set(scale);
  }
}

export class ActorHead extends ActorPart {
  container: Container;
  private _disguise: Container | null = null;

  constructor(failedTextures: Set<string>) {
    super(actorPartRuntime.head.library, failedTextures);
    this.container = new Container();
    this.container.addChild(this.clip);
  }

  setDisguise(root: Container): void {
    this.removeDisguise();
    this._disguise = root;
    root.name = 'disguise';
    const clipIndex = this.container.getChildIndex(this.clip);
    this.container.addChildAt(root, clipIndex + 1);
    this.clip.visible = false;
  }

  removeDisguise(): void {
    const current = this._disguise;
    if (!current) {
      this.clip.visible = true;
      return;
    }
    current.alpha = 1;
    if (current.parent === this.container) {
      this.container.removeChild(current);
    }
    this._disguise = null;
    this.clip.visible = true;
  }

  get disguise(): Container | null {
    return this._disguise;
  }
}

type FootContainer = Container & {
  loop: boolean;
  gotoAndPlay(frame: number): void;
};

/**
 * ActorClip composes the body-attachment hierarchy consumed by DecoManager:
 *
 *   actorClip
 *     footContainer            (MovieClip-like; only loop/gotoAndPlay stubs)
 *       rightFootSlot          (slot: rightFoot matrix)
 *         rightFoot.clip
 *       leftFootSlot           (slot: leftFoot matrix)
 *         leftFoot.clip
 *     capeClip.container
 *       capeClip.clip
 *     body                     (actor01_body GAF timeline)
 *       animation.rightHand
 *         rightHand.clip
 *       animation.leftHand
 *         leftHand.clip
 *       animation.headClip
 *         headClip.container
 *
 * Body attachments intentionally use the old TWLibLib named GAF placeholders.
 */
export class ActorClip extends Container {
  footContainer: FootContainer;
  body: GafMovieClip;
  rightFoot: ActorFoot;
  leftFoot: ActorFoot;
  capeClip: ActorCape;
  rightHand: ActorHand;
  leftHand: ActorHand;
  headClip: ActorHead;
  private readonly _failedTextures: Set<string>;
  private _bodyAnimationLabel: string;

  constructor(failedTextures: Set<string>, bodyAnimationLabel = DEFAULT_ACTOR_BODY_ANIMATION_LABEL) {
    super();

    this._failedTextures = failedTextures;
    this._bodyAnimationLabel = bodyAnimationLabel;
    this.rightFoot = new ActorFoot(failedTextures);
    this.leftFoot = new ActorFoot(failedTextures);
    this.rightHand = new ActorHand(failedTextures);
    this.leftHand = new ActorHand(failedTextures);
    this.capeClip = new ActorCape(failedTextures);
    this.headClip = new ActorHead(failedTextures);
    this.body = makeClip(ACTOR_BODY_LIBRARY, failedTextures, {
      dedupeNamedParts: true,
      nestedTimelineFrame: 'sequence-relative'
    });

    const footContainer = new Container() as FootContainer;
    footContainer.loop = true;
    footContainer.gotoAndPlay = () => {};
    this.footContainer = footContainer;

    const rightFootSlot = new Container();
    applySlotMatrix(rightFootSlot, actorPreviewSlots.rightFoot);
    rightFootSlot.addChild(this.rightFoot.clip);
    footContainer.addChild(rightFootSlot);

    const leftFootSlot = new Container();
    applySlotMatrix(leftFootSlot, actorPreviewSlots.leftFoot);
    leftFootSlot.addChild(this.leftFoot.clip);
    footContainer.addChild(leftFootSlot);

    this.addChild(footContainer);

    applySlotMatrix(this.capeClip.container, actorPreviewSlots.cape);
    this.addChild(this.capeClip.container);

    this.setBodyFrame(bodyAnimationLabel);
    this.addChild(this.body);
    this.syncCapeToHead();
  }

  get bodyAnimation(): NamedBodyAnimation | null {
    const named = (this.body as unknown as { animation?: Container }).animation;
    if (named instanceof Container) return named as NamedBodyAnimation;
    for (let index = this.body.children.length - 1; index >= 0; index--) {
      const child = this.body.children[index];
      if (child instanceof Container) return child as NamedBodyAnimation;
    }
    return null;
  }

  resetBodyFrame(): void {
    this.setBodyFrame(DEFAULT_ACTOR_BODY_ANIMATION_LABEL);
  }

  getBodyFrameRange(label = DEFAULT_ACTOR_BODY_ANIMATION_LABEL): { startFrame: number; endFrame: number } {
    const active = this.body.getActiveSequenceRange();
    const selected = this.body.getSequenceRange(label);
    const fallbackFrame = this.body.currentFrame;
    return active ?? selected ?? { startFrame: fallbackFrame, endFrame: fallbackFrame };
  }

  setBodyFrame(frame: number | string): void {
    if (typeof frame === 'string') {
      this._bodyAnimationLabel = frame;
    }
    this.detachBodyParts();
    this.body.gotoAndStop(frame);
    this.attachBodyParts();
    this.attachWeaponParts();
    if (this.headClip.container.parent) this.syncCapeToHead();
  }

  private attachBodyParts(animation: NamedBodyAnimation | null = this.bodyAnimation): void {
    if (!animation) return;
    this.attachBodyPart(animation.rightHand, this.rightHand.clip);
    this.attachBodyPart(animation.leftHand, this.leftHand.clip);
    this.attachBodyPart(animation.headClip, this.headClip.container);
  }

  private attachBodyPart(slot: Container | undefined, part: Container): void {
    if (!slot || part.parent === slot) return;
    slot.addChild(part);
  }

  private detachBodyParts(): void {
    this.detachBodyPart(this.rightHand.clip);
    this.detachBodyPart(this.leftHand.clip);
    this.detachBodyPart(this.headClip.container);
  }

  private detachBodyPart(part: Container): void {
    if (part.parent) {
      part.parent.removeChild(part);
    }
  }

  private attachWeaponParts(animation: NamedBodyAnimation | null = this.bodyAnimation): void {
    if (!animation) return;
    const weaponConfig = findWeaponPreviewConfig(this._bodyAnimationLabel);
    if (!weaponConfig) return;

    const weaponClip = resolveWeaponClipConfig(weaponConfig);
    const reloadClip = resolveReloadClipConfig(weaponConfig);
    const sequenceFrame = this.getBodySequenceFrame();

    for (const child of animation.children) {
      if (!(child instanceof Container) || !child.name) continue;
      if (child.name.startsWith('weaponReload')) {
        this.attachWeaponClip(child, reloadClip, sequenceFrame);
      } else if (child.name.startsWith('weapon')) {
        this.attachWeaponClip(child, weaponClip, sequenceFrame);
      }
    }
  }

  private attachWeaponClip(slot: Container, config: WeaponPreviewClipConfig | null, frame: number): void {
    clearSlotChildren(slot);
    if (!config) return;
    const clip = this.createWeaponClip(config);
    clip.name = 'weaponPreview';
    clip.gotoAndStop(frame);
    slot.addChild(clip);
  }

  private createWeaponClip(config: WeaponPreviewClipConfig): GafMovieClip {
    if (config.source === 'actor') {
      return createActorGafClip(
        this._failedTextures,
        config.linkage,
        actorRuntimeManifest,
        gafSources.actorTexture,
        actorAtlasFrames[config.linkage] ?? []
      );
    }
    return createGafClip(
      this._failedTextures,
      config.linkage,
      assetsRuntimeManifest,
      gafSources.assetsTexture,
      []
    );
  }

  private getBodySequenceFrame(): number {
    const active = this.body.getActiveSequenceRange();
    if (!active) return this.body.currentFrame;
    return this.body.currentFrame - active.startFrame + 1;
  }

  private syncCapeToHead(): void {
    this.toLocal({ x: 0, y: 0 }, this.headClip.container, this.capeClip.container.position);
  }
}
