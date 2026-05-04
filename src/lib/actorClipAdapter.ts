// Lightweight reconstruction of the visible Role Editor preview rig.
//
// `headClip.container` in TWLibLib wraps the GAF head clip plus the disguise root
// (`decoManager.root`); decorations are parented inside that container after the
// clip so they inherit head transforms and sit under body attachments.
//
// Important correction after comparing against the original preview: ActorClip
// does not lay head/hand/foot/cape out with hand-authored UI offsets. The
// uploaded TwilightWarsLib bundle shows that ActorClip attaches parts into GAF
// placeholders named rightHand, leftHand, headClip, rightFoot and leftFoot. The
// transforms below are extracted from the uploaded GAF timeline data
// (public/assets/gaf/twactor.gaf) for the idle/normal ActorClip placeholders so
// the preview matches the original runtime layout. They are NOT free to tweak
// for visual taste -- adjust ACTOR_BODY_SCALE or stageScale instead, or
// re-extract from the GAF binary if values change.

export interface ActorPreviewMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface ActorPreviewSlot {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  mirrorX?: boolean;
  alpha?: number;
  fallbackSize?: number;
  matrix?: ActorPreviewMatrix;
}

export const actorClipHierarchy = {
  root: ['footContainer', 'capeClip.container', 'bodyAttachmentContainer'],
  footContainer: ['rightFoot.clip', 'leftFoot.clip'],
  bodyAnimation: ['capeClip.container', 'rightHand.clip', 'leftHand.clip', 'headClip.container']
} as const;

/**
 * Outer scale for the whole ActorClip-equivalent rig. The original TWLibLib
 * ActorClip renders its GAFMovieClip at natural size (1.0) directly under
 * `actorStage`, without any wrapper scale. The rebuild matches that by keeping
 * this factor at 1 so slot matrices -- which are in GAF coords where atlas
 * pixels equal preview pixels -- compose correctly under stageScale alone.
 */
export const ACTOR_BODY_SCALE = 1;

export const actorPreviewSlots = {
  // Extracted from ActorClip body attachment placeholders in
  // public/assets/gaf/twactor.gaf. Matrix values are PIXI-style: [a, b, c, d, tx, ty].
  cape: {
    matrix: { a: 1, b: 0, c: -1, d: 1, tx: -18.6, ty: -1.15 },
    alpha: 0.9,
    fallbackSize: 40
  },
  rightHand: {
    matrix: { a: 0.785636, b: -0.614399, c: 0.573399, d: 0.733209, tx: 11.75, ty: -15.9 },
    fallbackSize: 32
  },
  leftHand: {
    matrix: { a: 0.29472, b: -0.95278, c: -0.8892, d: -0.27482, tx: 24.55, ty: -2.8 },
    fallbackSize: 32
  },
  head: {
    matrix: { a: 1, b: 0, c: 0, d: 1, tx: 2.75, ty: 0.5 },
    fallbackSize: 32
  },

  // Extracted from actor01_feet normal frame placeholders in twactor.gaf.
  rightFoot: {
    matrix: { a: 1, b: -0.061996, c: 0.997, d: 0.997, tx: 5.0, ty: 8.2 },
    fallbackSize: 32
  },
  leftFoot: {
    matrix: { a: 1, b: 0.057343, c: -0.997482, d: 0.997482, tx: -4.8, ty: -7.05 },
    fallbackSize: 32
  }
} satisfies Record<string, ActorPreviewSlot>;
