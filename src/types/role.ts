export const PART_TABS = ['deco', 'head', 'hand', 'foot', 'cape'] as const;

export type PartTab = (typeof PART_TABS)[number];
export type BodyPartTab = Exclude<PartTab, 'deco'>;
export type GenderCode = 'male' | 'female';

export interface GafAtlasFrame {
  texture: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
  scale: number;
  /**
   * Optional registration override matching TWLibLib `RoleDecosTexture`:
   * baked `generateTexture` + `getBounds` pivot (-bounds.x, -bounds.y style).
   * When omitted, `pivotX` / `pivotY` from the atlas extractor are used.
   */
  runtimePivotX?: number;
  runtimePivotY?: number;
  /**
   * Optional display size override when the atlas rect size does not match
   * the original GAF movieclip raster bounds.
   */
  runtimeDisplayWidth?: number;
  runtimeDisplayHeight?: number;
}

export interface PartOption {
  id: string;
  code: string;
  category: PartTab;
  label: string;
  icon: string;
  accent: string;
  secondary: string;
  mockKind: 'deco' | 'head' | 'hand' | 'foot' | 'cape';
  source?: 'mock' | 'gaf';
  sourceFile?: string;
  atlas?: GafAtlasFrame;
  actorLibrary?: string;
  frame?: number;
  emptyFrame?: number;
  isEmpty?: boolean;
}

export interface CampOption {
  code: string;
  name: string;
  accent: string;
}

export interface RoleParts {
  head: string;
  hand: string;
  foot: string;
  cape: string;
}

export interface RolePartFrames {
  head: number;
  hand: number;
  foot: number;
  cape: number;
}

export interface RolePartScales {
  head: number;
  hand: number;
  foot: number;
  cape: number;
}

export interface DecorationLayer {
  id: string;
  code: string;
  assetId: string;
  name: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  visible: boolean;
  opacity: number;
}

export type DecorationGroupMember =
  | { type: 'layer'; id: string }
  | { type: 'group'; id: string };

export interface DecorationGroup {
  id: string;
  name: string;
  /** Legacy flat layer ids. For nested groups this is kept as the flattened descendant layer list. */
  itemIds: string[];
  /** Direct group contents. Older files may omit this and use itemIds only. */
  members?: DecorationGroupMember[];
  visible: boolean;
  collapsed: boolean;
}

export interface HeadLayerTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  visible: boolean;
  opacity: number;
}

export interface RoleDocument {
  schemaVersion: 1;
  name: string;
  camp: string;
  gender: GenderCode;
  /** Circular drag clamp radius in head disguise space (matches DecoManager.positionRange). */
  positionRange?: number;
  parts: RoleParts;
  /** Numeric GAF frame selected in the original RoleDecosConfig `{ f, s }` payload. */
  partFrames: RolePartFrames;
  /** Original ActorPart scale `s`. For feet this is applied on the foot container. */
  partScales: RolePartScales;
  /** Top-first virtual layer index of the original RoleDeco HEAD_CODE layer. */
  headLayerIndex: number;
  /** Transform of the original `c:"head"` RoleDeco layer inside the head disguise root. */
  headLayer: HeadLayerTransform;
  decorations: DecorationLayer[];
  groups: DecorationGroup[];
  updatedAt: string;
}

export interface EditorClipboardItem extends Omit<DecorationLayer, 'id'> {}

export interface TransformValues {
  rotate: number;
  scale: number;
  ratio: number;
  posX: number;
  posY: number;
}

export interface ImportResult {
  role: RoleDocument;
  warnings: string[];
}
