import type { DecorationLayer, RoleDocument } from '../types/role';
import { atomsForRole, clamp, deriveRoleFromAtoms } from './layerOrdering';

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
  const atoms = atomsForRole(role);
  if (settings.placement === 'top') return 0;
  if (settings.placement === 'bottom') return atoms.length;
  const numeric = Number(settings.index);
  if (!Number.isInteger(numeric) || numeric < 1) return atoms.length;
  return clamp(numeric, 0, atoms.length);
}

export function insertDecorations(role: RoleDocument, decorations: DecorationLayer[], settings: InsertDraftSettings): RoleDocument {
  if (!decorations.length) return role;
  const atoms = atomsForRole(role);
  const insertIndex = getInsertVirtualIndex(role, settings);
  const nextAtoms = [
    ...atoms.slice(0, insertIndex),
    ...decorations.map((item) => item.id),
    ...atoms.slice(insertIndex)
  ];
  const extras = new Map(decorations.map((item) => [item.id, item]));
  return deriveRoleFromAtoms(role, nextAtoms, extras);
}

