import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const BENCHMARK_PATH = '/__auto-create-benchmark__/';
const DEFAULT_SIZES = [128, 512, 1024];
const DEFAULT_SEED = 20260715;
const DEFAULT_TARGET_SEED = 0x5eed1234;

function parseArguments(argv) {
  const values = new Map();
  const switches = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) continue;
    const equalsAt = argument.indexOf('=');
    if (equalsAt >= 0) {
      values.set(argument.slice(2, equalsAt), argument.slice(equalsAt + 1));
      continue;
    }
    const key = argument.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      values.set(key, next);
      index += 1;
    } else {
      switches.add(key);
    }
  }
  return { values, switches };
}

function envFlag(name) {
  return /^(1|true|yes|on)$/i.test(process.env[name] ?? '');
}

function positiveInteger(raw, fallback, label, { allowZero = false } = {}) {
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  const valid = Number.isInteger(value) && (allowZero ? value >= 0 : value > 0);
  if (!valid) throw new Error(`${label} must be ${allowZero ? 'a non-negative' : 'a positive'} integer; received ${raw}.`);
  return value;
}

function integerList(raw, fallback) {
  if (!raw) return fallback;
  const values = raw.split(',').map((item) => positiveInteger(item.trim(), 0, 'size'));
  if (!values.length) throw new Error('At least one benchmark size is required.');
  return [...new Set(values)];
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1);
  return sorted[rank];
}

function summarize(values, digits) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    median: round(percentile(sorted, 0.5), digits),
    p95: round(percentile(sorted, 0.95), digits),
    min: round(sorted[0], digits),
    max: round(sorted[sorted.length - 1], digits)
  };
}

function benchmarkHtml() {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><title>AutoCreate benchmark</title></head>
  <body>
    <main>AutoCreate benchmark harness</main>
    <script type="module" src="/scripts/autoCreateBenchmarkPage.ts"></script>
  </body>
</html>`;
}

function benchmarkPagePlugin() {
  return {
    name: 'auto-create-benchmark-page',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (pathname !== BENCHMARK_PATH && pathname !== BENCHMARK_PATH.slice(0, -1)) {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(benchmarkHtml());
      });
    }
  };
}

function getServerUrl(server) {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite did not expose its listening TCP address.');
  return `http://127.0.0.1:${address.port}${BENCHMARK_PATH}`;
}

async function writeOptionalReport(report, outputDirectory) {
  if (!outputDirectory) return null;
  const absoluteDirectory = path.resolve(REPOSITORY_ROOT, outputDirectory);
  await mkdir(absoluteDirectory, { recursive: true });
  const timestamp = report.generatedAt.replaceAll(':', '-').replaceAll('.', '-');
  const reportPath = path.join(absoluteDirectory, `auto-create-${timestamp}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return path.relative(REPOSITORY_ROOT, reportPath).replaceAll(path.sep, '/');
}

async function main() {
  const { values, switches } = parseArguments(process.argv.slice(2));
  const quick = switches.has('quick') || envFlag('AUTO_CREATE_BENCH_QUICK');
  const sizes = integerList(
    values.get('sizes') ?? process.env.AUTO_CREATE_BENCH_SIZES,
    quick ? [128] : DEFAULT_SIZES
  );
  const warmupRuns = positiveInteger(
    values.get('warmup') ?? process.env.AUTO_CREATE_BENCH_WARMUP,
    1,
    'warmup',
    { allowZero: true }
  );
  const measuredRuns = positiveInteger(
    values.get('runs') ?? process.env.AUTO_CREATE_BENCH_RUNS,
    quick ? 1 : 5,
    'runs'
  );
  const tiles = positiveInteger(
    values.get('tiles') ?? process.env.AUTO_CREATE_BENCH_TILES,
    quick ? 8 : 4000,
    'tiles'
  );
  const seed = positiveInteger(values.get('seed') ?? process.env.AUTO_CREATE_BENCH_SEED, DEFAULT_SEED, 'seed');
  const targetSeed = positiveInteger(
    values.get('target-seed') ?? process.env.AUTO_CREATE_BENCH_TARGET_SEED,
    DEFAULT_TARGET_SEED,
    'target-seed'
  );
  const exportEvery = positiveInteger(
    values.get('export-every') ?? process.env.AUTO_CREATE_BENCH_EXPORT_EVERY,
    0,
    'export-every',
    { allowZero: true }
  );
  const variantCacheItems = positiveInteger(
    values.get('variant-cache-items') ?? process.env.AUTO_CREATE_BENCH_VARIANT_CACHE_ITEMS,
    0,
    'variant-cache-items',
    { allowZero: true }
  );
  const camp = values.get('camp') ?? process.env.AUTO_CREATE_BENCH_CAMP ?? 'skydow';
  const outputDirectory = values.get('output') ?? process.env.AUTO_CREATE_BENCH_OUTPUT ?? null;
  const headed = switches.has('headed') || envFlag('AUTO_CREATE_BENCH_HEADED');
  const collectDiagnostics = switches.has('diagnostics') || envFlag('AUTO_CREATE_BENCH_DIAGNOSTICS');

  const vite = await createServer({
    root: REPOSITORY_ROOT,
    logLevel: 'error',
    plugins: [benchmarkPagePlugin()],
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false
    }
  });
  let browser;

  try {
    await vite.listen();
    browser = await chromium.launch({ headless: !headed });
    const context = await browser.newContext();
    const page = await context.newPage();
    let workerEvents = 0;
    page.on('worker', () => {
      workerEvents += 1;
    });
    page.on('pageerror', (error) => {
      process.stderr.write(`[browser error] ${error.stack ?? error.message}\n`);
    });
    await page.goto(getServerUrl(vite), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.benchmarkReady === 'true');

    const metadata = await page.evaluate(() => window.__AUTO_CREATE_BENCHMARK__?.metadata());
    if (!metadata) throw new Error('The browser benchmark API did not initialize.');
    if (!metadata.capabilities.worker || !metadata.capabilities.offscreenCanvas || !metadata.capabilities.createImageBitmap) {
      throw new Error(`Chromium is missing required Worker capabilities: ${JSON.stringify(metadata.capabilities)}.`);
    }

    const fixtures = [];
    for (const size of sizes) {
      const caseConfig = { size, tiles, seed, targetSeed, camp, exportEvery, collectDiagnostics, variantCacheItems };
      const warmups = [];
      const samples = [];

      for (let run = 1; run <= warmupRuns + measuredRuns; run += 1) {
        const phase = run <= warmupRuns ? 'warmup' : 'measure';
        const phaseRun = phase === 'warmup' ? run : run - warmupRuns;
        process.stderr.write(`[auto-create benchmark] ${size}x${size} ${phase} ${phaseRun}/${phase === 'warmup' ? warmupRuns : measuredRuns}\n`);
        const workersBefore = workerEvents;
        const sample = await page.evaluate(
          async (config) => {
            const api = window.__AUTO_CREATE_BENCHMARK__;
            if (!api) throw new Error('The AutoCreate benchmark API is unavailable.');
            return api.run(config);
          },
          caseConfig
        );
        await page.waitForTimeout(0);
        const measuredSample = {
          ...sample,
          durationMs: round(sample.durationMs),
          previewRenderMs: round(sample.previewRenderMs),
          uiReadyDurationMs: round(sample.uiReadyDurationMs),
          workerEvents: workerEvents - workersBefore
        };
        if (measuredSample.workerEvents < 1) {
          throw new Error(`${size}x${size} ${phase} run did not create a real dedicated Worker.`);
        }
        (phase === 'warmup' ? warmups : samples).push(measuredSample);
      }

      fixtures.push({
        name: `synthetic-${size}x${size}`,
        width: size,
        height: size,
        warmups,
        samples,
        summary: {
          durationMs: summarize(samples.map((sample) => sample.durationMs), 3),
          previewRenderMs: summarize(samples.map((sample) => sample.previewRenderMs), 3),
          uiReadyDurationMs: summarize(samples.map((sample) => sample.uiReadyDurationMs), 3),
          previewRenderCount: summarize(samples.map((sample) => sample.previewRenderCount), 0),
          mse: summarize(samples.map((sample) => sample.mse), 9),
          count: summarize(samples.map((sample) => sample.count), 0)
        }
      });
    }

    const report = {
      schemaVersion: 3,
      benchmark: 'auto-create-twrole',
      generatedAt: new Date().toISOString(),
      mode: quick ? 'quick' : 'default',
      config: {
        sizes,
        warmupRuns,
        measuredRuns,
        tiles,
        seed,
        targetSeed,
        camp,
        resetExperience: true,
        exportEvery,
        variantCacheItems: variantCacheItems || null,
        collectDiagnostics,
        timelineIntervalSteps: 250,
        sourceFilter: `filterPartOptionsByCamp('deco', '${camp}')`
      },
      environment: {
        node: process.version,
        platform: process.platform,
        release: os.release(),
        arch: process.arch,
        cpus: os.cpus().length,
        chromium: browser.version(),
        ...metadata
      },
      workerEvents,
      fixtures
    };
    const writtenReport = await writeOptionalReport(report, outputDirectory);
    if (writtenReport) report.outputFile = writtenReport;
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await browser?.close();
    await vite.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
