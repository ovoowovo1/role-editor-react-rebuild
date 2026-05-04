import { Container, Matrix } from 'pixi.js';
import { actorAtlasFrames, actorRuntimeManifest, gafSources } from '../mock/gafManifest';
import { actorPreviewSlots, type ActorPreviewSlot } from './actorClipAdapter';
import { actorPartRuntime } from './twlibPartRuntime';
import { createActorGafClip, type GafMovieClip } from './gafMovieClip';

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

function makeClip(library: string, failedTextures: Set<string>): GafMovieClip {
  return createActorGafClip(
    failedTextures,
    library,
    actorRuntimeManifest,
    gafSources.actorTexture,
    actorAtlasFrames[library] ?? []
  );
}

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
 *     capeClip.container       (slot: cape matrix)
 *       capeClip.clip
 *     bodyAttachmentContainer
 *       rightHandSlot          (slot: rightHand matrix)
 *         rightHand.clip
 *       leftHandSlot           (slot: leftHand matrix)
 *         leftHand.clip
 *       headClip.container     (slot: head matrix)
 *         headClip.clip
 *         [disguise]           (set via headClip.setDisguise)
 *
 * Slot matrices live on dedicated slot holders so setFrame(scale) on the inner
 * clip does not overwrite the GAF placeholder transform.
 */
export class ActorClip extends Container {
  footContainer: FootContainer;
  rightFoot: ActorFoot;
  leftFoot: ActorFoot;
  capeClip: ActorCape;
  rightHand: ActorHand;
  leftHand: ActorHand;
  bodyAttachmentContainer: Container;
  headClip: ActorHead;

  constructor(failedTextures: Set<string>) {
    super();

    this.rightFoot = new ActorFoot(failedTextures);
    this.leftFoot = new ActorFoot(failedTextures);
    this.rightHand = new ActorHand(failedTextures);
    this.leftHand = new ActorHand(failedTextures);
    this.capeClip = new ActorCape(failedTextures);
    this.headClip = new ActorHead(failedTextures);

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

    this.bodyAttachmentContainer = new Container();

    const rightHandSlot = new Container();
    applySlotMatrix(rightHandSlot, actorPreviewSlots.rightHand);
    rightHandSlot.addChild(this.rightHand.clip);
    this.bodyAttachmentContainer.addChild(rightHandSlot);

    const leftHandSlot = new Container();
    applySlotMatrix(leftHandSlot, actorPreviewSlots.leftHand);
    leftHandSlot.addChild(this.leftHand.clip);
    this.bodyAttachmentContainer.addChild(leftHandSlot);

    applySlotMatrix(this.headClip.container, actorPreviewSlots.head);
    this.bodyAttachmentContainer.addChild(this.headClip.container);

    this.addChild(this.bodyAttachmentContainer);
  }
}
