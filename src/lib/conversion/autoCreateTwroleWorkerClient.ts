import {
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type RunAutoCreateTwroleOptions
} from './autoCreateTwrole';

type WorkerStartMessage = {
  type: 'start';
  id: string;
  targetFile: File;
  decoOptions: RunAutoCreateTwroleOptions['decoOptions'];
  settings: RunAutoCreateTwroleOptions['settings'];
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

const MIN_PROGRESS_INTERVAL_MS = 100;
const WORKER_UNAVAILABLE_MESSAGE =
  'AutoCreate needs Web Worker + OffscreenCanvas + createImageBitmap. This build disables the old main-thread fallback to avoid freezing the page. Please use a desktop Chromium/Edge/Firefox browser.';

let runCounter = 0;

function makeRunId(): string {
  runCounter += 1;
  return `auto_create_${Date.now().toString(36)}_${runCounter.toString(36)}`;
}

function makeAbortError(): DOMException {
  return new DOMException('AutoCreateTwrole was aborted.', 'AbortError');
}

export function canRunAutoCreateTwroleWorker(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  );
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

function deserializeWorkerError(payload: WorkerSerializedError): Error {
  if (payload.name === 'AbortError') return makeAbortError();
  const error = new Error(payload.message || 'AutoCreate worker failed.');
  error.name = payload.name || 'Error';
  if (payload.stack) error.stack = payload.stack;
  return error;
}

function runAutoCreateTwroleWorkerOnly(options: RunAutoCreateTwroleOptions): Promise<AutoCreateTwroleResult> {
  const id = makeRunId();
  const worker = new Worker(new URL('../../workers/autoCreateTwrole.worker.ts', import.meta.url), { type: 'module' });
  let settled = false;
  let lastProgressAt = 0;
  let pendingProgress: AutoCreateTwroleProgress | null = null;
  let progressTimer: ReturnType<typeof setTimeout> | null = null;

  return new Promise<AutoCreateTwroleResult>((resolve, reject) => {
    const flushPendingProgress = () => {
      if (progressTimer != null) {
        clearTimeout(progressTimer);
        progressTimer = null;
      }
      if (!pendingProgress) return;
      const next = pendingProgress;
      pendingProgress = null;
      lastProgressAt = nowMs();
      options.onProgress?.(next);
    };

    const cleanup = () => {
      options.signal?.removeEventListener('abort', abort);
      if (progressTimer != null) {
        clearTimeout(progressTimer);
        progressTimer = null;
      }
      worker.terminate();
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const abort = () => {
      try {
        worker.postMessage({ type: 'abort', id } satisfies WorkerAbortMessage);
      } catch {
        // The worker may already be gone. We still reject with AbortError below.
      }
      finish(() => reject(makeAbortError()));
    };

    const emitProgress = (progress: AutoCreateTwroleProgress) => {
      const current = nowMs();
      const important = progress.step <= 1 || progress.step >= progress.total || progress.stage === 'final';

      if (important || current - lastProgressAt >= MIN_PROGRESS_INTERVAL_MS) {
        if (progressTimer != null) {
          clearTimeout(progressTimer);
          progressTimer = null;
        }
        pendingProgress = null;
        lastProgressAt = current;
        options.onProgress?.(progress);
        return;
      }

      pendingProgress = progress;
      if (progressTimer == null) {
        const delay = Math.max(0, MIN_PROGRESS_INTERVAL_MS - (current - lastProgressAt));
        progressTimer = setTimeout(flushPendingProgress, delay);
      }
    };

    if (options.signal?.aborted) {
      abort();
      return;
    }

    options.signal?.addEventListener('abort', abort, { once: true });

    worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;
      if (!message || message.id !== id) return;

      if (message.type === 'progress') {
        emitProgress(message.progress);
        return;
      }

      if (message.type === 'done') {
        flushPendingProgress();
        finish(() => resolve(message.result));
        return;
      }

      if (message.type === 'error') {
        finish(() => reject(deserializeWorkerError(message.error)));
      }
    };

    worker.onerror = (event) => {
      finish(() => reject(new Error(event.message || 'AutoCreate worker crashed.')));
    };

    const startMessage: WorkerStartMessage = {
      type: 'start',
      id,
      targetFile: options.targetFile,
      decoOptions: options.decoOptions,
      settings: options.settings
    };
    worker.postMessage(startMessage satisfies WorkerRequestMessage);
  });
}

export async function runAutoCreateTwroleInWorker(options: RunAutoCreateTwroleOptions): Promise<AutoCreateTwroleResult> {
  if (!canRunAutoCreateTwroleWorker()) {
    throw new Error(WORKER_UNAVAILABLE_MESSAGE);
  }

  try {
    return await runAutoCreateTwroleWorkerOnly(options);
  } catch (error) {
    // Important: do not retry on the main thread. The previous fallback made the
    // page appear frozen when the worker failed or when the browser did not fully
    // support worker canvas APIs.
    if ((error as DOMException)?.name === 'AbortError' || options.signal?.aborted) throw error;
    console.warn('[AutoCreateTwrole] Worker failed. Main-thread fallback is disabled to keep the UI responsive.', error);
    throw error;
  }
}
