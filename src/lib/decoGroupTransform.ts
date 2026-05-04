import type { DecorationLayer } from '../types/role';

/**
 * Recreation of the old TWRoleCgEditor DecoController group model used when
 * more than one Deco is selected. The original editor wraps the selection in
 * a PIXI.Container and lets the Scale/Ratio/Rotate sliders manipulate the
 * parent. Each child deco is then recomputed from `parent(matrix) x child`,
 * with the child matrices captured at selection time.
 *
 * This module provides the pure-data equivalents so the React editor's
 * `useRoleEditor` can mirror the same semantics without owning a PIXI scene
 * graph for the edit controller.
 */

export interface DecoGroupInitialItem {
  /** Item offset relative to selection centroid, using snapshot world coords. */
  relX: number;
  relY: number;
  /** PIXI-style signed scale captured at selection time. */
  scaleX: number;
  scaleY: number;
  /** Rotation in degrees, matching DecorationLayer.rotation. */
  rotation: number;
}

export interface DecoGroupSnapshot {
  /** Order-preserving join of selected ids. Used as an identity for React deps. */
  key: string;
  /** Average of selected decos' `x`/`y` in world coords. */
  centroidX: number;
  centroidY: number;
  /** The first selected deco drives the Pos X/Y slider display (matches old). */
  firstId: string;
  /** Per-deco snapshot, keyed by deco id. */
  items: Record<string, DecoGroupInitialItem>;
}

export interface DecoGroupParentTransform {
  /** Parent container scaleX (1 at selection time; sign indicates flip). */
  scaleX: number;
  /** Parent container scaleY (1 at selection time; sign indicates flip). */
  scaleY: number;
  /** Parent container rotation, in degrees. */
  rotationDeg: number;
  /** Cumulative translation of the group parent since selection time. */
  dx: number;
  dy: number;
}

export const DECO_GROUP_IDENTITY: DecoGroupParentTransform = {
  scaleX: 1,
  scaleY: 1,
  rotationDeg: 0,
  dx: 0,
  dy: 0
};

/** Build a stable snapshot key from an ordered list of decoration ids. */
export function snapshotKeyFromIds(ids: string[]): string {
  return ids.join('|');
}

/** Creates a snapshot capturing the centroid and per-deco initial transforms. */
export function snapshotGroupSelection(
  orderedSelection: DecorationLayer[]
): DecoGroupSnapshot | null {
  if (orderedSelection.length < 2) return null;

  const ids = orderedSelection.map((item) => item.id);
  const centroidX = orderedSelection.reduce((sum, item) => sum + item.x, 0) / orderedSelection.length;
  const centroidY = orderedSelection.reduce((sum, item) => sum + item.y, 0) / orderedSelection.length;

  const items: Record<string, DecoGroupInitialItem> = {};
  for (const item of orderedSelection) {
    items[item.id] = {
      relX: item.x - centroidX,
      relY: item.y - centroidY,
      scaleX: item.scaleX,
      scaleY: item.scaleY,
      rotation: item.rotation
    };
  }

  return {
    key: snapshotKeyFromIds(ids),
    centroidX,
    centroidY,
    firstId: orderedSelection[0].id,
    items
  };
}

export interface DecoGroupDerivedTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  /** Rotation in degrees, suitable for writing back to DecorationLayer.rotation. */
  rotation: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Applies the parent transform to a single snapshot item, mirroring the
 * matrix decomposition in the old DecoController.updateDeco(). Returns the
 * child's new x/y/scale/rotation (rotation in degrees, signed scaleY for
 * flip preservation).
 */
export function applyGroupParentToItem(
  parent: DecoGroupParentTransform,
  snapshot: DecoGroupSnapshot,
  itemId: string
): DecoGroupDerivedTransform | null {
  const initial = snapshot.items[itemId];
  if (!initial) return null;

  const parentRotRad = parent.rotationDeg * DEG_TO_RAD;
  const pcos = Math.cos(parentRotRad);
  const psin = Math.sin(parentRotRad);

  const relX = initial.relX * parent.scaleX;
  const relY = initial.relY * parent.scaleY;
  const rotatedX = pcos * relX - psin * relY;
  const rotatedY = psin * relX + pcos * relY;
  const x = snapshot.centroidX + parent.dx + rotatedX;
  const y = snapshot.centroidY + parent.dy + rotatedY;

  const p_a = parent.scaleX * pcos;
  const p_b = parent.scaleX * psin;
  const p_c = parent.scaleY * -psin;
  const p_d = parent.scaleY * pcos;

  const childRotRad = initial.rotation * DEG_TO_RAD;
  const ccos = Math.cos(childRotRad);
  const csin = Math.sin(childRotRad);
  const c_a = initial.scaleX * ccos;
  const c_b = initial.scaleX * csin;
  const c_c = initial.scaleY * -csin;
  const c_d = initial.scaleY * ccos;

  const a_val = p_a * c_a + p_c * c_b;
  const b_val = p_b * c_a + p_d * c_b;
  const c_val = p_a * c_c + p_c * c_d;
  const d_val = p_b * c_c + p_d * c_d;

  const rotation = Math.atan2(b_val, a_val) * RAD_TO_DEG;
  const magnitudeX = Math.hypot(a_val, b_val);
  const magnitudeY = Math.hypot(c_val, d_val);
  const det = a_val * d_val - b_val * c_val;
  const scaleY = det < 0 ? -magnitudeY : magnitudeY;

  return {
    x,
    y,
    scaleX: magnitudeX,
    scaleY,
    rotation
  };
}

/** Computes the "current" first deco position given the parent transform. */
export function deriveFirstItemPosition(
  parent: DecoGroupParentTransform,
  snapshot: DecoGroupSnapshot
): { x: number; y: number } | null {
  const derived = applyGroupParentToItem(parent, snapshot, snapshot.firstId);
  if (!derived) return null;
  return { x: derived.x, y: derived.y };
}
