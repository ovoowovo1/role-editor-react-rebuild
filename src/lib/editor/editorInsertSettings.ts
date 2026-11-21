import type { DecorationLayer, RoleDocument } from '../../types/role';
import { HEAD_ATOM, HEAD_LAYER_ID } from '../../constants/layers';
import { atomsForRole, deriveRoleFromAtoms, getHeadLayerIndex } from './layerOrdering';
import { clamp } from '../math';

export type InsertDraftPlacement = 'top' | 'bottom' | 'after_index';

export interface InsertDraftScopes {
  palette: boolean;
  copy: boolean;
  mergeBatch: boolean;
}

export interface InsertDraftSettings {
  placement: InsertDraftPlacement;
  index: string;
  scopes: InsertDraftScopes;
}

export const DEFAULT_INSERT_SETTINGS: InsertDraftSettings = {
  placement: 'top',
  index: '1',
  scopes: {
    palette: true,
    copy: true,
    mergeBatch: true
  }
};

export function settingsForScope(settings: InsertDraftSettings, enabled: boolean): InsertDraftSettings {
  return enabled ? settings : { ...settings, placement: 'bottom' };
}

export function sanitizeInsertDraftSettings(settings: InsertDraftSettings): InsertDraftSettings {
  return {
    placement: settings.placement,
    index: settings.index,
    scopes: {
      palette: Boolean(settings.scopes.palette),
      copy: Boolean(settings.scopes.copy),
      mergeBatch: Boolean(settings.scopes.mergeBatch)
    }
  };
}

export function getInsertVirtualIndex(role: RoleDocument, settings: InsertDraftSettings): number {
  return insertIndexForVirtualLength(atomsForRole(role).length, settings);
}

function insertIndexForVirtualLength(virtualLength: number, settings: InsertDraftSettings): number {
  if (settings.placement === 'top') return 0;
  if (settings.placement === 'bottom') return virtualLength;
  const numeric = Number(settings.index);
  if (!Number.isInteger(numeric) || numeric < 1) return virtualLength;
  return clamp(numeric, 0, virtualLength);
}

function insertViaAtoms(
  role: RoleDocument,
  decorations: DecorationLayer[],
  settings: InsertDraftSettings
): RoleDocument {
  const atoms = atomsForRole(role);
  const insertIndex = insertIndexForVirtualLength(atoms.length, settings);
  const nextAtoms = [
    ...atoms.slice(0, insertIndex),
    ...decorations.map((item) => item.id),
    ...atoms.slice(insertIndex)
  ];
  const extras = new Map(decorations.map((item) => [item.id, item]));
  return deriveRoleFromAtoms(role, nextAtoms, extras);
}

export function insertDecorations(role: RoleDocument, decorations: DecorationLayer[], settings: InsertDraftSettings): RoleDocument {
  if (!decorations.length) return role;

  const seen = new Set<string>();
  const previous = role.decorations;

  // For well-formed unique IDs, the virtual stack is exactly the decorations
  // plus one head marker. Guard the old lookup semantics before copying
  // directly: collisions are last-ID-wins and malformed input may throw.
  for (const list of [previous, decorations]) {
    for (let index = 0; index < list.length; index++) {
      const id = list[index]?.id;
      if (typeof id !== 'string' || id === HEAD_ATOM || id === HEAD_LAYER_ID || seen.has(id)) {
        return insertViaAtoms(role, decorations, settings);
      }
      seen.add(id);
    }
  }

  const head = getHeadLayerIndex(role);
  const virtualIndex = insertIndexForVirtualLength(previous.length + 1, settings);
  const beforeHead = virtualIndex <= head;
  const insertIndex = beforeHead ? virtualIndex : virtualIndex - 1;
  const next = new Array<DecorationLayer>(previous.length + decorations.length);
  for (let index = 0; index < insertIndex; index++) next[index] = previous[index];
  for (let index = 0; index < decorations.length; index++) next[insertIndex + index] = decorations[index];
  for (let index = insertIndex; index < previous.length; index++) next[index + decorations.length] = previous[index];

  return {
    ...role,
    decorations: next,
    headLayerIndex: head + (beforeHead ? decorations.length : 0),
    updatedAt: new Date().toISOString()
  };
}
