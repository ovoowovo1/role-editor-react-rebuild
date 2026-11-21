import type { ImportResult } from '../../types/role';
import { parseRoleFileInWorker } from './roleImportClient';
import { parseRoleFile } from './roleSerializationImport';

export { applyLegacyPayloadMetadata, getLegacyCampGender } from './legacyImportMetadata';

export async function parseRoleFileWithLegacyGroups(file: File): Promise<ImportResult> {
  return parseRoleFile(file);
}

export async function parseRoleFileInWorkerWithLegacyGroups(file: File): Promise<ImportResult> {
  return parseRoleFileInWorker(file);
}
