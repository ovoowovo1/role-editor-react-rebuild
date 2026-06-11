import {
  isAutoCreateTwroleStoppedError,
  runAutoCreateTwrole,
  type AutoCreateTwroleCheckpoint,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type AutoCreateTwroleSettings
} from '../lib/conversion/autoCreateTwrole';
import type { ColorBlockPreset } from '../mock/colorBlocks';
import type { PartOption } from '../types/role';

type WorkerStartMessage = {
  type: 'start';
  id: string;
  targetFile: File;
  decoOptions: PartOption[];
  sourceMode?: 'deco' | 'colorBlock';
  colorBlockPresets?: ColorBlockPreset[];
  settings?: Partial<AutoCreateTwroleSettings>;
  resumeSnapshot?: AutoCreateTwroleCheckpoint['snapshot'] | null;
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
  | { type: 'checkpoint'; id: string; checkpoint: AutoCreateTwroleCheckpoint }
  | { type: 'done'; id: string; result: AutoCreateTwroleResult }
  | { type: 'stopped'; id: string; result: AutoCreateTwroleResult; checkpoint: AutoCreateTwroleCheckpoint }
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
    sourceMode: message.sourceMode ?? 'deco',
    colorBlockPresets: message.colorBlockPresets ?? [],
    settings: message.settings,
    resumeSnapshot: message.resumeSnapshot ?? null,
    signal: controller.signal,
    onProgress: (progress) => {
      scope.postMessage({ type: 'progress', id: message.id, progress });
    },
    onCheckpoint: (checkpoint) => {
      scope.postMessage({ type: 'checkpoint', id: message.id, checkpoint });
    }
  })
    .then((result) => {
      scope.postMessage({ type: 'done', id: message.id, result });
    })
    .catch((error) => {
      if (isAutoCreateTwroleStoppedError(error)) {
        scope.postMessage({ type: 'stopped', id: message.id, result: error.result, checkpoint: error.checkpoint });
        return;
      }
      scope.postMessage({ type: 'error', id: message.id, error: serializeError(error) });
    })
    .finally(() => {
      activeRuns.delete(message.id);
    });
});
