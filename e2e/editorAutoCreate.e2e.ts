import { expect, test } from '@playwright/test';
import { AUTO_CREATE_CANONICAL_PREVIEW_PERFORMANCE } from '../src/components/auto-create/autoCreateWorkspacePreview';
import {
  expectNoPageErrors,
  makeEditorSmokeRole,
  visibleLayerIds,
  watchPageErrors
} from './editorSmoke.helpers';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZckcAAAAASUVORK5CYII=',
  'base64'
);

test('keeps the empty Auto Create chart stable and renders the first MSE point', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeAutoCreateWorker extends EventTarget {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      postMessage(message: { type?: string; id?: string }): void {
        if (message.type !== 'start' || !message.id) return;
        const id = message.id;
        const progress = {
          stage: 'run',
          step: 1,
          total: 1,
          mse: 0.125,
          active: 1,
          accepted: 1,
          rejected: 0,
          pruned: 0,
          replaced: 0
        };

        window.setTimeout(() => {
          this.onmessage?.(new MessageEvent('message', { data: { type: 'progress', id, progress } }));
        }, 20);
        window.setTimeout(() => {
          this.onmessage?.(new MessageEvent('message', {
            data: {
              type: 'done',
              id,
              result: {
                decorations: [],
                exportJson: { deco: [] },
                previewDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZckcAAAAASUVORK5CYII=',
                targetWidth: 1,
                targetHeight: 1,
                sourceWidth: 1,
                sourceHeight: 1,
                sourceCount: 1,
                insertScale: 1,
                mse: 0.125,
                accepted: 1,
                rejected: 0,
                pruned: 0,
                replaced: 0,
                warnings: [],
                ranker: {
                  requestedStrategy: 'legacy',
                  effectiveStrategy: 'legacy',
                  status: 'disabled',
                  runtime: 'none',
                  learningScope: 'skydow',
                  featureSchema: 'auto-create-numeric-v1',
                  rankingPolicy: 'strict-cascade-v1',
                  modelRevision: null
                }
              }
            }
          }));
        }, 200);
      }

      terminate(): void {}
    }

    if (!('OffscreenCanvas' in window)) {
      Object.defineProperty(window, 'OffscreenCanvas', { configurable: true, value: class {} });
    }
    if (!('createImageBitmap' in window)) {
      Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: async () => ({}) });
    }
    Object.defineProperty(window, 'Worker', { configurable: true, value: FakeAutoCreateWorker });
  });

  const monitor = watchPageErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab-mode="extra"]').click();

  const autoCreateTab = page.locator('#extra-tool-tab-autoCreate');
  await expect(autoCreateTab).toHaveAttribute('aria-selected', 'false');
  await autoCreateTab.focus();
  await expect(autoCreateTab).toHaveAttribute('aria-selected', 'false');
  await autoCreateTab.click();
  await expect(autoCreateTab).toHaveAttribute('aria-selected', 'true');

  const chart = page.getByTestId('auto-create-mse-chart');
  await expect(chart).toBeVisible();
  await expect(page.getByTestId('auto-create-mse-chart-empty')).toBeVisible();
  await expect(page.getByTestId('auto-create-mse-chart-canvas')).toHaveCount(0);

  await page.locator('#extra-panel-autoCreate .auto-create-dropzone input[type="file"]').setInputFiles({
    name: 'auto-create-target.png',
    mimeType: 'image/png',
    buffer: ONE_PIXEL_PNG
  });
  const generateButton = page.getByTestId('auto-create-generate-button');
  await expect(generateButton).toBeEnabled();
  await generateButton.click();

  const chartCanvas = page.getByTestId('auto-create-mse-chart-canvas');
  await expect(chartCanvas).toBeVisible();
  await expect(chartCanvas).toHaveCSS('height', '132px');
  await expect(chartCanvas.locator('canvas')).toBeVisible();
  await expect(chart).toContainText('0.125');
  expectNoPageErrors(monitor);
});

test('renders one canonical Pixi preview only at done, stopped, and resumed terminal states', async ({ page }) => {
  test.setTimeout(60_000);
  const decoration = {
    ...makeEditorSmokeRole(1).decorations[0],
    id: 'e2e-auto-create-result',
    name: 'E2E Auto Create Result',
    x: 0,
    y: 0,
    scaleX: 0.35,
    scaleY: 0.35,
    rotation: 0
  };

  await page.addInitScript(({ finalDecoration, workerPreviewDataUrl }) => {
    type AutoCreateTestWindow = Window & typeof globalThis & {
      __autoCreateCheckpointMessages: number;
      __finishAutoCreateFakeWorker?: () => void;
    };

    const testWindow = window as AutoCreateTestWindow;
    testWindow.__autoCreateCheckpointMessages = 0;
    const NativeWorker = window.Worker;

    class FakeAutoCreateWorker extends EventTarget {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      private finished = false;
      private activeId: string | null = null;

      private progress(step: number, mse: number) {
        return {
          stage: 'run',
          step,
          total: 4,
          mse,
          active: 1,
          accepted: 1,
          rejected: 0,
          pruned: 0,
          replaced: 0
        };
      }

      private result(mse: number) {
        return {
          decorations: [{ ...finalDecoration }],
          exportJson: {
            deco: [{
              c: finalDecoration.code,
              x: finalDecoration.x,
              y: finalDecoration.y,
              sx: finalDecoration.scaleX,
              sy: finalDecoration.scaleY,
              r: finalDecoration.rotation
            }]
          },
          previewDataUrl: workerPreviewDataUrl,
          targetWidth: 48,
          targetHeight: 48,
          sourceWidth: 48,
          sourceHeight: 48,
          sourceCount: 1,
          insertScale: 1,
          mse,
          accepted: 1,
          rejected: 0,
          pruned: 0,
          replaced: 0,
          warnings: [],
          ranker: {
            requestedStrategy: 'legacy',
            effectiveStrategy: 'legacy',
            status: 'disabled',
            runtime: 'none',
            learningScope: 'skydow',
            featureSchema: 'auto-create-numeric-v1',
            rankingPolicy: 'strict-cascade-v1',
            modelRevision: null
          }
        };
      }

      private checkpoint(step: number, mse: number) {
        const progress = this.progress(step, mse);
        return {
          result: this.result(progress.mse),
          progress,
          snapshot: {
            version: 5,
            step,
            totalSteps: 4,
            rngState: step,
            tiles: []
          }
        };
      }

      postMessage(message: { type?: string; id?: string; resumeSnapshot?: unknown }): void {
        if (message.type === 'abort' && message.id && message.id === this.activeId && !this.finished) {
          this.finished = true;
          const checkpoint = this.checkpoint(3, 0.125);
          this.onmessage?.(new MessageEvent('message', {
            data: {
              type: 'stopped',
              id: message.id,
              result: checkpoint.result,
              checkpoint
            }
          }));
          return;
        }
        if (message.type !== 'start' || !message.id) return;
        const id = message.id;
        this.activeId = id;

        [1, 2, 3].forEach((step, index) => {
          window.setTimeout(() => {
            if (this.finished || this.activeId !== id) return;
            const checkpoint = this.checkpoint(step, 0.2 - step * 0.025);
            testWindow.__autoCreateCheckpointMessages += 1;
            this.onmessage?.(new MessageEvent('message', {
              data: {
                type: 'checkpoint',
                id,
                checkpoint
              }
            }));
          }, 20 + index * 40);
        });

        testWindow.__finishAutoCreateFakeWorker = () => {
          if (this.finished) return;
          this.finished = true;
          const progress = this.progress(4, 0.1);
          this.onmessage?.(new MessageEvent('message', { data: { type: 'progress', id, progress } }));
          this.onmessage?.(new MessageEvent('message', {
            data: { type: 'done', id, result: this.result(progress.mse) }
          }));
        };
      }

      terminate(): void {
        this.activeId = null;
      }
    }

    if (!('OffscreenCanvas' in window)) {
      Object.defineProperty(window, 'OffscreenCanvas', { configurable: true, value: class {} });
    }
    if (!('createImageBitmap' in window)) {
      Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: async () => ({}) });
    }
    const WorkerProxy = function WorkerProxy(
      this: Worker,
      scriptURL: string | URL,
      options?: WorkerOptions
    ): Worker {
      if (String(scriptURL).includes('autoCreateTwrole.worker')) {
        return new FakeAutoCreateWorker() as unknown as Worker;
      }
      return new NativeWorker(scriptURL, options);
    };
    WorkerProxy.prototype = NativeWorker.prototype;
    Object.defineProperty(window, 'Worker', { configurable: true, value: WorkerProxy });
  }, {
    finalDecoration: decoration,
    workerPreviewDataUrl: `data:image/png;base64,${ONE_PIXEL_PNG.toString('base64')}`
  });

  const monitor = watchPageErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab-mode="extra"]').click();
  await page.locator('#extra-tool-tab-autoCreate').click();

  await page.locator('#extra-panel-autoCreate .auto-create-dropzone input[type="file"]').setInputFiles({
    name: 'auto-create-preview-target.png',
    mimeType: 'image/png',
    buffer: ONE_PIXEL_PNG
  });

  const performanceNames = AUTO_CREATE_CANONICAL_PREVIEW_PERFORMANCE;
  await page.evaluate(({ measure }) => {
    performance.clearMarks();
    performance.clearMeasures(measure);
  }, performanceNames);
  const canonicalPreviewCounts = () => page.evaluate(({ startPrefix, measure }) => ({
    starts: performance.getEntriesByType('mark').filter((entry) => entry.name.startsWith(startPrefix)).length,
    measures: performance.getEntriesByName(measure, 'measure').length
  }), performanceNames);

  await page.getByTestId('auto-create-generate-button').click();

  await expect.poll(() => page.evaluate(() => (
    window as Window & { __autoCreateCheckpointMessages: number }
  ).__autoCreateCheckpointMessages)).toBe(3);
  await expect(page.locator('#extra-panel-autoCreate .auto-create-preview img')).toBeVisible();
  expect(await canonicalPreviewCounts()).toEqual({ starts: 0, measures: 0 });

  await page.evaluate(() => (
    window as Window & { __finishAutoCreateFakeWorker?: () => void }
  ).__finishAutoCreateFakeWorker?.());

  await expect.poll(canonicalPreviewCounts, { timeout: 20_000 }).toEqual({ starts: 1, measures: 1 });

  const layerIdsBeforeInsert = await visibleLayerIds(page);
  const insertButton = page.locator('#extra-panel-autoCreate .auto-create-actions button').nth(2);
  await expect(insertButton).toBeEnabled();
  await insertButton.click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(layerIdsBeforeInsert.length + 1);

  // Insertion updates the role prop. It must not make an already completed
  // result render a second canonical preview.
  await page.waitForTimeout(500);
  expect(await canonicalPreviewCounts()).toEqual({ starts: 1, measures: 1 });

  // A new run receives several checkpoints without rendering. Its stopped
  // terminal result renders once, then resume checkpoints also stay quiet.
  await page.getByTestId('auto-create-generate-button').click();
  await expect.poll(() => page.evaluate(() => (
    window as Window & { __autoCreateCheckpointMessages: number }
  ).__autoCreateCheckpointMessages)).toBe(6);
  expect(await canonicalPreviewCounts()).toEqual({ starts: 1, measures: 1 });

  const stopButton = page.locator('#extra-panel-autoCreate .auto-create-actions button').nth(1);
  await expect(stopButton).toBeEnabled();
  await stopButton.click();
  await expect.poll(canonicalPreviewCounts, { timeout: 20_000 }).toEqual({ starts: 2, measures: 2 });

  const generateButton = page.getByTestId('auto-create-generate-button');
  await expect(generateButton).toBeEnabled();
  await generateButton.click();
  await expect.poll(() => page.evaluate(() => (
    window as Window & { __autoCreateCheckpointMessages: number }
  ).__autoCreateCheckpointMessages)).toBe(9);
  expect(await canonicalPreviewCounts()).toEqual({ starts: 2, measures: 2 });

  await page.evaluate(() => (
    window as Window & { __finishAutoCreateFakeWorker?: () => void }
  ).__finishAutoCreateFakeWorker?.());
  await expect.poll(canonicalPreviewCounts, { timeout: 20_000 }).toEqual({ starts: 3, measures: 3 });
  expectNoPageErrors(monitor);
});
