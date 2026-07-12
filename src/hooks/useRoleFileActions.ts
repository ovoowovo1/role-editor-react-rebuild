import { useCallback } from 'react';
import { t } from '../i18n';
import { downloadBlob } from '../lib/math';
import { parseRoleFileWithWorkerFallback } from '../lib/serialization/roleSerialization';
import { createRoleJsonBlobWithThumb, createTwroleBlobWithThumb } from '../lib/serialization/legacyTwroleExport';
import type { RoleDocument } from '../types/role';

interface UseRoleFileActionsOptions {
  role: RoleDocument;
  importRole(role: RoleDocument): void;
  mergeImportedRole(role: RoleDocument): void;
  setStatus(status: string): void;
}

export function useRoleFileActions({
  role,
  importRole,
  mergeImportedRole,
  setStatus
}: UseRoleFileActionsOptions) {
  const handleImport = useCallback(
    async (file: File) => {
      setStatus(t('status.importing', { name: file.name }));
      try {
        const result = await parseRoleFileWithWorkerFallback(file);
        importRole(result.role);
        setStatus(result.warnings.length ? result.warnings.join(' ') : t('status.imported', { name: file.name }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(t('status.importFailed', { message }));
      }
    },
    [importRole, setStatus]
  );

  const handleMerge = useCallback(
    async (file: File) => {
      setStatus(t('status.merging', { name: file.name }));
      try {
        const result = await parseRoleFileWithWorkerFallback(file);
        mergeImportedRole(result.role);
        setStatus(result.warnings.length ? `${t('status.merged', { name: file.name })}. ${result.warnings.join(' ')}` : t('status.merged', { name: file.name }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(t('status.mergeFailed', { message }));
      }
    },
    [mergeImportedRole, setStatus]
  );

  const handleDownloadTwrole = useCallback(async () => {
    try {
      downloadBlob(await createTwroleBlobWithThumb(role), 'role.twrole');
      setStatus(t('status.downloadedTwrole'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Export failed: ${message}`);
    }
  }, [role, setStatus]);

  const handleExportJson = useCallback(async () => {
    try {
      downloadBlob(await createRoleJsonBlobWithThumb(role), 'role.json');
      setStatus(t('status.exportedJson'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Export failed: ${message}`);
    }
  }, [role, setStatus]);

  return {
    handleImport,
    handleMerge,
    handleDownloadTwrole,
    handleExportJson
  };
}
