import type { RoleDocument } from '../types/role';
import { cloneRole } from './editorRoleUtils';

export const LOCAL_HISTORY_LIMIT = 200;

export function sameRole(a: RoleDocument, b: RoleDocument): boolean {
  if (a === b) return true;
  if (a.decorations.length !== b.decorations.length) return false;
  if ((a.groups ?? []).length !== (b.groups ?? []).length) return false;
  return JSON.stringify({ ...a, updatedAt: undefined }) === JSON.stringify({ ...b, updatedAt: undefined });
}

export function pushLocalPast(items: RoleDocument[], snapshot: RoleDocument): RoleDocument[] {
  return [...items, cloneRole(snapshot)].slice(-LOCAL_HISTORY_LIMIT);
}

export function pushLocalFuture(items: RoleDocument[], snapshot: RoleDocument): RoleDocument[] {
  return [cloneRole(snapshot), ...items].slice(0, LOCAL_HISTORY_LIMIT);
}
