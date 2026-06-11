import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AutoCreateTwroleCheckpoint, AutoCreateTwroleResult } from './autoCreateTwrole';
import { isAutoCreateTwroleStoppedError } from './autoCreateTwrole';
import { runAutoCreateTwroleInWorker } from './autoCreateTwroleWorkerClient';
import type { ColorBlockPreset } from '../../mock/colorBlocks';

const result: AutoCreateTwroleResult = {
  decorations: [
    {
      id: 'deco_1',
      code: 'deco_code',
      assetId: 'asset_1',
      name: 'Stopped deco',
      x: 1,
      y: 2,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      visible: true,
      opacity: 1
    }
  ],
  exportJson: { deco: [{ c: 'deco_code', x: 1, y: 2, sx: 1, sy: 1, r: 0 }] },
  previewDataUrl: 'data:image/png;base64,stub',
  targetWidth: 16,
  targetHeight: 16,
  sourceWidth: 16,
  sourceHeight: 16,
  sourceCount: 1,
  insertScale: 1,
  mse: 0.1,
  accepted: 1,
  rejected: 0,
  pruned: 0,
  replaced: 0,
  warnings: []
};

const checkpoint: AutoCreateTwroleCheckpoint = {
  progress: {
    stage: 'run',
    step: 1,
    total: 10,
    mse: 0.1,
    active: 1,
    accepted: 1,
    rejected: 0,
    pruned: 0,
    replaced: 0,
    message: 'stopped'
  },
  result,
  snapshot: {
    version: 1,
    targetWidth: 16,
    targetHeight: 16,
    sourceWidth: 16,
    sourceHeight: 16,
    sourceCount: 1,
    sourceSignature: 'asset_1:deco_code',
    step: 1,
    totalSteps: 10,
    seed: 123,
    rngState: 456,
    rngSpareNormal: null,
    accepted: 1,
    rejected: 0,
    pruned: 0,
    replaced: 0,
    mse: 0.1,
    tiles: [],
    warnings: []
  }
};

describe('autoCreateTwrole worker client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves stopped result and checkpoint from the worker', async () => {
    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      constructor(_url: URL, _options: WorkerOptions) {}

      postMessage(message: { type: string; id: string }): void {
        if (message.type !== 'abort') return;
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              type: 'stopped',
              id: message.id,
              result,
              checkpoint
            }
          } as MessageEvent);
        });
      }

      terminate(): void {}
    }

    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
    vi.stubGlobal('createImageBitmap', vi.fn());
    const controller = new AbortController();
    const onCheckpoint = vi.fn();

    const run = runAutoCreateTwroleInWorker({
      targetFile: {} as File,
      decoOptions: [],
      settings: { tiles: 10 },
      signal: controller.signal,
      onCheckpoint
    });
    controller.abort();

    await expect(run).rejects.toSatisfy((error: unknown) => {
      expect(isAutoCreateTwroleStoppedError(error)).toBe(true);
      if (!isAutoCreateTwroleStoppedError(error)) return false;
      expect(error.result).toBe(result);
      expect(error.checkpoint).toBe(checkpoint);
      return true;
    });
    expect(onCheckpoint).toHaveBeenCalledWith(checkpoint);
  });

  it('passes color block source mode and presets to the worker', async () => {
    const posted: unknown[] = [];
    const colorBlockPresets: ColorBlockPreset[] = [
      {
        id: 'preset-1',
        camp: 'third',
        name: 'Preset 1',
        label: 'Preset 1',
        color: '#000000',
        deco: [{ c: 'deco_code', x: 0, y: 0, sx: 1, sy: 1, r: 0 }]
      }
    ];

    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      constructor(_url: URL, _options: WorkerOptions) {}

      postMessage(message: { type: string; id: string }): void {
        posted.push(message);
        if (message.type !== 'start') return;
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              type: 'done',
              id: message.id,
              result
            }
          } as MessageEvent);
        });
      }

      terminate(): void {}
    }

    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
    vi.stubGlobal('createImageBitmap', vi.fn());

    await expect(runAutoCreateTwroleInWorker({
      targetFile: {} as File,
      decoOptions: [],
      sourceMode: 'colorBlock',
      colorBlockPresets,
      settings: { tiles: 10 }
    })).resolves.toBe(result);

    expect(posted[0]).toMatchObject({
      type: 'start',
      sourceMode: 'colorBlock',
      colorBlockPresets
    });
  });
});
