import {
  GROUP_ROW_PREFIX,
  HEAD_ATOM,
  HEAD_LAYER_ID,
  HEAD_ROW_ID,
  ITEM_ROW_PREFIX
} from '../constants/layers';
import type { DecorationLayer, RoleDocument } from '../types/role';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getHeadLayerIndex(role: RoleDocument): number {
  const raw = Number(role.headLayerIndex);
  const count = role.decorations.length;
  return clamp(Number.isFinite(raw) ? Math.round(raw) : count, 0, count);
}

export function atomToLayerId(atom: string): string {
  return atom === HEAD_ATOM ? HEAD_LAYER_ID : atom;
}

export function layerIdToAtom(id: string): string {
  return id === HEAD_LAYER_ID ? HEAD_ATOM : id;
}

export function atomsForRole(role: RoleDocument): string[] {
  const atoms = role.decorations.map((item) => item.id);
  atoms.splice(getHeadLayerIndex(role), 0, HEAD_ATOM);
  return atoms;
}

export function layerIdsForRole(role: RoleDocument): string[] {
  return atomsForRole(role).map(atomToLayerId);
}

export function orderedLayerIds(role: RoleDocument, ids: string[]): string[] {
  const wanted = new Set(ids.map(layerIdToAtom));
  return atomsForRole(role).filter((atom) => wanted.has(atom)).map(atomToLayerId);
}

export function rowIdToAtoms(role: RoleDocument, rowId: string): string[] {
  if (rowId === HEAD_ROW_ID) return [HEAD_ATOM];
  if (rowId.startsWith(ITEM_ROW_PREFIX)) return [rowId.slice(ITEM_ROW_PREFIX.length)];
  if (rowId.startsWith(GROUP_ROW_PREFIX)) {
    const groupId = rowId.slice(GROUP_ROW_PREFIX.length);
    const group = role.groups?.find((item) => item.id === groupId);
    return group ? orderedLayerIds(role, group.itemIds).map(layerIdToAtom) : [];
  }
  return [rowId];
}

export function deriveRoleFromAtoms(
  role: RoleDocument,
  atoms: string[],
  extraDecorations: Map<string, DecorationLayer> = new Map()
): RoleDocument {
  const decorationById = new Map(role.decorations.map((item) => [item.id, item] as const));
  extraDecorations.forEach((item, id) => decorationById.set(id, item));
  const decorations = atoms
    .filter((atom) => atom !== HEAD_ATOM)
    .map((atom) => decorationById.get(atom))
    .filter((item): item is DecorationLayer => Boolean(item));
  const headAtomIndex = atoms.indexOf(HEAD_ATOM);
  const headLayerIndex = atoms.slice(0, headAtomIndex < 0 ? atoms.length : headAtomIndex).filter((atom) => atom !== HEAD_ATOM).length;
  return {
    ...role,
    decorations,
    headLayerIndex: clamp(headLayerIndex, 0, decorations.length),
    updatedAt: new Date().toISOString()
  };
}

