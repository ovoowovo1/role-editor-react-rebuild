import {
  runAutoCreateTwrole,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type AutoCreateTwroleSettings
} from '../lib/conversion/autoCreateTwrole';
import type { PartOption } from '../types/role';

type WorkerStartMessage = {
  type: 'start';
  id: string;
  targetFile: File;
  decoOptions: PartOption[];
  settings?: Partial<AutoCreateTwroleSettings>;
};

type WorkerAbortMessage = {
  type: 'abort';
  id: string;
};

type WorkerRequestMessage = WorkerStartMessage | WorkerAbortMessage;

type WorkerSerializedError = {
  name?: string;
  message?: string;
  stack?: string;
};

type WorkerResponseMessage =
  | { type: 'progress'; id: string; progress: AutoCreateTwroleProgress }
  | { type: 'done'; id: string; result: AutoCreateTwroleResult }
  | { type: 'error'; id: string; error: WorkerSerializedError };

const scope = globalThis as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerRequestMessage>) => void): void;
  postMessage(message: WorkerResponseMessage): void;
};

const activeRuns = new Map<string, AbortController>();

function serializeError(error: unknown): WorkerSerializedError {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'Error', message: String(error) };
}

scope.addEventListener('message', (event) => {
  const message = event.data;
  if (!message?.id) return;

  if (message.type === 'abort') {
    activeRuns.get(message.id)?.abort();
    return;
  }

  if (message.type !== 'start') return;

  const controller = new AbortController();
  activeRuns.set(message.id, controller);

  void runAutoCreateTwrole({
    targetFile: message.targetFile,
    decoOptions: message.decoOptions,
    settings: message.settings,
    signal: controller.signal,
    onProgress: (progress) => {
      scope.postMessage({ type: 'progress', id: message.id, progress });
    }
  })
    .then((result) => {
      scope.postMessage({ type: 'done', id: message.id, result });
    })
    .catch((error) => {
      scope.postMessage({ type: 'error', id: message.id, error: serializeError(error) });
    })
    .finally(() => {
      activeRuns.delete(message.id);
    });
});
