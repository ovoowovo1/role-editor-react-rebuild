import type { ImportResult } from '../../types/role';

type WorkerRequest = { type: 'parse-role'; bytes: ArrayBuffer };
type WorkerSuccess = { type: 'parse-role-ok'; result: ImportResult };
type WorkerFailure = { type: 'parse-role-error'; error: string };
type WorkerResponse = WorkerSuccess | WorkerFailure;

function parseRoleBytesInWorker(bytes: Uint8Array): Promise<ImportResult> {
  return new Promise<ImportResult>((resolve, reject) => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../../workers/roleImportWorker.ts', import.meta.url), { type: 'module' });
      const cleanup = () => {
        worker?.terminate();
        worker = null;
      };
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        cleanup();
        if (message?.type === 'parse-role-ok') {
          resolve(message.result);
        } else {
          reject(new Error(message?.type === 'parse-role-error' ? message.error : 'Worker parse failed.'));
        }
      };
      worker.onerror = (event) => {
        cleanup();
        reject(new Error(event.message || 'Role import worker crashed.'));
      };
      const transferableBytes = bytes.slice().buffer as ArrayBuffer;
      const request: WorkerRequest = { type: 'parse-role', bytes: transferableBytes };
      worker.postMessage(request, [transferableBytes]);
    } catch (error) {
      worker?.terminate();
      reject(error);
    }
  });
}

export async function parseRoleFileInWorker(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  return parseRoleBytesInWorker(new Uint8Array(buffer));
}

export async function parseRoleFileWithWorkerFallback(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  try {
    return await parseRoleBytesInWorker(bytes);
  } catch {
    // Keep pako and the normalizer out of the successful main-thread path.
    // Only the transferred copy was detached; retry with the original read.
    const { parseRoleBytes } = await import('./roleSerializationImport');
    return parseRoleBytes(bytes);
  }
}
