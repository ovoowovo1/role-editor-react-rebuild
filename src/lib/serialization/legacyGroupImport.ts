import { ungzip } from 'pako';
import type { GenderCode, ImportResult } from '../../types/role';
import { normalizeLegacyDecoGroups } from './legacyDecoGroups';
import { parseRoleFile, parseRoleFileInWorker } from './roleSerialization';

interface LegacyCampGender {
  camp: string;
  gender: GenderCode;
}

type LegacyPayload = Record<string, unknown>;

const CAMP_GENDER_BY_LEGACY_DR: Record<number, LegacyCampGender> = {
  0: { camp: 'skydow', gender: 'male' },
  1: { camp: 'skydow', gender: 'female' },
  4: { camp: 'royal', gender: 'male' },
  5: { camp: 'royal', gender: 'female' },
  8: { camp: 'third', gender: 'male' },
  9: { camp: 'third', gender: 'female' },
  13: { camp: 'civil', gender: 'male' },
  14: { camp: 'civil', gender: 'female' }
};

function isTwroleBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0 && bytes[1] === 1;
}

function asRecord(value: unknown): LegacyPayload | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as LegacyPayload : null;
}

function readPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return current;
}

async function readLegacyPayload(file: File): Promise<LegacyPayload | null> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jsonText = isTwroleBytes(bytes)
      ? new TextDecoder().decode(ungzip(bytes.slice(2)))
      : new TextDecoder().decode(bytes);
    return asRecord(JSON.parse(jsonText));
  } catch {
    return null;
  }
}

export function getLegacyCampGender(payload: unknown): LegacyCampGender | null {
  const rawDr = readPath(payload, ['data', 'dr']) ?? readPath(payload, ['dr']);
  const dr = typeof rawDr === 'number' ? rawDr : typeof rawDr === 'string' ? Number(rawDr) : NaN;
  if (!Number.isInteger(dr)) return null;
  return CAMP_GENDER_BY_LEGACY_DR[dr] ?? null;
}

export function applyLegacyPayloadMetadata(result: ImportResult, payload: unknown): ImportResult {
  const rawGroups =
    readPath(payload, ['decoGroups']) ??
    readPath(payload, ['data', 'decoGroups']) ??
    readPath(payload, ['data', 'cr', 'decoGroups']);
  const groups = normalizeLegacyDecoGroups(rawGroups, result.role);
  const campGender = getLegacyCampGender(payload);

  return {
    ...result,
    role: {
      ...result.role,
      ...(campGender ? { camp: campGender.camp, gender: campGender.gender } : {}),
      ...(groups.length ? { groups } : {})
    }
  };
}

export async function parseRoleFileWithLegacyGroups(file: File): Promise<ImportResult> {
  const [result, payload] = await Promise.all([parseRoleFile(file), readLegacyPayload(file)]);
  return applyLegacyPayloadMetadata(result, payload);
}

export async function parseRoleFileInWorkerWithLegacyGroups(file: File): Promise<ImportResult> {
  const [result, payload] = await Promise.all([parseRoleFileInWorker(file), readLegacyPayload(file)]);
  return applyLegacyPayloadMetadata(result, payload);
}
