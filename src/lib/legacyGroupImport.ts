import { ungzip } from 'pako';
import type { DecorationGroup, ImportResult, RoleDocument } from '../types/role';
import { parseRoleFile, parseRoleFileInWorker } from './roleSerialization';

const HEAD_LAYER_ID = '__head_layer__';

interface LegacyDecoGroupInput {
  id?: unknown;
  name?: unknown;
  visible?: unknown;
  collapsed?: unknown;
  itemIndexes?: unknown;
  itemIds?: unknown;
}

function isTwroleBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0 && bytes[1] === 1;
}

async function readLegacyPayload(file: File): Promise<any | null> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jsonText = isTwroleBytes(bytes)
      ? new TextDecoder().decode(ungzip(bytes.slice(2)))
      : new TextDecoder().decode(bytes);
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function clampHeadLayerIndex(role: RoleDocument): number {
  const raw = Number(role.headLayerIndex);
  const count = role.decorations.length;
  return Math.max(0, Math.min(count, Number.isFinite(raw) ? Math.round(raw) : count));
}

function bottomToTopLayerIds(role: RoleDocument): string[] {
  const topFirst = role.decorations.map((item) => item.id);
  topFirst.splice(clampHeadLayerIndex(role), 0, HEAD_LAYER_ID);
  return topFirst.reverse();
}

function normalizeItemIdsFromLegacyGroup(group: LegacyDecoGroupInput, role: RoleDocument): string[] {
  if (Array.isArray(group.itemIndexes)) {
    const byLegacyIndex = bottomToTopLayerIds(role);
    return group.itemIndexes
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < byLegacyIndex.length)
      .map((index) => byLegacyIndex[index])
      .filter((id, index, ids) => Boolean(id) && ids.indexOf(id) === index);
  }

  if (Array.isArray(group.itemIds)) {
    const valid = new Set([...role.decorations.map((item) => item.id), HEAD_LAYER_ID]);
    return group.itemIds
      .map((value) => String(value))
      .filter((id, index, ids) => valid.has(id) && ids.indexOf(id) === index);
  }

  return [];
}

function normalizeLegacyDecoGroups(rawGroups: unknown, role: RoleDocument): DecorationGroup[] {
  if (!Array.isArray(rawGroups)) return [];
  return rawGroups
    .map((raw, index): DecorationGroup | null => {
      if (!raw || typeof raw !== 'object') return null;
      const group = raw as LegacyDecoGroupInput;
      const itemIds = normalizeItemIdsFromLegacyGroup(group, role);
      if (itemIds.length < 2) return null;
      return {
        id: typeof group.id === 'string' && group.id ? group.id : `group_${Date.now()}_${index}`,
        name: typeof group.name === 'string' && group.name ? group.name : `Group ${index + 1}`,
        visible: group.visible !== false,
        collapsed: group.collapsed === true,
        itemIds
      };
    })
    .filter((group): group is DecorationGroup => group !== null);
}

function applyLegacyDecoGroups(result: ImportResult, payload: any | null): ImportResult {
  const rawGroups = payload?.decoGroups ?? payload?.data?.decoGroups ?? payload?.data?.cr?.decoGroups;
  const groups = normalizeLegacyDecoGroups(rawGroups, result.role);
  if (!groups.length) return result;
  return {
    ...result,
    role: {
      ...result.role,
      groups
    }
  };
}

export async function parseRoleFileWithLegacyGroups(file: File): Promise<ImportResult> {
  const [result, payload] = await Promise.all([parseRoleFile(file), readLegacyPayload(file)]);
  return applyLegacyDecoGroups(result, payload);
}

export async function parseRoleFileInWorkerWithLegacyGroups(file: File): Promise<ImportResult> {
  const [result, payload] = await Promise.all([parseRoleFileInWorker(file), readLegacyPayload(file)]);
  return applyLegacyDecoGroups(result, payload);
}
