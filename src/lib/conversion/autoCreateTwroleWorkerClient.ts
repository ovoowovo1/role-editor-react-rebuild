import {
  AutoCreateTwroleStoppedError,
  type AutoCreateTwroleCheckpoint,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type RunAutoCreateTwroleOptions
} from './auto-create-twrole/contracts';
import type {
  WorkerAbortMessage,
  WorkerRequestMessage,
  WorkerResponseMessage,
  WorkerSerializedError,
  WorkerStartMessage
} from './auto-create-twrole/workerProtocol';

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
  let lastPublishedCheckpoint: AutoCreateTwroleCheckpoint | null = null;

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
      if (settled) return;
      try {
        worker.postMessage({ type: 'abort', id } satisfies WorkerAbortMessage);
      } catch {
        finish(() => reject(makeAbortError()));
      }
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
      // No start message has been posted yet, so the Worker cannot associate an
      // abort message with this run or send a terminal response. Reject locally
      // and tear the unused Worker down instead of leaving the Promise pending.
      finish(() => reject(makeAbortError()));
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

      if (message.type === 'checkpoint') {
        flushPendingProgress();
        lastPublishedCheckpoint = message.checkpoint;
        options.onCheckpoint?.(message.checkpoint);
        return;
      }

      if (message.type === 'done') {
        flushPendingProgress();
        finish(() => resolve(message.result));
        return;
      }

      if (message.type === 'stopped') {
        flushPendingProgress();
        const previous = lastPublishedCheckpoint;
        const current = message.checkpoint;
        const alreadyPublished = Boolean(
          previous &&
          previous.progress.stage === current.progress.stage &&
          previous.progress.step === current.progress.step &&
          previous.progress.total === current.progress.total &&
          previous.snapshot.version === current.snapshot.version &&
          previous.snapshot.step === current.snapshot.step &&
          previous.snapshot.finalPruneStep === current.snapshot.finalPruneStep &&
          previous.snapshot.rngState === current.snapshot.rngState &&
          previous.snapshot.tiles.length === current.snapshot.tiles.length &&
          previous.result.accepted === current.result.accepted &&
          previous.result.rejected === current.result.rejected &&
          previous.result.pruned === current.result.pruned &&
          previous.result.replaced === current.result.replaced &&
          previous.result.decorations.length === current.result.decorations.length &&
          previous.result.mse === current.result.mse
        );
        if (!alreadyPublished) options.onCheckpoint?.(current);
        finish(() => reject(new AutoCreateTwroleStoppedError({ result: message.result, checkpoint: message.checkpoint })));
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
      settings: options.settings,
      resumeSnapshot: options.resumeSnapshot ?? null
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
