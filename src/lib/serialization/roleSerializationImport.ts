import type { ImportResult, RoleDocument } from '../../types/role';
import { applyLegacyPayloadMetadata } from './legacyImportMetadata';
import { asRecord, readProperty } from './rawInput';
import { normalizeRoleDocument } from './roleSchemaV1';
import { convertLegacyRole } from './roleLegacyNormalizer';
import { isMissingDecoAssetId } from './roleSerializationLegacy';
import { decodeRolePayload } from './rolePayloadDecoder';

function collectMissingDecoCodes(role: RoleDocument): string[] {
  const missing = new Set<string>();
  for (const deco of role.decorations) {
    if (isMissingDecoAssetId(deco.assetId)) missing.add(deco.code);
  }
  return [...missing];
}

export function normalizeImportedRole(raw: unknown): ImportResult {
  const warnings: string[] = [];
  const envelope = asRecord(raw) ?? {};
  const data = asRecord(readProperty(envelope, 'data'));
  const roleEnvelope = asRecord(readProperty(envelope, 'role'));
  const candidate = readProperty(data, 'schemaVersion') === 1 ? data
    : readProperty(roleEnvelope, 'schemaVersion') === 1 ? roleEnvelope
      : envelope;

  let role: RoleDocument;
  if (readProperty(candidate, 'schemaVersion') === 1 && asRecord(readProperty(candidate, 'parts')) && Array.isArray(readProperty(candidate, 'decorations'))) {
    role = normalizeRoleDocument(candidate, envelope);
  } else {
    warnings.push('Imported a legacy or foreign role file. Original ActorPart frames/scales and deco sx/sy/r were preserved when present.');
    role = convertLegacyRole(data ?? envelope, envelope);
  }

  const missingCodes = collectMissingDecoCodes(role);
  if (missingCodes.length) {
    const preview = missingCodes.slice(0, 5).join(', ');
    const suffix = missingCodes.length > 5 ? `, ??${missingCodes.length - 5} more)` : '';
    warnings.push(`Missing deco symbols preserved as placeholders: ${preview}${suffix}.`);
  }

  return applyLegacyPayloadMetadata({ role, warnings }, envelope);
}

export function parseRoleBytes(bytes: Uint8Array): ImportResult {
  return normalizeImportedRole(decodeRolePayload(bytes));
}

export async function parseRoleFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  return parseRoleBytes(new Uint8Array(buffer));
}
