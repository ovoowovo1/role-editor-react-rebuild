import {
  isAutoCreateTwroleStoppedError
} from '../lib/conversion/auto-create-twrole/contracts';
import {
  runAutoCreateTwrole,
  runAutoCreateTwroleWithDiagnostics
} from '../lib/conversion/auto-create-twrole/runner';
import { AutoCreateDiagnosticsCollector } from '../lib/conversion/auto-create-twrole/diagnostics';
import type {
  WorkerRequestMessage,
  WorkerResponseMessage,
  WorkerSerializedError
} from '../lib/conversion/auto-create-twrole/workerProtocol';

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
  const diagnostics = message.collectDiagnostics ? new AutoCreateDiagnosticsCollector() : null;
  activeRuns.set(message.id, controller);

  const options = {
    targetFile: message.targetFile,
    decoOptions: message.decoOptions,
    settings: message.settings,
    resumeSnapshot: message.resumeSnapshot ?? null,
    signal: controller.signal,
    onProgress: (progress) => {
      scope.postMessage({
        type: 'progress',
        id: message.id,
        progress,
        ...(diagnostics ? { diagnostics: diagnostics.snapshot() } : {})
      });
    },
    onCheckpoint: (checkpoint) => {
      // A terminal stop is sent once by the `stopped` response below. Posting
      // the callback payload here as well structured-cloned the same large
      // snapshot/result twice and caused duplicate React state updates.
      if (checkpoint.progress.message === 'stopped') return;
      scope.postMessage({ type: 'checkpoint', id: message.id, checkpoint });
    }
  } satisfies Parameters<typeof runAutoCreateTwrole>[0];
  const run = diagnostics
    ? runAutoCreateTwroleWithDiagnostics(options, diagnostics)
    : runAutoCreateTwrole(options);

  void run
    .then((result) => {
      scope.postMessage({ type: 'done', id: message.id, result, diagnostics: diagnostics?.snapshot() });
    })
    .catch((error) => {
      if (isAutoCreateTwroleStoppedError(error)) {
        scope.postMessage({ type: 'stopped', id: message.id, result: error.result, checkpoint: error.checkpoint, diagnostics: diagnostics?.snapshot() });
        return;
      }
      scope.postMessage({ type: 'error', id: message.id, error: serializeError(error), diagnostics: diagnostics?.snapshot() });
    })
    .finally(() => {
      activeRuns.delete(message.id);
    });
});
