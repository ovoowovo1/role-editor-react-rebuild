import type { DecorationLayer } from '../../../types/role';
import {
  AUTO_CREATE_SNAPSHOT_VERSION,
  DEFAULT_ROLE_EXPORT_MAX_SIDE,
  autoCreateSnapshotSettingsSignature,
  type AutoCreateTwroleLegacyDecoEntry,
  type AutoCreateTwroleSettings,
  type AutoCreateTwroleSnapshot
} from './contracts';
import type { AutoCreateCanvas, SourceTile, TargetImageData } from './internalTypes';
import { buildDecoDraft, decorationFromDraft } from './candidateSearch';
import type { AutoCreateDiagnosticsCollector } from './diagnostics';
import { canvasToDataUrl, createCanvas, get2d } from './platform';
import { sourceSignatureForTiles } from './sourcePipeline';
import wasmUrl from './wasm/auto_create_wasm.wasm?url';

export interface AutoCreateWasmExports {
  memory: WebAssembly.Memory;
  wasm_alloc(bytes: number): number;
  wasm_dealloc(ptr: number, bytes: number): void;
  engine_create(
    width: number,
    height: number,
    seed: number,
    targetStraightPtr: number,
    maskPtr: number,
    placementMaskPtr: number,
    settingsPtr: number
  ): number;
  engine_destroy(ptr: number): void;
  engine_add_source(
    ptr: number,
    thumbW: number,
    thumbH: number,
    origW: number,
    origH: number,
    sFactor: number,
    meanR: number,
    meanG: number,
    meanB: number,
    stdR: number,
    stdG: number,
    stdB: number,
    alphaRatio: number,
    straightRgbaPtr: number
  ): void;
  engine_finalize_init(ptr: number): void;
  engine_step(ptr: number, step: number, totalSteps: number): number;
  engine_final_prune_step(ptr: number): number;
  engine_recompute_errors(ptr: number): void;
  engine_current_mse(ptr: number): number;
  engine_stats(ptr: number, outPtr: number): void;
  engine_diag_counters(ptr: number, outPtr: number): void;
  engine_write_preview_rgba(ptr: number, outPtr: number): void;
  engine_export_tile_count(ptr: number): number;
  engine_export_tiles(ptr: number, outSourceIdsPtr: number, outF64ParamsPtr: number): void;
}

let cachedWasmPromise: Promise<AutoCreateWasmExports | null> | null = null;

export function loadAutoCreateWasmExports(): Promise<AutoCreateWasmExports | null> {
  if (cachedWasmPromise) return cachedWasmPromise;
  cachedWasmPromise = (async () => {
    if (typeof WebAssembly !== 'object' || typeof fetch !== 'function') return null;
    try {
      const response = await fetch(wasmUrl);
      if (!response.ok) return null;
      let instance: WebAssembly.Instance;
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        try {
          ({ instance } = await WebAssembly.instantiateStreaming(response.clone(), {}));
        } catch {
          const bytes = await response.arrayBuffer();
          ({ instance } = await WebAssembly.instantiate(bytes, {}));
        }
      } else {
        const bytes = await response.arrayBuffer();
        ({ instance } = await WebAssembly.instantiate(bytes, {}));
      }
      return instance.exports as unknown as AutoCreateWasmExports;
    } catch {
      return null;
    }
  })();
  return cachedWasmPromise;
}

export class WasmCollageEngine {
  private ptr: number;
  private statsPtr: number;
  private diagPtr: number;
  private previewPtr: number;
  private previewBytes: number;
  private previewCanvas: AutoCreateCanvas | null = null;
  private previewImageData: ImageData | null = null;
  private previewRevision = -1;
  private previewUrl = '';
  private canvasRevision = 0;

  private _active = 0;
  private _accepted = 0;
  private _rejected = 0;
  private _pruned = 0;
  private _replaced = 0;

  constructor(
    private readonly wasm: AutoCreateWasmExports,
    private readonly sources: readonly SourceTile[],
    targetStraight: Uint8ClampedArray,
    mask: Uint8Array,
    placementMask: Uint8Array,
    private readonly width: number,
    private readonly height: number,
    seed: number,
    private readonly settings: AutoCreateTwroleSettings,
    private readonly diagnostics: AutoCreateDiagnosticsCollector | null = null
  ) {
    const nPixels = width * height;
    const targetPtr = wasm.wasm_alloc(nPixels * 4);
    const maskPtr = wasm.wasm_alloc(nPixels);
    const placementPtr = wasm.wasm_alloc(nPixels);
    const settingsPtr = wasm.wasm_alloc(27 * 8);

    try {
      new Uint8Array(wasm.memory.buffer, targetPtr, nPixels * 4).set(targetStraight);
      new Uint8Array(wasm.memory.buffer, maskPtr, nPixels).set(mask);
      new Uint8Array(wasm.memory.buffer, placementPtr, nPixels).set(placementMask);
      const sArr = new Float64Array(wasm.memory.buffer, settingsPtr, 27);
      sArr[0] = settings.tileBudget;
      sArr[1] = settings.candidateBatch;
      sArr[2] = settings.replaceCandidateBatch;
      sArr[3] = settings.colorTopk;
      sArr[4] = settings.colorSigma;
      sArr[5] = settings.exploration;
      sArr[6] = settings.tilePenaltyMse;
      sArr[7] = settings.gradientLocalRadius;
      sArr[8] = settings.gradientPixelMix;
      sArr[9] = settings.gradientStdSigma;
      sArr[10] = settings.gradientStdWeight;
      sArr[11] = settings.gradientComplexityThreshold;
      sArr[12] = settings.gradientOriginalMaxPx;
      sArr[13] = settings.minRenderedPx;
      sArr[14] = settings.maxRenderedPx;
      sArr[15] = settings.rotationProb;
      sArr[16] = settings.flipProb;
      sArr[17] = settings.removeEvery;
      sArr[18] = settings.replaceEvery;
      sArr[19] = settings.pruneRounds;
      sArr[20] = settings.pruneSampleSize;
      sArr[21] = settings.prunePenaltyFactor;
      sArr[22] = settings.replaceMinGainMse;
      sArr[23] = settings.fullErrorRecomputeEvery;
      sArr[24] = settings.variantCacheItems;
      sArr[25] = settings.errorCellSize;
      sArr[26] = DEFAULT_ROLE_EXPORT_MAX_SIDE;

      this.ptr = wasm.engine_create(width, height, seed >>> 0, targetPtr, maskPtr, placementPtr, settingsPtr);
    } finally {
      wasm.wasm_dealloc(targetPtr, nPixels * 4);
      wasm.wasm_dealloc(maskPtr, nPixels);
      wasm.wasm_dealloc(placementPtr, nPixels);
      wasm.wasm_dealloc(settingsPtr, 27 * 8);
    }

    for (const source of sources) {
      const straight = source.thumbStraight ?? get2d(source.canvas).getImageData(0, 0, source.thumbW, source.thumbH).data;
      const srcPtr = wasm.wasm_alloc(straight.length);
      try {
        new Uint8Array(wasm.memory.buffer, srcPtr, straight.length).set(straight);
        wasm.engine_add_source(
          this.ptr,
          source.thumbW,
          source.thumbH,
          source.origW,
          source.origH,
          source.sFactor,
          source.meanRgb[0],
          source.meanRgb[1],
          source.meanRgb[2],
          source.stdRgb[0],
          source.stdRgb[1],
          source.stdRgb[2],
          source.alphaRatio,
          srcPtr
        );
      } finally {
        wasm.wasm_dealloc(srcPtr, straight.length);
      }
    }

    wasm.engine_finalize_init(this.ptr);
    this.statsPtr = wasm.wasm_alloc(5 * 4);
    this.diagPtr = wasm.wasm_alloc(12 * 8);
    this.previewBytes = nPixels * 4;
    this.previewPtr = wasm.wasm_alloc(this.previewBytes);
  }

  private refreshStats(): void {
    this.wasm.engine_stats(this.ptr, this.statsPtr);
    const s = new Uint32Array(this.wasm.memory.buffer, this.statsPtr, 5);
    this._active = s[0];
    this._accepted = s[1];
    this._rejected = s[2];
    this._pruned = s[3];
    this._replaced = s[4];
  }

  runStep(step: number, totalSteps: number): boolean {
    const didWork = this.wasm.engine_step(this.ptr, step, totalSteps) !== 0;
    if (didWork) this.canvasRevision += 1;
    this.refreshStats();
    return didWork;
  }

  tryPruneOnce(): boolean {
    const didWork = this.wasm.engine_final_prune_step(this.ptr) !== 0;
    if (didWork) this.canvasRevision += 1;
    this.refreshStats();
    return didWork;
  }

  recomputeErrors(): void {
    this.wasm.engine_recompute_errors(this.ptr);
  }

  currentMse(): number {
    return this.wasm.engine_current_mse(this.ptr);
  }

  activeCount(): number {
    return this._active;
  }

  get accepted(): number {
    return this._accepted;
  }

  get rejected(): number {
    return this._rejected;
  }

  get pruned(): number {
    return this._pruned;
  }

  get replaced(): number {
    return this._replaced;
  }

  syncDiagnostics(): void {
    if (!this.diagnostics) return;
    this.wasm.engine_diag_counters(this.ptr, this.diagPtr);
    const d = new Float64Array(this.wasm.memory.buffer, this.diagPtr, 12);
    this.diagnostics.add('candidatesProposed', d[0]);
    this.diagnostics.add('candidatesEvaluated', d[1]);
    this.diagnostics.add('candidatePixelsEvaluated', d[2]);
    this.diagnostics.add('containmentFastAccepted', d[3]);
    this.diagnostics.add('containmentFallbacks', d[4]);
    this.diagnostics.add('containmentRejected', d[5]);
    this.diagnostics.add('candidateUpperBoundRejected', d[6]);
    this.diagnostics.add('candidateAfterSseEarlyRejected', d[7]);
    this.diagnostics.add('variantCacheHits', d[8]);
    this.diagnostics.add('variantCacheMisses', d[9]);
    this.diagnostics.add('variantCacheEvictions', d[10]);
    this.diagnostics.add('variantRastersAllocated', d[11]);
    this.diagnostics.add('tilesAccepted', this._accepted);
    this.diagnostics.add('tilesPruned', this._pruned);
    this.diagnostics.add('tilesReplaced', this._replaced);
  }

  async previewDataUrl(): Promise<string> {
    if (this.previewRevision === this.canvasRevision && this.previewUrl) return this.previewUrl;
    this.wasm.engine_write_preview_rgba(this.ptr, this.previewPtr);
    this.previewCanvas ??= createCanvas(this.width, this.height);
    const rgbaView = new Uint8ClampedArray(this.wasm.memory.buffer, this.previewPtr, this.previewBytes);
    if (!this.previewImageData || this.previewImageData.width !== this.width || this.previewImageData.height !== this.height) {
      this.previewImageData = new ImageData(this.width, this.height);
    }
    this.previewImageData.data.set(rgbaView);
    get2d(this.previewCanvas, false).putImageData(this.previewImageData, 0, 0);
    this.previewUrl = await canvasToDataUrl(this.previewCanvas);
    this.previewRevision = this.canvasRevision;
    return this.previewUrl;
  }

  exportResultTiles(): { decorations: DecorationLayer[]; legacy: AutoCreateTwroleLegacyDecoEntry[] } {
    const count = this.wasm.engine_export_tile_count(this.ptr);
    if (count === 0) return { decorations: [], legacy: [] };
    const idsPtr = this.wasm.wasm_alloc(count * 4);
    const paramsPtr = this.wasm.wasm_alloc(count * 6 * 8);
    try {
      this.wasm.engine_export_tiles(this.ptr, idsPtr, paramsPtr);
      const ids = new Uint32Array(this.wasm.memory.buffer, idsPtr, count);
      const params = new Float64Array(this.wasm.memory.buffer, paramsPtr, count * 6);
      const decorations: DecorationLayer[] = [];
      const legacy: AutoCreateTwroleLegacyDecoEntry[] = [];
      for (let i = 0; i < count; i += 1) {
        const source = this.sources[ids[i]];
        const p = i * 6;
        const draft = buildDecoDraft(
          source,
          params[p],
          params[p + 1],
          params[p + 2],
          params[p + 3],
          params[p + 4],
          this.width,
          this.height
        );
        decorations.push(decorationFromDraft(draft));
        legacy.push(draft.legacy);
      }
      return { decorations: decorations.reverse(), legacy };
    } finally {
      this.wasm.wasm_dealloc(idsPtr, count * 4);
      this.wasm.wasm_dealloc(paramsPtr, count * 6 * 8);
    }
  }

  createSnapshot(
    step: number,
    totalSteps: number,
    finalPruneStep: number,
    seed: number,
    target: Pick<TargetImageData, 'width' | 'height' | 'sourceWidth' | 'sourceHeight'>,
    targetSignature: string,
    warnings: string[],
    signatures?: Pick<AutoCreateTwroleSnapshot, 'sourceSignature' | 'settingsSignature'>
  ): AutoCreateTwroleSnapshot {
    return {
      version: AUTO_CREATE_SNAPSHOT_VERSION,
      targetWidth: target.width,
      targetHeight: target.height,
      sourceWidth: target.sourceWidth,
      sourceHeight: target.sourceHeight,
      sourceCount: this.sources.length,
      sourceSignature: signatures?.sourceSignature ?? sourceSignatureForTiles(this.sources),
      targetSignature,
      settingsSignature: signatures?.settingsSignature ?? autoCreateSnapshotSettingsSignature(this.settings),
      experienceState: '{"version":1,"source_stats":{},"color_stats":{}}',
      step: Math.max(0, Math.round(step)),
      totalSteps: Math.max(1, Math.round(totalSteps)),
      finalPruneStep: Math.max(0, Math.round(finalPruneStep)),
      seed,
      rngState: 1,
      rngSpareNormal: null,
      accepted: this._accepted,
      rejected: this._rejected,
      pruned: this._pruned,
      replaced: this._replaced,
      mse: this.currentMse(),
      tiles: [],
      warnings: [...warnings]
    };
  }

  destroy(): void {
    if (!this.ptr) return;
    this.wasm.wasm_dealloc(this.statsPtr, 5 * 4);
    this.wasm.wasm_dealloc(this.diagPtr, 12 * 8);
    this.wasm.wasm_dealloc(this.previewPtr, this.previewBytes);
    this.wasm.engine_destroy(this.ptr);
    this.ptr = 0;
  }
}
