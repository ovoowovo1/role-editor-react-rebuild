import { createDefaultRole } from '../../mock/options';
import type { DecorationLayer } from '../../types/role';
import { renderFullRoleToDataUrl } from '../stage/fullRoleRenderer';
import {
  runAutoCreateTwrole,
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

let runCounter = 0;

function makeRunId(): string {
  runCounter += 1;
  return `auto_create_${Date.now().toString(36)}_${runCounter.toString(36)}`;
}

function makeAbortError(): DOMException {
  return new DOMException('AutoCreateTwrole was aborted.', 'AbortError');
}

function workerCanRunAutoCreate(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  );
}

function transparentPreviewDataUrl(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas.toDataURL('image/png');
}

async function renderEditorPreviewDataUrl(
  decorations: DecorationLayer[],
  width: number,
  height: number
): Promise<string> {
  const role = {
    ...createDefaultRole('skydow', 'male'),
    name: 'AutoCreate preview',
    decorations,
    // decorations are top-first in the React document. Put the hidden head layer
    // behind them so this preview uses the same decoration renderer as the
    // center stage without drawing an actor head.
    headLayerIndex: decorations.length,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: false, opacity: 0 },
    groups: [],
    updatedAt: new Date().toISOString()
  };

  const rendered = await renderFullRoleToDataUrl(role, {
    width,
    height,
    background: 'transparent',
    debug: { onlyDecorations: true, hideHeadLayer: true },
    stageScale: 1
  });
  return rendered.dataUrl;
}

async function withEditorPreview(result: AutoCreateTwroleResult): Promise<AutoCreateTwroleResult> {
  try {
    const previewDataUrl = await renderEditorPreviewDataUrl(result.decorations, result.targetWidth, result.targetHeight);
    return { ...result, previewDataUrl };
  } catch (error) {
    console.warn('[AutoCreateTwrole] Falling back to available preview because editor renderer preview failed.', error);
    return {
      ...result,
      previewDataUrl: result.previewDataUrl || transparentPreviewDataUrl(result.targetWidth, result.targetHeight)
    };
  }
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

  return new Promise<AutoCreateTwroleResult>((resolve, reject) => {
    const cleanup = () => {
      options.signal?.removeEventListener('abort', abort);
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

    if (options.signal?.aborted) {
      abort();
      return;
    }

    options.signal?.addEventListener('abort', abort, { once: true });

    worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;
      if (!message || message.id !== id) return;

      if (message.type === 'progress') {
        options.onProgress?.(message.progress);
        return;
      }

      if (message.type === 'done') {
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
  if (!workerCanRunAutoCreate()) {
    return withEditorPreview(await runAutoCreateTwrole(options));
  }

  try {
    return withEditorPreview(await runAutoCreateTwroleWorkerOnly(options));
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError' || options.signal?.aborted) throw error;
    console.warn('[AutoCreateTwrole] Worker failed; retrying on the main thread.', error);
    return withEditorPreview(await runAutoCreateTwrole(options));
  }
}
