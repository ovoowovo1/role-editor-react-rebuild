import { expect, test } from '@playwright/test';
import { expectNoPageErrors, watchPageErrors } from './editorSmoke.helpers';

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
                warnings: []
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

  await page.locator('#extra-panel-autoCreate input[type="file"]').setInputFiles({
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
