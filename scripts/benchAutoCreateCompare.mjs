import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  AUTO_CREATE_COMPARE_SCHEMA_VERSION,
  AUTO_CREATE_COMPARE_THRESHOLDS,
  AUTO_CREATE_SEARCH_STRATEGIES,
  aggregateCompareReport,
  buildMarkdownReport,
  compareAgainstBaseline,
  deriveSeed,
  evaluateFixture,
  hasCompleteTrainedModes,
  recommendRuntimeAdapter,
  round,
  seededShuffle
} from './autoCreateCompareReport.mjs';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const BENCHMARK_PATH = '/__auto-create-compare__/';
const DEFAULT_OUTPUT_DIRECTORY = 'output/auto-create-compare';
const DEFAULT_SEED = 20260715;
const DEFAULT_TARGET_SEED = 0x5eed1234;

const PROFILE_DEFAULTS = Object.freeze({
  quick: {
    camps: ['skydow', 'civil'],
    families: ['flat', 'gradient', 'texture', 'hole-boundary'],
    sizes: [128, 256],
    seedCount: 1,
    warmupRuns: 1,
    measuredRuns: 3,
    tiles: 8,
    tileBudget: 4,
    replaceEvery: 2
  },
  full: {
    camps: ['skydow', 'royal', 'third', 'civil'],
    families: [
      'flat',
      'gradient',
      'texture',
      'semi-transparent',
      'hole',
      'thin-outline',
      'boundary',
      'high-color'
    ],
    sizes: [128, 256, 512],
    seedCount: 3,
    warmupRuns: 1,
    measuredRuns: 5,
    tiles: 4000,
    tileBudget: 3000,
    replaceEvery: 350
  }
});

const TARGET_FAMILIES = new Set([
  'flat',
  'gradient',
  'texture',
  'semi-transparent',
  'hole',
  'thin-outline',
  'boundary',
  'high-color',
  'hole-boundary'
]);

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
  if (!valid) {
    throw new Error(`${label} must be ${allowZero ? 'a non-negative' : 'a positive'} integer; received ${raw}.`);
  }
  return value;
}

function stringList(raw, fallback) {
  if (!raw) return [...fallback];
  const output = [...new Set(raw.split(',').map((value) => value.trim()).filter(Boolean))];
  if (!output.length) throw new Error('Expected a non-empty comma-separated list.');
  return output;
}

function integerList(raw, fallback, label) {
  return stringList(raw, fallback.map(String)).map((value) => positiveInteger(value, 0, label));
}

function enumList(raw, fallback, allowed, label) {
  const values = stringList(raw, fallback);
  const invalid = values.filter((value) => !allowed.has(value));
  if (invalid.length) throw new Error(`Unknown ${label}: ${invalid.join(', ')}.`);
  return values;
}

function benchmarkHtml() {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><title>AutoCreate A/B compare</title></head>
  <body>
    <main>AutoCreate A/B compare harness</main>
    <script type="module" src="/scripts/autoCreateComparePage.ts"></script>
  </body>
</html>`;
}

function benchmarkPagePlugin() {
  return {
    name: 'auto-create-compare-page',
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
  if (!address || typeof address === 'string') {
    throw new Error('Vite did not expose its listening TCP address.');
  }
  return `http://127.0.0.1:${address.port}${BENCHMARK_PATH}`;
}

function gitValue(args, fallback = 'unknown') {
  const result = spawnSync(
    'git',
    ['-c', `safe.directory=${REPOSITORY_ROOT.replaceAll('\\', '/')}`, ...args],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8', windowsHide: true }
  );
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : fallback;
}

function profileSeeds(seed, count) {
  const seeds = [seed];
  for (let index = 1; index < count; index += 1) {
    seeds.push(deriveSeed(seed, 'fixture-seed', index));
  }
  return seeds;
}

function buildFixtureMatrix({ camps, families, sizes, seeds, targetSeed, maxCases }) {
  const fixtures = [];
  for (const camp of camps) {
    for (const family of families) {
      for (const size of sizes) {
        for (const seed of seeds) {
          const fixtureTargetSeed = deriveSeed(targetSeed, camp, family, size, seed);
          fixtures.push({
            id: `${camp}/${family}/${size}/seed-${seed}`,
            camp,
            family,
            size,
            seed,
            targetSeed: fixtureTargetSeed
          });
        }
      }
    }
  }
  return maxCases > 0 ? fixtures.slice(0, maxCases) : fixtures;
}

async function readBaseline(filename) {
  if (!filename) return null;
  const absolutePath = path.resolve(REPOSITORY_ROOT, filename);
  const source = await readFile(absolutePath, 'utf8');
  const report = JSON.parse(source);
  if (report?.benchmark !== 'auto-create-twrole-compare') {
    throw new Error(
      `Baseline ${filename} is not an auto-create-twrole-compare report ` +
      `(received ${JSON.stringify(report?.benchmark)}).`
    );
  }
  return { absolutePath, report };
}

async function measureProductionRuntimeBundles() {
  const assetsDirectory = path.join(REPOSITORY_ROOT, 'dist', 'assets');
  try {
    const names = await readdir(assetsDirectory);
    const workerNames = names.filter(
      (name) => name.startsWith('autoCreateTwrole.worker-') && name.endsWith('.js')
    );
    if (workerNames.length !== 1) return null;
    const workerName = workerNames[0];
    const workerBytes = await readFile(path.join(assetsDirectory, workerName));
    const workerSource = workerBytes.toString('utf8');
    const tfjsChunkNames = [
      ...new Set(
        [...workerSource.matchAll(/tfjs-worker-vendor-[A-Za-z0-9_-]+\.js/g)]
          .map((match) => match[0])
      )
    ];
    if (!tfjsChunkNames.length) return null;
    const tfjsChunkBytes = await Promise.all(
      tfjsChunkNames.map((name) => readFile(path.join(assetsDirectory, name)))
    );
    const typedGzipBytes = gzipSync(workerBytes).length;
    const tfjsVendorGzipBytes = tfjsChunkBytes.reduce(
      (total, bytes) => total + gzipSync(bytes).length,
      0
    );
    return {
      source: 'production-dist',
      workerName,
      tfjsChunkNames,
      typedGzipBytes,
      tfjsGzipBytes: typedGzipBytes + tfjsVendorGzipBytes,
      tfjsVendorGzipBytes
    };
  } catch {
    return null;
  }
}

function outputFilenames(outputDirectory, generatedAt, name) {
  const absoluteDirectory = path.resolve(REPOSITORY_ROOT, outputDirectory);
  const safeTimestamp = generatedAt.replaceAll(':', '-').replaceAll('.', '-');
  const basename = name || `auto-create-compare-${safeTimestamp}`;
  return {
    absoluteDirectory,
    json: path.join(absoluteDirectory, `${basename}.json`),
    markdown: path.join(absoluteDirectory, `${basename}.md`)
  };
}

function relativeFilename(filename) {
  return path.relative(REPOSITORY_ROOT, filename).replaceAll(path.sep, '/');
}

async function runBrowserSample(page, config, workerEvents) {
  const workersBefore = workerEvents.count;
  const sample = await page.evaluate(
    async (input) => {
      const api = window.__AUTO_CREATE_COMPARE_BENCHMARK__;
      if (!api) throw new Error('The AutoCreate compare API is unavailable.');
      return api.run(input);
    },
    config
  );
  await page.waitForTimeout(0);
  return {
    ...sample,
    durationMs: round(sample.durationMs),
    previewRenderMs: round(sample.previewRenderMs),
    uiReadyDurationMs: round(sample.uiReadyDurationMs),
    qualityMetricMs: round(sample.qualityMetricMs),
    workerEvents: workerEvents.count - workersBefore
  };
}

async function runFixtureResumeCheck(page, config, expected) {
  return page.evaluate(
    async ({ input, reference }) => {
      const api = window.__AUTO_CREATE_COMPARE_BENCHMARK__;
      if (!api) throw new Error('The AutoCreate compare API is unavailable.');
      return api.resumeCheck(input, reference);
    },
    {
      input: config,
      reference: expected
    }
  );
}

async function runModelStateChecks({
  page,
  workerEvents,
  metadata,
  fixture,
  tiles,
  tileBudget,
  replaceEvery,
  exportEvery,
  variantCacheItems,
  modelRevision,
  featureSchema
}) {
  if (!metadata.capabilities.rankerBenchmarkControl) {
    return {
      supported: false,
      skipped: true,
      pass: true,
      note: 'No __AUTO_CREATE_RANKER_BENCHMARK_CONTROL__ hook was registered by the ranker implementation.',
      samples: []
    };
  }

  const baseConfig = {
    ...fixture,
    tiles: Math.min(tiles, 64),
    tileBudget: Math.min(tileBudget, 4),
    replaceEvery: Math.min(replaceEvery, 2),
    exportEvery,
    variantCacheItems,
    modelRevision,
    featureSchema
  };
  const samples = [];
  const legacy = await runBrowserSample(page, {
    ...baseConfig,
    searchStrategy: 'legacy',
    modelState: 'ready'
  }, workerEvents);
  samples.push(legacy);

  for (const state of ['ready', 'cold', 'failure']) {
    for (const strategy of ['strict-ml-tfjs', 'strict-ml-typed']) {
      const sample = await runBrowserSample(page, {
        ...baseConfig,
        searchStrategy: strategy,
        modelState: state
      }, workerEvents);
      samples.push(sample);
    }
  }
  const checks = samples
    .filter((sample) => sample.searchStrategy !== 'legacy')
    .map((sample) => {
      const ranker = sample.ranker ?? {};
      const expectsFallback = sample.modelState === 'cold' || sample.modelState === 'failure';
      const readyExpectation = modelRevision
        ? ranker.effectiveStrategy === sample.searchStrategy && ranker.modelRevision === modelRevision
        : true;
      return {
        strategy: sample.searchStrategy,
        state: sample.modelState,
        pass:
          sample.workerEvents >= 1 &&
          (
            expectsFallback
              ? sample.outputChecksum === legacy.outputChecksum &&
                ranker.effectiveStrategy === 'legacy' &&
                typeof ranker.fallbackReason === 'string' &&
                ranker.fallbackReason.length > 0
              : readyExpectation
          ),
        requestedStrategy: ranker.requestedStrategy ?? null,
        effectiveStrategy: ranker.effectiveStrategy ?? null,
        modelRevision: ranker.modelRevision ?? null,
        fallbackReason: ranker.fallbackReason ?? null,
        outputChecksum: sample.outputChecksum,
        legacyChecksum: legacy.outputChecksum
      };
    });
  return {
    supported: true,
    skipped: false,
    pass: checks.every((check) => check.pass),
    checks,
    samples
  };
}

async function buildModelPreflight({
  page,
  profile,
  fixtures,
  camps,
  requestedRevision,
  requestedFeatureSchema
}) {
  const targetSignatures = [];
  for (const fixture of fixtures) {
    const signature = await page.evaluate(
      async (input) => {
        const api = window.__AUTO_CREATE_COMPARE_BENCHMARK__;
        if (!api) throw new Error('The AutoCreate compare API is unavailable.');
        return api.targetSignature(input);
      },
      fixture
    );
    targetSignatures.push({
      fixtureId: fixture.id,
      camp: fixture.camp,
      signature
    });
  }

  const requireReady = profile === 'full' || Boolean(requestedRevision);
  const models = [];
  for (const camp of camps) {
    const inspection = await page.evaluate(
      async (input) => {
        const api = window.__AUTO_CREATE_COMPARE_BENCHMARK__;
        if (!api) throw new Error('The AutoCreate compare API is unavailable.');
        return api.inspectModel(input);
      },
      {
        camp,
        revision: requestedRevision,
        featureSchema: requestedFeatureSchema
      }
    );
    const benchmarkTargetSignatures = [
      ...new Set(
        targetSignatures
          .filter((target) => target.camp === camp)
          .map((target) => target.signature)
      )
    ].sort();
    const trainingTargetSignatures = Array.isArray(inspection.trainingTargetSignatures)
      ? [...new Set(inspection.trainingTargetSignatures)].sort()
      : null;
    const trainedModes = Array.isArray(inspection.trainedModes)
      ? [...inspection.trainedModes]
      : null;
    const trainedModesComplete = hasCompleteTrainedModes(trainedModes);
    const overlappingTargetSignatures = trainingTargetSignatures
      ? benchmarkTargetSignatures.filter((signature) => trainingTargetSignatures.includes(signature))
      : [];
    const ready = Boolean(
      inspection.supported &&
      inspection.revision &&
      inspection.portableWeights &&
      (!requestedRevision || inspection.revision === requestedRevision) &&
      (!requestedFeatureSchema || inspection.featureSchema === requestedFeatureSchema)
    );
    const trainingProofPresent = Boolean(
      trainingTargetSignatures &&
      trainingTargetSignatures.length > 0
    );
    const leakageSafe = trainingProofPresent && overlappingTargetSignatures.length === 0;
    models.push({
      camp,
      requireReady,
      ready,
      revision: inspection.revision ?? null,
      featureSchema: inspection.featureSchema ?? null,
      portableWeights: inspection.portableWeights === true,
      trainedModes,
      trainedModesComplete,
      trainingProofPresent,
      trainingTargetSignatures,
      benchmarkTargetSignatures,
      overlappingTargetSignatures,
      leakageSafe,
      note: inspection.note ?? null,
      pass:
        (!requireReady || (ready && trainedModesComplete)) &&
        (!ready || leakageSafe)
    });
  }
  return {
    requireReady,
    targetSignatures,
    models,
    pass: models.every((model) => model.pass)
  };
}

async function runRuntimeParityChecks({ page, models, seed }) {
  const checks = [];
  for (const model of models) {
    if (!model.ready || !model.revision) continue;
    checks.push(await page.evaluate(
      async (input) => {
        const api = window.__AUTO_CREATE_COMPARE_BENCHMARK__;
        if (!api) throw new Error('The AutoCreate compare API is unavailable.');
        return api.runtimeParity(input);
      },
      {
        camp: model.camp,
        revision: model.revision,
        seed: deriveSeed(seed, model.camp, model.revision, 'runtime-parity'),
        rowCount: 384,
        measuredRuns: 7
      }
    ));
  }
  return checks;
}

async function main() {
  const { values, switches } = parseArguments(process.argv.slice(2));
  const profile = values.get('profile') ?? process.env.AUTO_CREATE_COMPARE_PROFILE ?? 'quick';
  if (!(profile in PROFILE_DEFAULTS)) throw new Error(`profile must be quick or full; received ${profile}.`);
  const defaults = PROFILE_DEFAULTS[profile];
  const camps = stringList(values.get('camps') ?? process.env.AUTO_CREATE_COMPARE_CAMPS, defaults.camps);
  const families = enumList(
    values.get('families') ?? process.env.AUTO_CREATE_COMPARE_FAMILIES,
    defaults.families,
    TARGET_FAMILIES,
    'target family'
  );
  const sizes = integerList(
    values.get('sizes') ?? process.env.AUTO_CREATE_COMPARE_SIZES,
    defaults.sizes,
    'size'
  );
  const seed = positiveInteger(
    values.get('seed') ?? process.env.AUTO_CREATE_COMPARE_SEED,
    DEFAULT_SEED,
    'seed'
  );
  const seeds = values.has('seeds')
    ? integerList(values.get('seeds'), [], 'seed')
    : profileSeeds(seed, defaults.seedCount);
  const targetSeed = positiveInteger(
    values.get('target-seed') ?? process.env.AUTO_CREATE_COMPARE_TARGET_SEED,
    DEFAULT_TARGET_SEED,
    'target-seed'
  );
  const warmupRuns = positiveInteger(
    values.get('warmup') ?? process.env.AUTO_CREATE_COMPARE_WARMUP,
    defaults.warmupRuns,
    'warmup',
    { allowZero: true }
  );
  const measuredRuns = positiveInteger(
    values.get('runs') ?? process.env.AUTO_CREATE_COMPARE_RUNS,
    defaults.measuredRuns,
    'runs'
  );
  const tiles = positiveInteger(
    values.get('tiles') ?? process.env.AUTO_CREATE_COMPARE_TILES,
    defaults.tiles,
    'tiles'
  );
  const tileBudget = positiveInteger(
    values.get('tile-budget') ?? process.env.AUTO_CREATE_COMPARE_TILE_BUDGET,
    defaults.tileBudget,
    'tile-budget'
  );
  const replaceEvery = positiveInteger(
    values.get('replace-every') ?? process.env.AUTO_CREATE_COMPARE_REPLACE_EVERY,
    defaults.replaceEvery,
    'replace-every'
  );
  const exportEvery = positiveInteger(
    values.get('export-every') ?? process.env.AUTO_CREATE_COMPARE_EXPORT_EVERY,
    0,
    'export-every',
    { allowZero: true }
  );
  const variantCacheItems = positiveInteger(
    values.get('variant-cache-items') ?? process.env.AUTO_CREATE_COMPARE_VARIANT_CACHE_ITEMS,
    0,
    'variant-cache-items',
    { allowZero: true }
  );
  const maxCases = positiveInteger(
    values.get('max-cases') ?? process.env.AUTO_CREATE_COMPARE_MAX_CASES,
    0,
    'max-cases',
    { allowZero: true }
  );
  const strategies = enumList(
    values.get('strategies') ?? process.env.AUTO_CREATE_COMPARE_STRATEGIES,
    AUTO_CREATE_SEARCH_STRATEGIES,
    new Set(AUTO_CREATE_SEARCH_STRATEGIES),
    'search strategy'
  );
  const outputDirectory = values.get('output') ??
    process.env.AUTO_CREATE_COMPARE_OUTPUT ??
    DEFAULT_OUTPUT_DIRECTORY;
  const outputName = values.get('name') ?? process.env.AUTO_CREATE_COMPARE_NAME ?? null;
  const modelRevision = values.get('model-revision') ??
    process.env.AUTO_CREATE_COMPARE_MODEL_REVISION ??
    null;
  const featureSchema = values.get('feature-schema') ??
    process.env.AUTO_CREATE_COMPARE_FEATURE_SCHEMA ??
    null;
  const baselineInput = values.get('baseline') ?? process.env.AUTO_CREATE_COMPARE_BASELINE ?? null;
  const headed = switches.has('headed') || envFlag('AUTO_CREATE_COMPARE_HEADED');
  const reportOnly = switches.has('report-only') || envFlag('AUTO_CREATE_COMPARE_REPORT_ONLY');
  const checkModelStates = !switches.has('skip-model-state-checks') && (
    switches.has('model-state-checks') ||
    profile === 'full' ||
    profile === 'quick' ||
    envFlag('AUTO_CREATE_COMPARE_MODEL_STATE_CHECKS')
  );
  const port = positiveInteger(
    values.get('port') ?? process.env.AUTO_CREATE_COMPARE_PORT,
    0,
    'port',
    { allowZero: true }
  );
  const explicitTfjsGzipBytes = positiveInteger(
    values.get('tfjs-gzip-bytes') ?? process.env.AUTO_CREATE_COMPARE_TFJS_GZIP_BYTES,
    null,
    'tfjs-gzip-bytes',
    { allowZero: true }
  );
  const explicitTypedGzipBytes = positiveInteger(
    values.get('typed-gzip-bytes') ?? process.env.AUTO_CREATE_COMPARE_TYPED_GZIP_BYTES,
    null,
    'typed-gzip-bytes',
    { allowZero: true }
  );
  const productionRuntimeBundles = await measureProductionRuntimeBundles();
  const tfjsGzipBytes = explicitTfjsGzipBytes
    ?? productionRuntimeBundles?.tfjsGzipBytes
    ?? null;
  const typedGzipBytes = explicitTypedGzipBytes
    ?? productionRuntimeBundles?.typedGzipBytes
    ?? null;

  const fixtureMatrix = buildFixtureMatrix({
    camps,
    families,
    sizes,
    seeds,
    targetSeed,
    maxCases
  });
  if (!fixtureMatrix.length) throw new Error('No benchmark fixtures were selected.');
  const baseline = await readBaseline(baselineInput);

  const vite = await createServer({
    root: REPOSITORY_ROOT,
    logLevel: 'error',
    plugins: [benchmarkPagePlugin()],
    server: {
      host: '127.0.0.1',
      port,
      strictPort: port > 0
    }
  });
  let browser;
  try {
    await vite.listen();
    browser = await chromium.launch({ headless: !headed });
    const context = await browser.newContext();
    const page = await context.newPage();
    const workerEvents = { count: 0 };
    page.on('worker', () => {
      workerEvents.count += 1;
    });
    page.on('pageerror', (error) => {
      process.stderr.write(`[browser error] ${error.stack ?? error.message}\n`);
    });
    const benchmarkUrl = getServerUrl(vite);
    await page.goto(benchmarkUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.compareBenchmarkReady === 'true');

    const metadata = await page.evaluate(() => window.__AUTO_CREATE_COMPARE_BENCHMARK__?.metadata());
    if (!metadata) throw new Error('The browser compare API did not initialize.');
    if (!metadata.capabilities.worker || !metadata.capabilities.offscreenCanvas || !metadata.capabilities.createImageBitmap) {
      throw new Error(`Chromium is missing required Worker capabilities: ${JSON.stringify(metadata.capabilities)}.`);
    }

    const modelPreflight = await buildModelPreflight({
      page,
      profile,
      fixtures: fixtureMatrix,
      camps: [...new Set(fixtureMatrix.map((fixture) => fixture.camp))],
      requestedRevision: modelRevision,
      requestedFeatureSchema: featureSchema
    });
    if (profile === 'full' && !modelPreflight.pass) {
      const failures = modelPreflight.models
        .filter((model) => !model.pass)
        .map((model) => (
          `${model.camp}: ready=${model.ready}, trainingProof=${model.trainingProofPresent}, ` +
          `trainedModes=${JSON.stringify(model.trainedModes)}, ` +
          `overlap=${model.overlappingTargetSignatures.length}`
        ));
      throw new Error(
        `Full benchmark requires a frozen, portable and leakage-safe model for every camp. ${failures.join('; ')}`
      );
    }
    const frozenRevisionByCamp = new Map(
      modelPreflight.models.map((model) => [model.camp, model.ready ? model.revision : null])
    );
    const frozenFeatureSchemaByCamp = new Map(
      modelPreflight.models.map((model) => [model.camp, model.ready ? model.featureSchema : featureSchema])
    );

    const fixtures = [];
    for (let fixtureIndex = 0; fixtureIndex < fixtureMatrix.length; fixtureIndex += 1) {
      const fixtureConfig = fixtureMatrix[fixtureIndex];
      const warmups = Object.fromEntries(strategies.map((strategy) => [strategy, []]));
      const samples = Object.fromEntries(strategies.map((strategy) => [strategy, []]));
      const totalRounds = warmupRuns + measuredRuns;
      for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
        const phase = roundIndex < warmupRuns ? 'warmup' : 'measure';
        const phaseRun = phase === 'warmup' ? roundIndex + 1 : roundIndex - warmupRuns + 1;
        const phaseTotal = phase === 'warmup' ? warmupRuns : measuredRuns;
        const runOrder = seededShuffle(
          strategies,
          deriveSeed(fixtureConfig.seed, fixtureConfig.targetSeed, phase, phaseRun)
        );
        for (const strategy of runOrder) {
          process.stderr.write(
            `[compare ${fixtureIndex + 1}/${fixtureMatrix.length}] ${fixtureConfig.id} ` +
            `${phase} ${phaseRun}/${phaseTotal} ${strategy}\n`
          );
          const sample = await runBrowserSample(page, {
            ...fixtureConfig,
            tiles,
            tileBudget,
            replaceEvery,
            exportEvery,
            variantCacheItems,
            searchStrategy: strategy,
            modelState: 'ready',
            modelRevision: frozenRevisionByCamp.get(fixtureConfig.camp) ?? null,
            featureSchema: frozenFeatureSchemaByCamp.get(fixtureConfig.camp) ?? null
          }, workerEvents);
          if (sample.workerEvents < 1) {
            throw new Error(`${fixtureConfig.id} ${phase} ${strategy} did not create a dedicated Worker.`);
          }
          (phase === 'warmup' ? warmups : samples)[strategy].push(sample);
        }
      }
      const typedReference = samples['strict-ml-typed']?.[0] ?? null;
      const resumeCheck = typedReference
        ? await runFixtureResumeCheck(
            page,
            {
              ...fixtureConfig,
              tiles,
              tileBudget,
              replaceEvery,
              exportEvery,
              variantCacheItems,
              searchStrategy: 'strict-ml-typed',
              modelState: 'ready',
              modelRevision: frozenRevisionByCamp.get(fixtureConfig.camp) ?? null,
              featureSchema: frozenFeatureSchemaByCamp.get(fixtureConfig.camp) ?? null
            },
            {
              outputChecksum: typedReference.outputChecksum,
              modelRevision: typedReference.ranker?.modelRevision ?? null
            }
          )
        : {
            supported: false,
            pass: false,
            strategy: 'strict-ml-typed',
            revision: null,
            stoppedStep: null,
            uninterruptedChecksum: null,
            resumedChecksum: null,
            expectedChecksum: null,
            note: 'strict-ml-typed was omitted, so stop/resume parity could not be measured.'
          };
      fixtures.push(evaluateFixture({
        ...fixtureConfig,
        warmups,
        samples,
        resumeCheck
      }, {
        profile,
        thresholds: AUTO_CREATE_COMPARE_THRESHOLDS,
        requireReadyModel:
          profile === 'full' ||
          Boolean(frozenRevisionByCamp.get(fixtureConfig.camp))
      }));
    }

    const runtimeParityChecks = await runRuntimeParityChecks({
      page,
      models: modelPreflight.models,
      seed
    });
    const aggregate = aggregateCompareReport(fixtures, {
      profile,
      thresholds: AUTO_CREATE_COMPARE_THRESHOLDS,
      modelPreflight,
      runtimeParityChecks
    });
    const runtimeDecision = recommendRuntimeAdapter(aggregate, fixtures, {
      tfjsGzipBytes,
      typedGzipBytes,
      runtimeParityChecks
    });
    const modelStateChecks = checkModelStates
      ? await runModelStateChecks({
          page,
          workerEvents,
          metadata,
          fixture: fixtureMatrix[0],
          tiles,
          tileBudget,
          replaceEvery,
          exportEvery,
          variantCacheItems,
          modelRevision: frozenRevisionByCamp.get(fixtureMatrix[0].camp) ?? null,
          featureSchema: frozenFeatureSchemaByCamp.get(fixtureMatrix[0].camp) ?? null
        })
      : null;
    const generatedAt = new Date().toISOString();
    const cpuModels = [...new Set(os.cpus().map((cpu) => cpu.model))];
    const observedRankerRuns = [
      ...new Map(
        fixtures
          .flatMap((fixture) => Object.values(fixture.samples ?? {}))
          .flat()
          .map((sample) => sample.ranker)
          .filter(Boolean)
          .map((ranker) => [JSON.stringify(ranker), ranker])
      ).values()
    ];
    const report = {
      schemaVersion: AUTO_CREATE_COMPARE_SCHEMA_VERSION,
      benchmark: 'auto-create-twrole-compare',
      generatedAt,
      profile,
      config: {
        camps,
        families,
        sizes,
        seeds,
        warmupRuns,
        measuredRuns,
        tiles,
        tileBudget,
        replaceEvery,
        exportEvery,
        variantCacheItems: variantCacheItems || null,
        strategies,
        resetExperience: true,
        pairedInSingleBrowserSession: true,
        randomizedStrategyOrder: true,
        thresholds: AUTO_CREATE_COMPARE_THRESHOLDS,
        sourceFilter: "filterPartOptionsByCamp('deco', camp)",
        autoCreateSettingsTemplate: {
          ...metadata.defaults,
          tiles,
          tileBudget,
          seed: 'fixture.seed',
          resetExperience: true,
          exportEvery,
          logEvery: 250,
          replaceEvery,
          variantCacheItems: variantCacheItems || metadata.defaults.variantCacheItems,
          experienceJson: 'compare-{camp}-{family}-{size}.json',
          searchStrategy: 'per-run',
          rankerRolloutApproved: true
        }
      },
      model: {
        revision: modelRevision,
        featureSchema,
        frozenByCamp: Object.fromEntries(
          modelPreflight.models.map((model) => [
            model.camp,
            {
              revision: model.revision,
              featureSchema: model.featureSchema
            }
          ])
        ),
        requestedRuntimeAdapters: strategies.filter((strategy) => strategy.startsWith('strict-ml-')),
        observedRuns: observedRankerRuns
      },
      runtimeBundles: productionRuntimeBundles,
      modelPreflight,
      runtimeParityChecks,
      environment: {
        commitSha: gitValue(['rev-parse', 'HEAD']),
        dirty: gitValue(['status', '--porcelain', '--untracked-files=no'], '') !== '',
        node: process.version,
        platform: process.platform,
        release: os.release(),
        arch: process.arch,
        cpuCount: os.cpus().length,
        cpuModels,
        chromium: browser.version(),
        benchmarkUrl,
        ...metadata
      },
      workerEvents: workerEvents.count,
      fixtures,
      aggregate,
      runtimeDecision,
      ...(modelStateChecks ? { modelStateChecks } : {})
    };
    if (baseline) {
      report.baseline = {
        file: relativeFilename(baseline.absolutePath),
        generatedAt: baseline.report.generatedAt ?? null
      };
      report.baselineComparison = compareAgainstBaseline(report, baseline.report);
    }
    report.overallPass = Boolean(
      report.aggregate.gates.pass &&
      modelPreflight.pass &&
      (!report.baselineComparison || report.baselineComparison.pass) &&
      (!modelStateChecks || modelStateChecks.pass)
    );

    const filenames = outputFilenames(outputDirectory, generatedAt, outputName);
    await mkdir(filenames.absoluteDirectory, { recursive: true });
    const markdown = buildMarkdownReport(report);
    report.outputFiles = {
      json: relativeFilename(filenames.json),
      markdown: relativeFilename(filenames.markdown)
    };
    await writeFile(filenames.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(filenames.markdown, `${markdown}\n`, 'utf8');
    process.stdout.write(`${markdown}\n`);
    process.stdout.write(`JSON: ${report.outputFiles.json}\nMarkdown: ${report.outputFiles.markdown}\n`);
    if (!report.overallPass && !reportOnly) process.exitCode = 1;
  } finally {
    await browser?.close();
    await vite.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
