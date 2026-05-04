/** Build-time serialized GAF timeline data for Pixi timeline preview (TW actor parts). */

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
  matrix: GafMatrixSerialized;
}

export interface GafAnimationObjectSerialized {
  regionId: string;
  type: string;
  mask: boolean;
}

export interface GafTimelineSerialized {
  id: string;
  linkage: string;
  framesCount: number;
  bounds: { x: number; y: number; width: number; height: number };
  pivot: { x: number; y: number };
  animationObjects: Record<string, GafAnimationObjectSerialized>;
  frames: Record<string, GafFrameInstanceSerialized[]>;
}

export interface ActorGafRuntimeManifest {
  elements: Record<string, GafElementSerialized>;
  timelinesById: Record<string, GafTimelineSerialized>;
  timelinesByLinkage: Record<string, string>;
}
