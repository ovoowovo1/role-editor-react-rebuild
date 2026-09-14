import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createDefaultRole, partOptions } from '../src/mock/options';
import { applyRoleHistoryPatch, createHistoryIdPool, createRoleHistoryPatch } from '../src/lib/editor/editorRoleHistoryPatch';
import { applyTranslateDelta, captureDecorationTransforms } from '../src/lib/editor/editorTransformUtils';
import { sameRole } from '../src/lib/editor/editorHistoryTypes';
import { normalizeImportedRole } from '../src/lib/serialization/roleSerializationImport';
import type { DecorationLayer, RoleDocument } from '../src/types/role';

type ScenarioName = 'patch-create' | 'patch-undo-redo' | 'transform-snapshot' | 'no-op-equality' | 'import-normalization';
type Summary = { median: number; p95: number; min: number; max: number; samples: number[] };

interface BenchmarkResult {
  layers: number;
  scenarios: Record<ScenarioName, Summary>;
  environment: {
    node: string;
    commit: string;
    browserLongTask: 'unavailable';
    browserHeap: 'unavailable';
  };
}

interface BenchmarkOptions {
  layers: number[];
  warmup: number;
  runs: number;
  iterations: number;
  output?: string;
}

function parseOptions(argv: string[]): BenchmarkOptions {
  const value = (name: string, fallback: string): string => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] ?? fallback : fallback;
  };
  const layers = value('layers', '100,1000,5000').split(',').map(Number).filter((count) => Number.isInteger(count) && count > 0);
  return {
    layers: layers.length ? layers : [100, 1000, 5000],
    warmup: Math.max(0, Number(value('warmup', '1')) || 1),
    runs: Math.max(1, Number(value('runs', '5')) || 5),
    iterations: Math.max(1, Number(value('iterations', '30')) || 30),
    output: argv.includes('--output') ? value('output', '') : undefined
  };
}

function fixture(count: number): RoleDocument {
  const role = createDefaultRole();
  const option = partOptions.deco.find((candidate) => candidate.atlas) ?? partOptions.deco[0];
  const decorations: DecorationLayer[] = Array.from({ length: count }, (_, index) => ({
    id: `bench-${index}`,
    code: option.code,
    assetId: option.id,
    name: `Layer ${index}`,
    x: (index % 100) - 50,
    y: (Math.floor(index / 100) % 100) - 50,
    scaleX: 0.2,
    scaleY: 0.2,
    rotation: index % 360,
    visible: true,
    opacity: 1
  }));
  return {
    ...role,
    decorations,
    groups: [{
      id: 'bench-group',
      name: 'Benchmark group',
      itemIds: decorations.slice(0, Math.min(20, count)).map((item) => item.id),
      visible: true,
      collapsed: false
    }],
    headLayerIndex: count
  };
}

function summarize(samples: number[]): Summary {
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (rank: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * rank) - 1))];
  return {
    median: percentile(0.5),
    p95: percentile(0.95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    samples
  };
}

function makeScenario(role: RoleDocument, scenario: ScenarioName) {
  const changed = applyTranslateDelta(role, role.decorations.map((item) => item.id), 1, -1);
  const pool = createHistoryIdPool();
  const patch = createRoleHistoryPatch(role, changed, pool);
  const target = captureDecorationTransforms(role, role.decorations.map((item) => item.id));
  const imported = JSON.parse(JSON.stringify(role)) as unknown;
  return () => {
    switch (scenario) {
      case 'patch-create':
        createRoleHistoryPatch(role, changed, pool);
        return;
      case 'patch-undo-redo':
        if (!patch) return;
        const undone = applyRoleHistoryPatch(changed, patch, 'before');
        applyRoleHistoryPatch(undone, patch, 'after');
        return;
      case 'transform-snapshot':
        captureDecorationTransforms(changed, role.decorations.map((item) => item.id));
        return;
      case 'no-op-equality':
        sameRole(role, { ...role, updatedAt: `${role.updatedAt}-changed` });
        return;
      case 'import-normalization':
        normalizeImportedRole(imported);
        return;
    }
  };
}

function runLayerBenchmark(count: number, options: BenchmarkOptions): BenchmarkResult {
  const role = fixture(count);
  const scenarios: ScenarioName[] = ['patch-create', 'patch-undo-redo', 'transform-snapshot', 'no-op-equality', 'import-normalization'];
  const result = {} as Record<ScenarioName, Summary>;
  for (const scenario of scenarios) {
    const run = makeScenario(role, scenario);
    for (let warmup = 0; warmup < options.warmup; warmup += 1) {
      for (let iteration = 0; iteration < options.iterations; iteration += 1) run();
    }
    const samples: number[] = [];
    for (let round = 0; round < options.runs; round += 1) {
      for (let iteration = 0; iteration < options.iterations; iteration += 1) {
        const start = performance.now();
        run();
        samples.push(performance.now() - start);
      }
    }
    result[scenario] = summarize(samples);
  }
  let commit = 'unknown';
  try {
    const repositoryPath = process.cwd().replaceAll('\\', '/');
    commit = execFileSync('git', ['-c', `safe.directory=${repositoryPath}`, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    // Benchmark output remains useful when Git metadata is unavailable.
  }
  return {
    layers: count,
    scenarios: result,
    environment: {
      node: process.version,
      commit,
      browserLongTask: 'unavailable',
      browserHeap: 'unavailable'
    }
  };
}

const options = parseOptions(process.argv.slice(2));
const results = options.layers.map((count) => runLayerBenchmark(count, options));
const output = JSON.stringify({ options, results }, null, 2);
if (options.output) {
  await writeFile(options.output, `${output}\n`, 'utf8');
}
console.log(output);
