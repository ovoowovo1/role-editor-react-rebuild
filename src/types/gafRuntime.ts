/** Build-time serialized GAF timeline data for Pixi timeline preview. */

export interface GafElementSerialized {
  atlasID: string;
  elementAtlasID: string;
  region: { x: number; y: number; width: number; height: number };
  pivotX: number;
  pivotY: number;
  scaleX: number;
  scaleY: number;
  linkageName: string;
}

export interface GafMatrixSerialized {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface GafFrameInstanceSerialized {
  objectId: string;
  zIndex: number;
  alpha: number;
  /** Mask slot / state reference when present in binary */
  maskId: string | null;
  /** GAF color transform params: alpha multiplier, RGB multipliers and RGB offsets. */
  colorTransform: number[] | null;
  matrix: GafMatrixSerialized;
}

export interface GafAnimationObjectSerialized {
  regionId: string;
  type: string;
  mask: boolean;
}

export interface GafSequenceSerialized {
  startFrame: number;
  endFrame: number;
}

export interface GafTimelineSerialized {
  id: string;
  linkage: string;
  framesCount: number;
  bounds: { x: number; y: number; width: number; height: number };
  pivot: { x: number; y: number };
  animationObjects: Record<string, GafAnimationObjectSerialized>;
  /** GAF named parts, keyed by animation object id. Used by the actor body to expose rightHand/leftHand/headClip slots. */
  namedParts?: Record<string, string>;
  sequences?: Record<string, GafSequenceSerialized>;
  frames: Record<string, GafFrameInstanceSerialized[]>;
}

export interface GafRuntimeManifest {
  elements: Record<string, GafElementSerialized>;
  timelinesById: Record<string, GafTimelineSerialized>;
  timelinesByLinkage: Record<string, string>;
}

export type ActorGafRuntimeManifest = GafRuntimeManifest;
