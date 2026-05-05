// Lightweight reconstruction of the visible Role Editor preview rig.
//
// `headClip.container` in TWLibLib wraps the GAF head clip plus the disguise root
// (`decoManager.root`); decorations are parented inside that container after the
// clip so they inherit head transforms and sit under body attachments.
//
// Important correction after comparing against the original preview: ActorClip
// does not lay head/hand/foot/cape out with hand-authored UI offsets. Head and
// hands attach to body-animation placeholders, feet attach to actor01_feet
// placeholders, and cape is synchronized to headClip.container by ActorClip
// itself while lib_actor_cape keeps its own frame orientation.

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
  bodyAnimation: ['rightHand.clip', 'leftHand.clip', 'headClip.container']
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
    // Old ActorClip positions capeClip.container from headClip.container; this slot only keeps the outer transform neutral.
    matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
    fallbackSize: 40
  },

  // Composite matrices from actor01_body IDLE_KONGFU_TYPE -> bodyAnimation placeholders in twactor.gaf.
  rightHand: {
    matrix: { a: 0.7641164134256542, b: 0.6445249184034765, c: 0.6445249184034765, d: -0.7641164134256542, tx: -5.501858520437963, ty: 19.300045013427734 },
    fallbackSize: 32
  },
  leftHand: {
    matrix: { a: 0.8701622416265309, b: -0.4920315444469452, c: 0.4920315444469452, d: 0.8701622416265309, tx: 9.70130443572998, ty: -15.248562622087775 },
    fallbackSize: 32
  },
  head: {
    matrix: { a: 0.9913136325776577, b: -0.1216133451089263, c: 0.1216133451089263, d: 0.9913136325776577, tx: -6.049986267834356, ty: -1.1500045835972514 },
    fallbackSize: 32
  },

  // Extracted from actor01_feet normal frame placeholders in twactor.gaf.
  rightFoot: {
    matrix: { a: -0.0610198974609375, b: 0.996734619140625, c: 0.996734619140625, d: 0.0610198974609375, tx: 5.0, ty: 8.2 },
    fallbackSize: 32
  },
  leftFoot: {
    matrix: { a: 0.057342529296875, b: -0.9974822998046875, c: 0.9974822998046875, d: 0.057342529296875, tx: -4.8, ty: -7.05 },
    fallbackSize: 32
  }
} satisfies Record<string, ActorPreviewSlot>;
