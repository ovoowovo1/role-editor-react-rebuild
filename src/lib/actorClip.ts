import { Container, Matrix } from 'pixi.js';
import { actorAtlasFrames, actorRuntimeManifest, gafSources } from '../mock/gafManifest';
import { actorPreviewSlots, type ActorPreviewSlot } from './actorClipAdapter';
import { actorPartRuntime } from './twlibPartRuntime';
import { DEFAULT_ACTOR_BODY_ANIMATION_LABEL } from './actorBodyAnimation';
import { createActorGafClip, type CreateGafClipOptions, type GafMovieClip } from './gafMovieClip';

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

const ACTOR_BODY_LIBRARY = 'actor01_body';

type NamedBodyAnimation = Container & {
  rightHand?: Container;
  leftHand?: Container;
  headClip?: Container;
};

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

  constructor(failedTextures: Set<string>, bodyAnimationLabel = DEFAULT_ACTOR_BODY_ANIMATION_LABEL) {
    super();

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
    this.detachBodyParts();
    this.body.gotoAndStop(frame);
    this.attachBodyParts();
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

  private syncCapeToHead(): void {
    this.toLocal({ x: 0, y: 0 }, this.headClip.container, this.capeClip.container.position);
  }
}
