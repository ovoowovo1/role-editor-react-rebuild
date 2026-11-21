import { expect, test, type Page } from '@playwright/test';
import { makeEditorSmokeRole } from '../e2e/editorSmoke.helpers';

interface FrameWindow {
  rafGapsMs: number[];
  longTasksMs: number[] | null;
}

declare global {
  interface Window {
    editorBenchmark: {
      canvasVisibleMs: number | null;
      start(): void;
      stop(): FrameWindow;
    };
  }
}

function installProbe() {
  const canvasSelector = '.pixi-host canvas';
  let frameId = 0;
  let lastFrame: number | undefined;
  let rafGapsMs: number[] = [];
  let longTasksMs: number[] | null = null;
  let observer: PerformanceObserver | undefined;
  const probe: Window['editorBenchmark'] = {
    canvasVisibleMs: null,
    start() {
      rafGapsMs = [];
      longTasksMs = PerformanceObserver.supportedEntryTypes.includes('longtask') ? [] : null;
      if (longTasksMs) {
        observer = new PerformanceObserver((list) => {
          longTasksMs?.push(...list.getEntries().map((entry) => entry.duration));
        });
        observer.observe({ type: 'longtask' });
      }
      lastFrame = undefined;
      const tick = (time: number) => {
        if (lastFrame !== undefined) rafGapsMs.push(time - lastFrame);
        lastFrame = time;
        frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(frameId);
      if (observer) {
        longTasksMs?.push(...observer.takeRecords().map((entry) => entry.duration));
        observer.disconnect();
        observer = undefined;
      }
      return { rafGapsMs, longTasksMs };
    }
  };
  window.editorBenchmark = probe;
  const markVisibleCanvas = () => {
    const bounds = document.querySelector(canvasSelector)?.getBoundingClientRect();
    if (bounds?.width && bounds.height) probe.canvasVisibleMs = performance.now();
    else requestAnimationFrame(markVisibleCanvas);
  };
  requestAnimationFrame(markVisibleCanvas);
}

function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (p: number) => sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null;
  return { samples: sorted.length, medianMs: at(0.5), p95Ms: at(0.95), maxMs: at(1) };
}

function summarizeWindow(window: FrameWindow) {
  return {
    rafGap: stats(window.rafGapsMs),
    gapsOver33ms: window.rafGapsMs.filter((ms) => ms > 33.33).length,
    longTasks: window.longTasksMs === null ? null : stats(window.longTasksMs)
  };
}

async function startWindow(page: Page) {
  await page.evaluate(() => window.editorBenchmark.start());
}

async function stopWindow(page: Page) {
  return summarizeWindow(await page.evaluate(() => window.editorBenchmark.stop()));
}

test('report cold canvas, idle frames, and a 5,000-layer pointer transform', async ({ browser, baseURL }, testInfo) => {
  if (!baseURL) throw new Error('Use the dedicated Playwright benchmark config.');
  const origin = new URL(baseURL).origin;
  const samples = 3;
  const layers = 5_000;
  const source = makeEditorSmokeRole(1);
  const original = source.decorations[0];
  const role = {
    ...source,
    decorations: Array.from({ length: layers }, (_, index) => ({
      ...original,
      id: `bench-deco-${index + 1}`,
      name: `Benchmark layer ${index + 1}`,
      x: index === 0 ? 0 : index % 71 - 35,
      y: index === 0 ? 0 : Math.floor(index / 71) % 71 - 35,
      scaleX: 0.30,
      scaleY: 0.30
    })),
    headLayerIndex: layers
  };
  const fixture = { name: 'benchmark.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(role)) };
  const result = [];
  for (let sample = 0; sample < samples; sample += 1) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    try {
      // The benchmark uses bundled assets only. Do not depend on remote
      // fonts, telemetry, authentication, or a live Worker API.
      await context.route((url) => /^https?:$/.test(url.protocol) && url.origin !== origin, (route) => route.abort());
      await context.addInitScript(installProbe);
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.editorBenchmark.canvasVisibleMs !== null);
      const cold = await page.evaluate(() => {
        const visible = window.editorBenchmark.canvasVisibleMs!;
        const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
          .filter((entry) => new URL(entry.name).origin === location.origin && entry.responseEnd <= visible);
        return {
          canvasVisibleMs: visible,
          localResourcesBeforeCanvas: resources.length,
          encodedBytesBeforeCanvas: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0)
        };
      });

      await page.getByTestId('import-file-input').setInputFiles(fixture);
      await page.getByTestId('layer-row-bench-deco-1').locator('.layer-badge').click({ timeout: 30_000 });
      const slider = page.getByTestId('transform-pos-x-range');
      const xValue = page.getByTestId('transform-pos-x-number');
      await expect(slider).toBeEnabled();
      await slider.scrollIntoViewIfNeeded();
      const initialValue = await xValue.inputValue();
      const box = await slider.boundingBox();
      if (!box) throw new Error('Benchmark slider is not visible.');

      // Import/scene settling is outside both sample windows.
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 800)));
      await startWindow(page);
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1_000)));
      const idle = await stopWindow(page);

      await startWindow(page);
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width * 0.50, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, y, { steps: 20 });
      await page.mouse.up();
      await expect(xValue).not.toHaveValue(initialValue);
      const undo = page.getByTestId('undo-button');
      await expect(undo).toBeEnabled();
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 250)));
      const pointer = await stopWindow(page);

      await undo.click();
      await expect(xValue).toHaveValue(initialValue);
      expect(pageErrors).toEqual([]);
      result.push({ cold, idle, pointer });
    } finally {
      await context.close();
    }
  }

  const report = JSON.stringify({
    browser: browser.version(),
    viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    layers,
    samples: result,
    coldCanvasVisible: stats(result.map(({ cold }) => cold.canvasVisibleMs))
  }, null, 2);
  console.log(report);
  await testInfo.attach('editor-rendering-benchmark.json', { body: report, contentType: 'application/json' });
});
