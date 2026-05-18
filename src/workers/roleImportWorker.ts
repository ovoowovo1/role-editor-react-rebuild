import { parseRoleBytes } from '../lib/serialization/roleSerialization';

type WorkerRequest = { type: 'parse-role'; bytes: ArrayBuffer };
type WorkerSuccess = { type: 'parse-role-ok'; result: ReturnType<typeof parseRoleBytes> };
type WorkerFailure = { type: 'parse-role-error'; error: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (!message || message.type !== 'parse-role') return;
  try {
    const result = parseRoleBytes(new Uint8Array(message.bytes));
    const payload: WorkerSuccess = { type: 'parse-role-ok', result };
    self.postMessage(payload);
  } catch (error) {
    const payload: WorkerFailure = {
      type: 'parse-role-error',
      error: error instanceof Error ? error.message : String(error)
    };
    self.postMessage(payload);
  }
};
