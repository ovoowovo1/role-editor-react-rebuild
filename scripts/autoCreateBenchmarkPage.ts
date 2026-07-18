import { DEFAULT_AUTO_CREATE_TWROLE_SETTINGS } from '../src/lib/conversion/autoCreateTwrole';
import type { AutoCreateTwroleResult, RunAutoCreateTwroleOptions } from '../src/lib/conversion/autoCreateTwrole';
import type { AutoCreateTwroleDiagnostics } from '../src/lib/conversion/auto-create-twrole/diagnostics';
import type { WorkerRequestMessage, WorkerResponseMessage } from '../src/lib/conversion/auto-create-twrole/workerProtocol';
import { renderAutoCreateWorkspacePreview } from '../src/components/auto-create/autoCreateWorkspacePreview';
import { createDefaultRole, filterPartOptionsByCamp } from '../src/mock/options';

interface AutoCreateBenchmarkCase {
  size: number;
  tiles: number;
  seed: number;
  targetSeed: number;
  camp: string;
  exportEvery: number;
  collectDiagnostics: boolean;
  variantCacheItems: number;
}

interface AutoCreateBenchmarkSample {
  durationMs: number;
  mse: number;
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
  previewRenderCount: number;
  previewRenderMs: number;
  uiReadyDurationMs: number;
  timeline: AutoCreateBenchmarkTimelinePoint[];
  diagnostics?: AutoCreateTwroleDiagnostics;
}

interface AutoCreateBenchmarkTimelinePoint {
  elapsedMs: number;
  step: number;
  total: number;
  mse: number;
  active: number;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  containmentFastAccepted?: number;
  containmentFallbacks?: number;
  containmentRejected?: number;
  containmentPixelsChecked?: number;
  candidateUpperBoundRejected?: number;
  candidateAfterSseEarlyRejected?: number;
  replaceAfterSseEarlyRejected?: number;
}

interface AutoCreateBenchmarkMetadata {
  userAgent: string;
  hardwareConcurrency: number;
  crossOriginIsolated: boolean;
  capabilities: {
    worker: boolean;
    offscreenCanvas: boolean;
    createImageBitmap: boolean;
  };
  defaults: {
    candidateBatch: number;
    replaceCandidateBatch: number;
    finalPruneRounds: number;
  };
}

interface AutoCreateBenchmarkApi {
  metadata(): AutoCreateBenchmarkMetadata;
  run(config: AutoCreateBenchmarkCase): Promise<AutoCreateBenchmarkSample>;
}

declare global {
  interface Window {
    __AUTO_CREATE_BENCHMARK__?: AutoCreateBenchmarkApi;
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

let benchmarkRunId = 0;

function runInstrumentedWorker(
  options: Pick<RunAutoCreateTwroleOptions, 'targetFile' | 'decoOptions' | 'settings'>,
  collectDiagnostics: boolean
): Promise<{
  result: AutoCreateTwroleResult;
  timeline: AutoCreateBenchmarkTimelinePoint[];
  diagnostics?: AutoCreateTwroleDiagnostics;
}> {
  benchmarkRunId += 1;
  const id = `benchmark_${benchmarkRunId}`;
  const worker = new Worker(new URL('../src/workers/autoCreateTwrole.worker.ts', import.meta.url), { type: 'module' });
  const startedAt = performance.now();
  const timeline: AutoCreateBenchmarkTimelinePoint[] = [];

  return new Promise((resolve, reject) => {
    const finish = (callback: () => void) => {
      worker.terminate();
      callback();
    };
    worker.onerror = (event) => finish(() => reject(new Error(event.message || 'Benchmark worker crashed.')));
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
            replaced: progress.replaced,
            ...(message.diagnostics ? {
              containmentFastAccepted: message.diagnostics.counters.containmentFastAccepted,
              containmentFallbacks: message.diagnostics.counters.containmentFallbacks,
              containmentRejected: message.diagnostics.counters.containmentRejected,
              containmentPixelsChecked: message.diagnostics.counters.containmentPixelsChecked,
              candidateUpperBoundRejected: message.diagnostics.counters.candidateUpperBoundRejected,
              candidateAfterSseEarlyRejected: message.diagnostics.counters.candidateAfterSseEarlyRejected,
              replaceAfterSseEarlyRejected: message.diagnostics.counters.replaceAfterSseEarlyRejected
            } : {})
          });
        }
        return;
      }
      if (message.type === 'done') {
        finish(() => {
          if (collectDiagnostics && !message.diagnostics) {
            reject(new Error('Benchmark worker did not return diagnostics.'));
            return;
          }
          resolve({
            result: message.result,
            timeline,
            ...(message.diagnostics ? { diagnostics: message.diagnostics } : {})
          });
        });
        return;
      }
      if (message.type === 'stopped') {
        finish(() => reject(new Error('Benchmark worker stopped unexpectedly.')));
        return;
      }
      if (message.type === 'error') {
        finish(() => reject(new Error(message.error.message || 'Benchmark worker failed.')));
      }
    };

    worker.postMessage({
      type: 'start',
      id,
      targetFile: options.targetFile,
      decoOptions: options.decoOptions,
      settings: options.settings,
      collectDiagnostics
    } satisfies WorkerRequestMessage);
  });
}

/**
 * Build the target from integer RGBA pixels instead of antialiased Canvas
 * primitives. That keeps every fixture deterministic across repeated runs and
 * still exercises opaque, partially transparent, gradient and textured areas.
 */
async function createSyntheticTarget(size: number, seed: number): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('The benchmark needs a Canvas 2D context.');

  const pixels = new Uint8ClampedArray(size * size * 4);
  const center = (size - 1) / 2;
  const innerRadius = size * 0.415;
  const outerRadius = size * 0.475;
  const edgeWidth = Math.max(1, outerRadius - innerRadius);
  const checkerSide = Math.max(2, Math.floor(size / 16));
  const denominator = Math.max(1, size - 1);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = y * size + x;
      const offset = pixel * 4;
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance >= outerRadius) continue;

      const alpha = distance <= innerRadius
        ? 255
        : clampByte(255 * (outerRadius - distance) / edgeWidth);
      const noise = mixUint32((pixel ^ seed) >>> 0);
      const fine = (noise & 31) - 15;
      const checker = ((Math.floor(x / checkerSide) + Math.floor(y / checkerSide)) & 1) === 0 ? 18 : -18;
      const nx = x / denominator;
      const ny = y / denominator;
      const radial = Math.max(0, 1 - distance / outerRadius);

      pixels[offset] = clampByte(36 + nx * 142 + radial * 61 + checker + fine * 0.45);
      pixels[offset + 1] = clampByte(28 + ny * 156 + radial * 48 - checker * 0.45 + fine * 0.3);
      pixels[offset + 2] = clampByte(52 + (1 - nx) * 91 + (1 - ny) * 42 + checker * 0.75 - fine * 0.35);
      pixels[offset + 3] = alpha;
    }
  }

  context.putImageData(new ImageData(pixels, size, size), 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('Could not encode the synthetic target as PNG.'));
    }, 'image/png');
  });

  return new File([blob], `auto-create-benchmark-${size}.png`, {
    type: 'image/png',
    lastModified: 0
  });
}

window.__AUTO_CREATE_BENCHMARK__ = {
  metadata() {
    return {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      crossOriginIsolated: globalThis.crossOriginIsolated,
      capabilities: {
        worker: typeof Worker !== 'undefined',
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        createImageBitmap: typeof createImageBitmap !== 'undefined'
      },
      defaults: {
        candidateBatch: DEFAULT_AUTO_CREATE_TWROLE_SETTINGS.candidateBatch,
        replaceCandidateBatch: DEFAULT_AUTO_CREATE_TWROLE_SETTINGS.replaceCandidateBatch,
        finalPruneRounds: DEFAULT_AUTO_CREATE_TWROLE_SETTINGS.finalPruneRounds
      }
    };
  },

  async run(config) {
    const targetFile = await createSyntheticTarget(config.size, config.targetSeed);
    const decoOptions = filterPartOptionsByCamp('deco', config.camp);
    const startedAt = performance.now();
    const options = {
      targetFile,
      decoOptions,
      settings: {
        tiles: config.tiles,
        seed: config.seed,
        resetExperience: true,
        exportEvery: config.exportEvery,
        ...(config.variantCacheItems > 0 ? { variantCacheItems: config.variantCacheItems } : {}),
        logEvery: 250,
        experienceJson: `benchmark-${config.camp}-${config.size}.json`
      }
    } satisfies Pick<RunAutoCreateTwroleOptions, 'targetFile' | 'decoOptions' | 'settings'>;
    const completed = await runInstrumentedWorker(options, config.collectDiagnostics);
    const { result, diagnostics, timeline } = completed;
    const durationMs = performance.now() - startedAt;
    const previewStartedAt = performance.now();
    await renderAutoCreateWorkspacePreview({
      role: createDefaultRole(config.camp),
      result
    });
    const previewRenderMs = performance.now() - previewStartedAt;

    return {
      durationMs,
      previewRenderCount: 1,
      previewRenderMs,
      uiReadyDurationMs: durationMs + previewRenderMs,
      mse: result.mse,
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
      ...(diagnostics ? { diagnostics } : {})
    };
  }
};

document.documentElement.dataset.benchmarkReady = 'true';
