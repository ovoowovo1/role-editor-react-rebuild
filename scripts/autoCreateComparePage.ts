import { DEFAULT_AUTO_CREATE_TWROLE_SETTINGS } from '../src/lib/conversion/autoCreateTwrole';
import type {
  AutoCreateTwroleCheckpoint,
  AutoCreateTwroleResult,
  AutoCreateTwroleSettings,
  RunAutoCreateTwroleOptions
} from '../src/lib/conversion/autoCreateTwrole';
import type { AutoCreateTwroleDiagnostics } from '../src/lib/conversion/auto-create-twrole/diagnostics';
import type {
  WorkerRequestMessage,
  WorkerResponseMessage
} from '../src/lib/conversion/auto-create-twrole/workerProtocol';
import { erodeContainmentMask } from '../src/lib/conversion/auto-create-twrole/containment';
import {
  createIndexedDbLearningStore,
  createTfjsDenseRankerAdapter,
  createTypedDenseRankerPredictor,
  stableRankPredictions,
  TRAINING_DATA_FINGERPRINT_VERSION
} from '../src/lib/conversion/auto-create-twrole/learning';
import {
  AUTO_CREATE_FEATURE_SCHEMA_VERSION,
  AUTO_CREATE_RANKING_POLICY_VERSION
} from '../src/lib/conversion/auto-create-twrole/contracts';
import {
  loadTargetImage,
  targetSignatureForImage
} from '../src/lib/conversion/auto-create-twrole/sourcePipeline';
import { renderAutoCreateWorkspacePreview } from '../src/components/auto-create/autoCreateWorkspacePreview';
import { createDefaultRole, filterPartOptionsByCamp } from '../src/mock/options';

type SearchStrategy =
  | 'legacy'
  | 'descriptor-control'
  | 'strict-heuristic'
  | 'strict-ml-tfjs'
  | 'strict-ml-typed';

type TargetFamily =
  | 'flat'
  | 'gradient'
  | 'texture'
  | 'semi-transparent'
  | 'hole'
  | 'thin-outline'
  | 'boundary'
  | 'high-color'
  | 'hole-boundary';

type ModelState = 'ready' | 'cold' | 'failure';

interface AutoCreateCompareCase {
  id: string;
  family: TargetFamily;
  size: number;
  tiles: number;
  seed: number;
  targetSeed: number;
  camp: string;
  exportEvery: number;
  variantCacheItems: number;
  searchStrategy: SearchStrategy;
  modelState: ModelState;
  modelRevision: string | null;
  featureSchema: string | null;
  tileBudget: number;
  replaceEvery: number;
}

interface AutoCreateCompareTimelinePoint {
  elapsedMs: number;
  step: number;
  total: number;
  mse: number;
  active: number;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
}

interface RankerBenchmarkPreparation {
  supported: boolean;
  state: ModelState;
  revision?: string | null;
  featureSchema?: string | null;
  trainingTargetSignatures?: readonly string[] | null;
  trainedModes?: readonly string[] | null;
  portableWeights?: boolean;
  note?: string;
}

interface RankerBenchmarkControl {
  prepare(input: {
    camp: string;
    state: ModelState;
    revision: string | null;
    featureSchema: string | null;
  }): Promise<RankerBenchmarkPreparation> | RankerBenchmarkPreparation;
}

interface AutoCreateCompareSample {
  fixtureId: string;
  family: TargetFamily;
  searchStrategy: SearchStrategy;
  modelState: ModelState;
  modelStatePreparation: RankerBenchmarkPreparation;
  durationMs: number;
  previewRenderMs: number;
  uiReadyDurationMs: number;
  qualityMetricMs: number;
  mse: number;
  coverage: number;
  alphaIou: number;
  containmentLeakagePixels: number;
  placementLeakagePixels: number;
  outputChecksum: string;
  targetChecksum: string;
  targetSignature: string;
  count: number;
  sourceCount: number;
  filteredSourceCount: number;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  warningCount: number;
  targetWidth: number;
  targetHeight: number;
  timeline: AutoCreateCompareTimelinePoint[];
  diagnostics: AutoCreateTwroleDiagnostics;
  ranker?: unknown;
}

interface AutoCreateCompareMetadata {
  userAgent: string;
  hardwareConcurrency: number;
  crossOriginIsolated: boolean;
  capabilities: {
    worker: boolean;
    offscreenCanvas: boolean;
    createImageBitmap: boolean;
    indexedDb: boolean;
    rankerBenchmarkControl: boolean;
  };
  defaults: AutoCreateTwroleSettings;
}

interface AutoCreateCompareApi {
  metadata(): AutoCreateCompareMetadata;
  run(config: AutoCreateCompareCase): Promise<AutoCreateCompareSample>;
  targetSignature(
    config: Pick<AutoCreateCompareCase, 'family' | 'size' | 'targetSeed'>
  ): Promise<string>;
  inspectModel(input: {
    camp: string;
    revision: string | null;
    featureSchema: string | null;
  }): Promise<RankerBenchmarkPreparation>;
  runtimeParity(input: {
    camp: string;
    revision: string;
    seed: number;
    rowCount?: number;
    measuredRuns?: number;
  }): Promise<RuntimeParityResult>;
  resumeCheck(
    config: AutoCreateCompareCase,
    expected?: { outputChecksum: string; modelRevision: string | null }
  ): Promise<ResumeDeterminismResult>;
}

interface RuntimeParityResult {
  camp: string;
  supported: boolean;
  ready: boolean;
  revision: string | null;
  featureSchema: string | null;
  rowCount: number;
  measuredRuns: number;
  featureMatrixChecksum: string | null;
  maxAbsError: number | null;
  stableRankingMatch: boolean;
  tfjsPredictMs: number | null;
  typedPredictMs: number | null;
  note?: string;
}

interface ResumeDeterminismResult {
  supported: boolean;
  pass: boolean;
  strategy: SearchStrategy;
  revision: string | null;
  stoppedStep: number | null;
  uninterruptedChecksum: string | null;
  resumedChecksum: string | null;
  expectedChecksum?: string | null;
  note?: string;
}

interface PreparedTarget {
  file: File;
  rgba: Uint8ClampedArray;
  scoringMask: Uint8Array;
  containmentMask: Uint8Array;
  placementMask: Uint8Array;
  scoringCount: number;
  checksum: string;
  signature: string;
}

declare global {
  interface Window {
    __AUTO_CREATE_COMPARE_BENCHMARK__?: AutoCreateCompareApi;
    __AUTO_CREATE_RANKER_BENCHMARK_CONTROL__?: RankerBenchmarkControl;
  }
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mixUint32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function hashText(text: string): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < text.length; index += 1) {
    const value = text.charCodeAt(index);
    hashA = Math.imul(hashA ^ value, 0x01000193);
    hashB = Math.imul(hashB ^ value, 0x85ebca6b);
    hashB ^= hashB >>> 13;
  }
  return `${text.length}:${(hashA >>> 0).toString(16).padStart(8, '0')}:${(hashB >>> 0).toString(16).padStart(8, '0')}`;
}

function hashBytes(bytes: Uint8ClampedArray): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < bytes.length; index += 1) {
    hashA = Math.imul(hashA ^ bytes[index], 0x01000193);
    hashB = Math.imul(hashB ^ bytes[index], 0x85ebca6b);
    hashB ^= hashB >>> 13;
  }
  return `${bytes.length}:${(hashA >>> 0).toString(16).padStart(8, '0')}:${(hashB >>> 0).toString(16).padStart(8, '0')}`;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`);
  return `{${entries.join(',')}}`;
}

function normalizedOutput(result: AutoCreateTwroleResult): unknown {
  return {
    targetWidth: result.targetWidth,
    targetHeight: result.targetHeight,
    sourceWidth: result.sourceWidth,
    sourceHeight: result.sourceHeight,
    sourceCount: result.sourceCount,
    insertScale: result.insertScale,
    mse: result.mse,
    accepted: result.accepted,
    rejected: result.rejected,
    pruned: result.pruned,
    replaced: result.replaced,
    warnings: result.warnings,
    decorations: result.decorations,
    exportJson: result.exportJson
  };
}

function targetPixel(
  family: TargetFamily,
  x: number,
  y: number,
  size: number,
  seed: number
): readonly [number, number, number, number] {
  const denominator = Math.max(1, size - 1);
  const nx = x / denominator;
  const ny = y / denominator;
  const px = nx * 2 - 1;
  const py = ny * 2 - 1;
  const radial = Math.hypot(px, py);
  const shiftedRadial = Math.hypot(px + 0.48, py + 0.12);
  const pixel = y * size + x;
  const noise = mixUint32((pixel ^ seed) >>> 0);
  const fine = (noise & 63) - 31;
  const checkerSide = Math.max(2, Math.floor(size / 14));
  const checker = ((Math.floor(x / checkerSide) + Math.floor(y / checkerSide)) & 1) === 0 ? 1 : -1;

  let inside = false;
  let alpha = 255;
  if (family === 'flat') {
    inside = Math.max(Math.abs(px), Math.abs(py)) < 0.82;
  } else if (family === 'gradient' || family === 'texture' || family === 'semi-transparent' || family === 'high-color') {
    inside = radial < 0.9;
  } else if (family === 'hole') {
    inside = radial < 0.91 && radial > 0.32;
  } else if (family === 'thin-outline') {
    const halfThickness = Math.max(0.045, 4 / size);
    inside = Math.abs(radial - 0.7) <= halfThickness;
  } else if (family === 'boundary') {
    inside = x < size * 0.84 && y < size * 0.9 && px + py < 1.1;
  } else if (family === 'hole-boundary') {
    const smallHole = Math.hypot(px + 0.45, py - 0.06) < 0.18;
    inside = shiftedRadial < 0.9 && !smallHole;
  }
  if (!inside) return [0, 0, 0, 0];

  if (family === 'semi-transparent') {
    alpha = clampByte(72 + Math.max(0, 1 - radial / 0.9) * 168 + (noise & 15));
  }

  if (family === 'flat') return [76, 138, 214, alpha];
  if (family === 'gradient' || family === 'semi-transparent') {
    return [
      clampByte(28 + nx * 190),
      clampByte(42 + ny * 178),
      clampByte(210 - nx * 96 + ny * 32),
      alpha
    ];
  }
  if (family === 'texture' || family === 'hole' || family === 'hole-boundary' || family === 'thin-outline') {
    return [
      clampByte(86 + checker * 36 + fine * 0.7 + nx * 55),
      clampByte(118 - checker * 31 + fine * 0.4 + ny * 72),
      clampByte(146 + checker * 44 - fine * 0.55),
      alpha
    ];
  }
  if (family === 'high-color') {
    const sectorX = Math.floor(nx * 6);
    const sectorY = Math.floor(ny * 6);
    return [
      clampByte((sectorX * 71 + sectorY * 29 + fine * 2) % 256),
      clampByte((sectorY * 83 + sectorX * 17 - fine) % 256),
      clampByte(((sectorX + sectorY) * 59 + 128 + fine) % 256),
      alpha
    ];
  }
  return [
    clampByte(48 + nx * 122 + fine * 0.35),
    clampByte(62 + ny * 146 - fine * 0.25),
    clampByte(192 - nx * 57 + checker * 22),
    alpha
  ];
}

async function createTarget(config: Pick<AutoCreateCompareCase, 'family' | 'size' | 'targetSeed'>): Promise<PreparedTarget> {
  const { family, size, targetSeed } = config;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('The compare benchmark needs a Canvas 2D context.');

  const rgba = new Uint8ClampedArray(size * size * 4);
  const scoringMask = new Uint8Array(size * size);
  const containmentMask = new Uint8Array(size * size);
  let scoringCount = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = y * size + x;
      const offset = pixel * 4;
      const color = targetPixel(family, x, y, size, targetSeed);
      rgba[offset] = color[0];
      rgba[offset + 1] = color[1];
      rgba[offset + 2] = color[2];
      rgba[offset + 3] = color[3];
      if (color[3] > 0) containmentMask[pixel] = 1;
      if (color[3] > DEFAULT_AUTO_CREATE_TWROLE_SETTINGS.alphaThresh) {
        scoringMask[pixel] = 1;
        scoringCount += 1;
      }
    }
  }
  if (scoringCount === 0) {
    scoringMask.set(containmentMask);
    for (const value of scoringMask) scoringCount += value;
  }
  const placementMask = erodeContainmentMask(containmentMask, size, size, 1);
  context.putImageData(new ImageData(rgba, size, size), 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('Could not encode compare target PNG.'));
    }, 'image/png');
  });
  const file = new File([blob], `auto-create-${family}-${size}.png`, {
    type: 'image/png',
    lastModified: 0
  });
  // Use exactly the same decode and straight-RGBA policy as runner.ts. In
  // particular, semi-transparent PNG round-tripping may change RGB bytes.
  const decodedTarget = await loadTargetImage(file, DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);
  return {
    file,
    rgba,
    scoringMask,
    containmentMask,
    placementMask,
    scoringCount,
    checksum: hashBytes(rgba),
    signature: targetSignatureForImage(decodedTarget)
  };
}

async function previewPixels(dataUrl: string, width: number, height: number): Promise<Uint8ClampedArray> {
  if (!dataUrl) throw new Error('AutoCreate did not return a preview image.');
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error(`Could not read preview data URL (${response.status}).`);
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!context) throw new Error('Could not create quality-metric Canvas 2D context.');
    context.clearRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return context.getImageData(0, 0, width, height).data;
  } finally {
    bitmap.close();
  }
}

function computeQuality(target: PreparedTarget, output: Uint8ClampedArray) {
  if (output.length !== target.rgba.length) throw new Error('Target and preview dimensions do not match.');
  let scoringCovered = 0;
  let alphaIntersection = 0;
  let alphaUnion = 0;
  let containmentLeakagePixels = 0;
  let placementLeakagePixels = 0;
  for (let pixel = 0, offset = 3; pixel < target.scoringMask.length; pixel += 1, offset += 4) {
    const targetVisible = target.containmentMask[pixel] !== 0;
    const outputVisible = output[offset] > 0;
    if (target.scoringMask[pixel] && outputVisible) scoringCovered += 1;
    if (targetVisible && outputVisible) alphaIntersection += 1;
    if (targetVisible || outputVisible) alphaUnion += 1;
    if (outputVisible && !targetVisible) containmentLeakagePixels += 1;
    if (outputVisible && !target.placementMask[pixel]) placementLeakagePixels += 1;
  }
  return {
    coverage: target.scoringCount ? scoringCovered / target.scoringCount : 1,
    alphaIou: alphaUnion ? alphaIntersection / alphaUnion : 1,
    containmentLeakagePixels,
    placementLeakagePixels
  };
}

let compareRunId = 0;

function runInstrumentedWorker(
  options: Pick<
    RunAutoCreateTwroleOptions,
    'targetFile' | 'decoOptions' | 'settings' | 'learningScope' | 'resumeSnapshot'
  >,
  control: { stopAtStep?: number } = {}
): Promise<{
  result: AutoCreateTwroleResult;
  timeline: AutoCreateCompareTimelinePoint[];
  diagnostics: AutoCreateTwroleDiagnostics;
  stopped: boolean;
  checkpoint: AutoCreateTwroleCheckpoint | null;
}> {
  compareRunId += 1;
  const id = `compare_${compareRunId}`;
  const worker = new Worker(new URL('../src/workers/autoCreateTwrole.worker.ts', import.meta.url), { type: 'module' });
  const startedAt = performance.now();
  const timeline: AutoCreateCompareTimelinePoint[] = [];

  return new Promise((resolve, reject) => {
    const finish = (callback: () => void) => {
      worker.terminate();
      callback();
    };
    worker.onerror = (event) => finish(() => reject(new Error(event.message || 'Compare worker crashed.')));
    worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;
      if (!message || message.id !== id) return;
      if (message.type === 'progress') {
        const progress = message.progress;
        if (
          progress.stage === 'run' &&
          (progress.step === 1 || progress.step % 250 === 0 || progress.step === progress.total)
        ) {
          timeline.push({
            elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
            step: progress.step,
            total: progress.total,
            mse: progress.mse,
            active: progress.active,
            accepted: progress.accepted,
            rejected: progress.rejected,
            pruned: progress.pruned,
            replaced: progress.replaced
          });
        }
        if (
          control.stopAtStep !== undefined &&
          progress.stage === 'run' &&
          progress.step >= control.stopAtStep
        ) {
          worker.postMessage({
            type: 'abort',
            id
          } satisfies WorkerRequestMessage);
        }
        return;
      }
      if (message.type === 'done') {
        finish(() => {
          if (!message.diagnostics) {
            reject(new Error('Compare worker did not return diagnostics.'));
            return;
          }
          resolve({
            result: message.result,
            timeline,
            diagnostics: message.diagnostics,
            stopped: false,
            checkpoint: null
          });
        });
        return;
      }
      if (message.type === 'stopped') {
        finish(() => {
          if (!message.diagnostics) {
            reject(new Error('Stopped compare worker did not return diagnostics.'));
            return;
          }
          resolve({
            result: message.result,
            timeline,
            diagnostics: message.diagnostics,
            stopped: true,
            checkpoint: message.checkpoint
          });
        });
        return;
      }
      if (message.type === 'error') {
        finish(() => reject(new Error(message.error.message || 'Compare worker failed.')));
      }
    };

    worker.postMessage({
      type: 'start',
      id,
      targetFile: options.targetFile,
      decoOptions: options.decoOptions,
      settings: options.settings,
      learningScope: options.learningScope,
      resumeSnapshot: options.resumeSnapshot ?? null,
      collectDiagnostics: true
    } satisfies WorkerRequestMessage);
  });
}

async function prepareModelState(config: AutoCreateCompareCase): Promise<RankerBenchmarkPreparation> {
  const control = window.__AUTO_CREATE_RANKER_BENCHMARK_CONTROL__;
  if (!control) {
    return {
      supported: false,
      state: config.modelState,
      revision: config.modelRevision,
      note: 'No ranker benchmark control hook was registered; settings hints were passed to the Worker.'
    };
  }
  return control.prepare({
    camp: learningScopeForConfig(config),
    state: config.modelState,
    revision: config.modelRevision,
    featureSchema: config.featureSchema
  });
}

function learningScopeForConfig(config: Pick<AutoCreateCompareCase, 'camp' | 'modelState'>): string {
  return config.modelState === 'ready'
    ? config.camp
    : `benchmark-${config.modelState}-${config.camp}`;
}

const benchmarkLearningStore = typeof indexedDB === 'undefined'
  ? null
  : createIndexedDbLearningStore();

if (!window.__AUTO_CREATE_RANKER_BENCHMARK_CONTROL__ && benchmarkLearningStore) {
  window.__AUTO_CREATE_RANKER_BENCHMARK_CONTROL__ = {
    async prepare({ camp, state, revision }) {
      if (state === 'cold') {
        await benchmarkLearningStore.clearCamp(camp, { preserveEnabled: false });
        await benchmarkLearningStore.setActiveModelRevision(camp, null);
        const status = await benchmarkLearningStore.setRuntimeState(camp, {
          phase: 'collecting',
          runtime: 'none',
          lastError: null
        });
        return {
          supported: true,
          state,
          revision: null,
          note: `Cold store prepared (${status.exampleCount} examples, no active revision).`
        };
      }

      if (state === 'failure') {
        await benchmarkLearningStore.clearCamp(camp, { preserveEnabled: false });
        const corruptRevision = revision ?? `benchmark-corrupt-${camp}`;
        await benchmarkLearningStore.putModelManifest({
          camp,
          revision: corruptRevision,
          featureSchema: AUTO_CREATE_FEATURE_SCHEMA_VERSION,
          rankingPolicy: AUTO_CREATE_RANKING_POLICY_VERSION,
          runtime: 'typed',
          modelStorageUrl: `indexeddb://missing-${encodeURIComponent(corruptRevision)}`,
          inputSize: 64,
          outputSize: 2,
          createdAt: 0,
          trainingExampleCount: 8_000,
          targetSignatureCount: 3,
          trainingDataFingerprint:
            `${TRAINING_DATA_FINGERPRINT_VERSION}:00000000000000000000000000000000`,
          trainingTargetSignatures: [
            'benchmark-corrupt-training-a',
            'benchmark-corrupt-training-b',
            'benchmark-corrupt-training-c'
          ],
          trainedModes: ['add', 'replace']
        });
        await benchmarkLearningStore.setActiveModelRevision(camp, corruptRevision);
        const status = await benchmarkLearningStore.setRuntimeState(camp, {
          phase: 'ready',
          runtime: 'typed',
          lastError: null
        });
        return {
          supported: true,
          state,
          revision: status.activeModelRevision,
          note: 'An active manifest pointing to a missing IndexedDB model was injected.'
        };
      }

      await benchmarkLearningStore.setEnabled(camp, true);
      let active = await benchmarkLearningStore.getActiveModelManifest(camp);
      if (revision && active?.revision !== revision) {
        const manifest = (await benchmarkLearningStore.listModelManifests(camp))
          .find((candidate) => candidate.revision === revision);
        if (manifest) {
          await benchmarkLearningStore.setActiveModelRevision(camp, revision);
          active = manifest;
        }
      }
      if (active) {
        await benchmarkLearningStore.setRuntimeState(camp, {
          phase: 'ready',
          runtime: active.runtime,
          lastError: null
        });
      }
      return {
        supported: true,
        state,
        revision: active?.revision ?? null,
        featureSchema: active?.featureSchema ?? null,
        trainingTargetSignatures: active
          ? ((active as typeof active & {
              trainingTargetSignatures?: readonly string[];
            }).trainingTargetSignatures ?? null)
          : null,
        trainedModes: active?.trainedModes ? [...active.trainedModes] : null,
        portableWeights: Boolean(active?.denseWeights),
        note: active
          ? `Frozen revision ${active.revision} is active.`
          : revision
            ? `Requested frozen revision ${revision} is not present in this benchmark origin.`
            : 'No active model is present; ML strategies should report a cold-start fallback.'
      };
    }
  };
}

function deterministicFeatureMatrix(seed: number, rowCount: number): Float32Array {
  const featureCount = 64;
  const matrix = new Float32Array(rowCount * featureCount);
  let state = seed >>> 0 || 1;
  for (let index = 0; index < matrix.length; index += 1) {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const unit = ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
    matrix[index] = (unit * 4 - 2) + ((index % featureCount) - featureCount / 2) * 1.0e-4;
  }
  return matrix;
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? null;
}

async function inspectModel(input: {
  camp: string;
  revision: string | null;
  featureSchema: string | null;
}): Promise<RankerBenchmarkPreparation> {
  const control = window.__AUTO_CREATE_RANKER_BENCHMARK_CONTROL__;
  if (!control) {
    return {
      supported: false,
      state: 'ready',
      revision: null,
      note: 'No ranker benchmark control hook is available.'
    };
  }
  return control.prepare({
    camp: input.camp,
    state: 'ready',
    revision: input.revision,
    featureSchema: input.featureSchema
  });
}

async function runRuntimeParity(input: {
  camp: string;
  revision: string;
  seed: number;
  rowCount?: number;
  measuredRuns?: number;
}): Promise<RuntimeParityResult> {
  const rowCount = Math.max(1, Math.round(input.rowCount ?? 384));
  const measuredRuns = Math.max(1, Math.round(input.measuredRuns ?? 7));
  const unavailable = (note: string): RuntimeParityResult => ({
    camp: input.camp,
    supported: Boolean(benchmarkLearningStore),
    ready: false,
    revision: input.revision,
    featureSchema: null,
    rowCount,
    measuredRuns,
    featureMatrixChecksum: null,
    maxAbsError: null,
    stableRankingMatch: false,
    tfjsPredictMs: null,
    typedPredictMs: null,
    note
  });
  if (!benchmarkLearningStore) return unavailable('IndexedDB learning store is unavailable.');
  const manifest = (await benchmarkLearningStore.listModelManifests(input.camp))
    .find((candidate) => candidate.revision === input.revision);
  if (!manifest) return unavailable(`Frozen revision ${input.revision} is missing.`);
  if (!manifest.denseWeights) {
    return unavailable(`Frozen revision ${input.revision} has no portable Dense weights.`);
  }

  const features = deterministicFeatureMatrix(input.seed, rowCount);
  const proposalIndices = Int32Array.from(
    { length: rowCount },
    (_, index) => mixUint32(input.seed ^ Math.imul(index + 1, 0x9e3779b9))
  );
  const typed = createTypedDenseRankerPredictor(manifest.denseWeights);
  const tfjs = await createTfjsDenseRankerAdapter(manifest.denseWeights);
  try {
    // Compile/warm the TFJS backend before timing either adapter.
    tfjs.predictSync(features, rowCount);
    typed.predict(features, rowCount);
    const tfjsTimes: number[] = [];
    const typedTimes: number[] = [];
    let tfjsPrediction = new Float32Array();
    let typedPrediction = new Float32Array();
    for (let run = 0; run < measuredRuns; run += 1) {
      if (run % 2 === 0) {
        let startedAt = performance.now();
        tfjsPrediction = tfjs.predictSync(features, rowCount);
        tfjsTimes.push(performance.now() - startedAt);
        startedAt = performance.now();
        typedPrediction = typed.predict(features, rowCount);
        typedTimes.push(performance.now() - startedAt);
      } else {
        let startedAt = performance.now();
        typedPrediction = typed.predict(features, rowCount);
        typedTimes.push(performance.now() - startedAt);
        startedAt = performance.now();
        tfjsPrediction = tfjs.predictSync(features, rowCount);
        tfjsTimes.push(performance.now() - startedAt);
      }
    }
    let maxAbsError = 0;
    if (tfjsPrediction.length !== typedPrediction.length) {
      maxAbsError = Number.POSITIVE_INFINITY;
    } else {
      for (let index = 0; index < tfjsPrediction.length; index += 1) {
        maxAbsError = Math.max(
          maxAbsError,
          Math.abs(tfjsPrediction[index] - typedPrediction[index])
        );
      }
    }
    const tfjsRanking = stableRankPredictions(tfjsPrediction, proposalIndices);
    const typedRanking = stableRankPredictions(typedPrediction, proposalIndices);
    return {
      camp: input.camp,
      supported: true,
      ready: true,
      revision: manifest.revision,
      featureSchema: manifest.featureSchema,
      rowCount,
      measuredRuns,
      featureMatrixChecksum: hashBytes(
        new Uint8ClampedArray(features.buffer as ArrayBuffer)
      ),
      maxAbsError,
      stableRankingMatch:
        tfjsRanking.length === typedRanking.length &&
        tfjsRanking.every((value, index) => value === typedRanking[index]),
      tfjsPredictMs: median(tfjsTimes),
      typedPredictMs: median(typedTimes)
    };
  } finally {
    tfjs.dispose();
    typed.dispose?.();
  }
}

function settingsForConfig(config: AutoCreateCompareCase): Partial<AutoCreateTwroleSettings> {
  return {
    tiles: config.tiles,
    tileBudget: config.tileBudget,
    seed: config.seed,
    resetExperience: true,
    exportEvery: config.exportEvery,
    ...(config.variantCacheItems > 0 ? { variantCacheItems: config.variantCacheItems } : {}),
    logEvery: 250,
    replaceEvery: config.replaceEvery,
    experienceJson: `compare-${config.camp}-${config.family}-${config.size}.json`,
    searchStrategy: config.searchStrategy,
    rankerRolloutApproved: true,
    rankerBenchmarkState: config.modelState,
    rankerModelRevision: config.modelRevision,
    rankerFeatureSchema: config.featureSchema
  } as Partial<AutoCreateTwroleSettings> & Record<string, unknown>;
}

function rankerFromResult(result: AutoCreateTwroleResult): Record<string, unknown> | null {
  const extended = result as AutoCreateTwroleResult & {
    ranker?: Record<string, unknown>;
    rankerSummary?: Record<string, unknown>;
  };
  return extended.ranker ?? extended.rankerSummary ?? null;
}

async function runResumeCheck(
  config: AutoCreateCompareCase,
  expected?: { outputChecksum: string; modelRevision: string | null }
): Promise<ResumeDeterminismResult> {
  await prepareModelState(config);
  const target = await createTarget(config);
  const decoOptions = filterPartOptionsByCamp('deco', config.camp);
  const settings = {
    ...settingsForConfig(config),
    // logEvery is observer-only and intentionally excluded from the snapshot
    // algorithm signature. Emitting each progress point lets the abort land
    // near the start while preserving the measured run's exact output identity.
    logEvery: 1
  };
  const options: Pick<
    RunAutoCreateTwroleOptions,
    'targetFile' | 'decoOptions' | 'settings' | 'learningScope' | 'resumeSnapshot'
  > = {
    targetFile: target.file,
    decoOptions,
    settings,
    learningScope: learningScopeForConfig(config),
    resumeSnapshot: null
  };
  const uninterrupted = expected ? null : await runInstrumentedWorker(options);
  const stopped = await runInstrumentedWorker(options, { stopAtStep: 1 });
  if (!stopped.stopped || !stopped.checkpoint) {
    return {
      supported: true,
      pass: false,
      strategy: config.searchStrategy,
      revision: null,
      stoppedStep: null,
      uninterruptedChecksum: uninterrupted
        ? hashText(stableJson(normalizedOutput(uninterrupted.result)))
        : expected?.outputChecksum ?? null,
      resumedChecksum: null,
      expectedChecksum: expected?.outputChecksum ?? null,
      note: 'The checkpoint run completed without producing a stopped snapshot.'
    };
  }
  const resumed = await runInstrumentedWorker({
    ...options,
    resumeSnapshot: stopped.checkpoint.snapshot
  });
  const uninterruptedChecksum = uninterrupted
    ? hashText(stableJson(normalizedOutput(uninterrupted.result)))
    : expected?.outputChecksum ?? null;
  const resumedChecksum = hashText(stableJson(normalizedOutput(resumed.result)));
  const uninterruptedRanker = uninterrupted ? rankerFromResult(uninterrupted.result) : null;
  const resumedRanker = rankerFromResult(resumed.result);
  const uninterruptedRevision = uninterrupted
    ? uninterruptedRanker?.modelRevision
    : expected?.modelRevision;
  const resumedRevision = resumedRanker?.modelRevision;
  const frozenRevisionMatches =
    (uninterruptedRevision ?? null) === (resumedRevision ?? null) &&
    (config.modelRevision === null || resumedRevision === config.modelRevision);
  return {
    supported: true,
    pass: uninterruptedChecksum === resumedChecksum && frozenRevisionMatches,
    strategy: config.searchStrategy,
    revision: typeof resumedRevision === 'string' ? resumedRevision : null,
    stoppedStep: stopped.checkpoint.snapshot.step,
    uninterruptedChecksum,
    resumedChecksum,
    expectedChecksum: expected?.outputChecksum ?? null,
    ...(!frozenRevisionMatches
      ? { note: 'The uninterrupted and resumed runs did not use the same frozen model revision.' }
      : {})
  };
}

window.__AUTO_CREATE_COMPARE_BENCHMARK__ = {
  metadata() {
    return {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      crossOriginIsolated: globalThis.crossOriginIsolated,
      capabilities: {
        worker: typeof Worker !== 'undefined',
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        createImageBitmap: typeof createImageBitmap !== 'undefined',
        indexedDb: typeof indexedDB !== 'undefined',
        rankerBenchmarkControl: Boolean(window.__AUTO_CREATE_RANKER_BENCHMARK_CONTROL__)
      },
      defaults: { ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS }
    };
  },

  async targetSignature(config) {
    return (await createTarget(config)).signature;
  },

  inspectModel,

  runtimeParity: runRuntimeParity,

  resumeCheck: runResumeCheck,

  async run(config) {
    const modelStatePreparation = await prepareModelState(config);
    const target = await createTarget(config);
    const decoOptions = filterPartOptionsByCamp('deco', config.camp);
    const settingsWithBenchmarkHints = settingsForConfig(config);
    const options: Pick<
      RunAutoCreateTwroleOptions,
      'targetFile' | 'decoOptions' | 'settings' | 'learningScope'
    > = {
      targetFile: target.file,
      decoOptions,
      settings: settingsWithBenchmarkHints as Partial<AutoCreateTwroleSettings>,
      learningScope: learningScopeForConfig(config)
    };

    const startedAt = performance.now();
    const completed = await runInstrumentedWorker(options);
    const durationMs = performance.now() - startedAt;
    const { result, diagnostics, timeline } = completed;

    const previewStartedAt = performance.now();
    await renderAutoCreateWorkspacePreview({
      role: createDefaultRole(config.camp),
      result
    });
    const previewRenderMs = performance.now() - previewStartedAt;

    const metricStartedAt = performance.now();
    const output = await previewPixels(result.previewDataUrl, result.targetWidth, result.targetHeight);
    const quality = computeQuality(target, output);
    const qualityMetricMs = performance.now() - metricStartedAt;
    const ranker = rankerFromResult(result);

    return {
      fixtureId: config.id,
      family: config.family,
      searchStrategy: config.searchStrategy,
      modelState: config.modelState,
      modelStatePreparation,
      durationMs,
      previewRenderMs,
      uiReadyDurationMs: durationMs + previewRenderMs,
      qualityMetricMs,
      mse: result.mse,
      ...quality,
      outputChecksum: hashText(stableJson(normalizedOutput(result))),
      targetChecksum: target.checksum,
      targetSignature: target.signature,
      count: result.decorations.length,
      sourceCount: result.sourceCount,
      filteredSourceCount: decoOptions.length,
      accepted: result.accepted,
      rejected: result.rejected,
      pruned: result.pruned,
      replaced: result.replaced,
      warningCount: result.warnings.length,
      targetWidth: result.targetWidth,
      targetHeight: result.targetHeight,
      timeline,
      diagnostics,
      ...(ranker === undefined ? {} : { ranker })
    };
  }
};

document.documentElement.dataset.compareBenchmarkReady = 'true';
