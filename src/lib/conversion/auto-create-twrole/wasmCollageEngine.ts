import type { DecorationLayer } from '../../../types/role';
import {
  AUTO_CREATE_SNAPSHOT_VERSION,
  DEFAULT_ROLE_EXPORT_MAX_SIDE,
  MEMORY_VERSION,
  autoCreateSnapshotSettingsSignature,
  type AutoCreateTwroleLegacyDecoEntry,
  type AutoCreateTwroleSettings,
  type AutoCreateTwroleSnapshot
} from './contracts';
import type { AutoCreateCanvas, BBox, MemoryStat, SourceTile, TargetImageData } from './internalTypes';
import { buildDecoDraft, canonicalCandidateTransform, decorationFromDraft } from './candidateSearch';
import type { AutoCreateDiagnosticsCollector } from './diagnostics';
import { ExperienceMemory } from './experienceMemory';
import { canvasToDataUrl, createCanvas, get2d } from './platform';
import { sourceSignatureForTiles } from './sourcePipeline';
import { variantGeometry } from './variantCache';
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
  engine_rng_state(ptr: number): number;
  engine_rng_has_spare(ptr: number): number;
  engine_rng_spare(ptr: number): number;
  engine_set_rng(ptr: number, state: number, hasSpare: number, spare: number): void;
  engine_export_source_stats(ptr: number, outCountsPtr: number, outFloatsPtr: number): void;
  engine_color_stat_count(ptr: number): number;
  engine_export_color_stats(ptr: number, outKeysPtr: number, outCountsPtr: number, outFloatsPtr: number): void;
  engine_restore_memory(
    ptr: number,
    nSources: number,
    srcCountsPtr: number,
    srcFloatsPtr: number,
    nColor: number,
    colorKeysPtr: number,
    colorCountsPtr: number,
    colorFloatsPtr: number
  ): void;
  engine_restore_tiles(
    ptr: number,
    count: number,
    sourceIdsPtr: number,
    paramsPtr: number,
    accepted: number,
    rejected: number,
    pruned: number,
    replaced: number
  ): number;
}

let cachedWasmPromise: Promise<AutoCreateWasmExports | null> | null = null;

export function loadAutoCreateWasmExports(): Promise<AutoCreateWasmExports | null> {
  if (cachedWasmPromise) return cachedWasmPromise;
  cachedWasmPromise = (async () => {
    if (typeof WebAssembly !== 'object' || typeof fetch !== 'function') return null;
    try {
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        console.warn(`[AutoCreateTwrole] Failed to fetch Wasm (${response.status} ${response.statusText}) at ${wasmUrl}; falling back to TypeScript engine.`);
        return null;
      }
      const contentType = response.headers?.get('content-type')?.toLowerCase() ?? '';
      if (contentType.includes('text/html')) {
        console.warn(`[AutoCreateTwrole] Received HTML instead of Wasm at ${wasmUrl} (SPA fallback); falling back to TypeScript engine.`);
        return null;
      }
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
    } catch (error) {
      console.warn('[AutoCreateTwrole] Failed to load Wasm module; falling back to TypeScript engine.', error);
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

  private exportExperienceState(): string {
    const nSources = this.sources.length;
    const sourceStats: Record<string, MemoryStat> = {};
    if (nSources > 0) {
      const countsPtr = this.wasm.wasm_alloc(nSources * 2 * 4);
      const floatsPtr = this.wasm.wasm_alloc(nSources * 2 * 8);
      try {
        this.wasm.engine_export_source_stats(this.ptr, countsPtr, floatsPtr);
        const counts = new Int32Array(this.wasm.memory.buffer, countsPtr, nSources * 2);
        const floats = new Float64Array(this.wasm.memory.buffer, floatsPtr, nSources * 2);
        for (let i = 0; i < nSources; i += 1) {
          sourceStats[this.sources[i].code] = {
            trials: counts[i * 2],
            accepted: counts[i * 2 + 1],
            gain_sum: floats[i * 2],
            ema_gain: floats[i * 2 + 1]
          };
        }
      } finally {
        this.wasm.wasm_dealloc(countsPtr, nSources * 2 * 4);
        this.wasm.wasm_dealloc(floatsPtr, nSources * 2 * 8);
      }
    }

    const colorCount = this.wasm.engine_color_stat_count(this.ptr);
    const colorStats: Record<string, MemoryStat> = {};
    if (colorCount > 0) {
      const keysPtr = this.wasm.wasm_alloc(colorCount * 8);
      const countsPtr = this.wasm.wasm_alloc(colorCount * 2 * 4);
      const floatsPtr = this.wasm.wasm_alloc(colorCount * 2 * 8);
      try {
        this.wasm.engine_export_color_stats(this.ptr, keysPtr, countsPtr, floatsPtr);
        const keyWords = new Uint32Array(this.wasm.memory.buffer, keysPtr, colorCount * 2);
        const counts = new Int32Array(this.wasm.memory.buffer, countsPtr, colorCount * 2);
        const floats = new Float64Array(this.wasm.memory.buffer, floatsPtr, colorCount * 2);
        for (let i = 0; i < colorCount; i += 1) {
          const lo = keyWords[i * 2];
          const sourceIdx = lo >>> 16;
          const source = this.sources[sourceIdx];
          if (!source) continue;
          const r = (lo >>> 8) & 0xf;
          const g = (lo >>> 4) & 0xf;
          const b = lo & 0xf;
          colorStats[`${source.code}|${r},${g},${b}`] = {
            trials: counts[i * 2],
            accepted: counts[i * 2 + 1],
            gain_sum: floats[i * 2],
            ema_gain: floats[i * 2 + 1]
          };
        }
      } finally {
        this.wasm.wasm_dealloc(keysPtr, colorCount * 8);
        this.wasm.wasm_dealloc(countsPtr, colorCount * 2 * 4);
        this.wasm.wasm_dealloc(floatsPtr, colorCount * 2 * 8);
      }
    }

    const sortStats = (stats: Record<string, MemoryStat>): Record<string, MemoryStat> =>
      Object.fromEntries(Object.keys(stats).sort().map((key) => [key, stats[key]]));

    return JSON.stringify({
      version: MEMORY_VERSION,
      source_stats: sortStats(sourceStats),
      color_stats: sortStats(colorStats)
    });
  }

  restoreFromSnapshot(snapshot: AutoCreateTwroleSnapshot): boolean {
    const memoryValidator = new ExperienceMemory('', this.sources, true);
    const restoredExperience = memoryValidator.prepareSnapshotState(snapshot.experienceState);
    if (!restoredExperience) return false;

    const count = snapshot.tiles.length;
    const sourceIds = new Uint32Array(count);
    const params = new Float64Array(count * 6);

    for (let i = 0; i < count; i += 1) {
      const tile = snapshot.tiles[i];
      if (
        !tile ||
        typeof tile !== 'object' ||
        !tile.active ||
        !Number.isInteger(tile.sourceId) ||
        !Number.isFinite(tile.sxInternal) ||
        !Number.isFinite(tile.syInternal) ||
        Math.abs(tile.sxInternal) < 1.0e-9 ||
        Math.abs(tile.syInternal) < 1.0e-9 ||
        !Number.isFinite(tile.rDeg) ||
        Math.abs(tile.rDeg) > 180 ||
        !Number.isFinite(tile.centerX) ||
        !Number.isFinite(tile.centerY) ||
        !Number.isFinite(tile.gainMse) ||
        !tile.decoration ||
        typeof tile.decoration !== 'object' ||
        !tile.legacy ||
        typeof tile.legacy !== 'object' ||
        !Array.isArray(tile.bbox) ||
        tile.bbox.length !== 4 ||
        tile.bbox.some((value) => !Number.isInteger(value))
      ) return false;

      const source = this.sources[tile.sourceId];
      if (!source || source.idx !== tile.sourceId) return false;

      const canonical = canonicalCandidateTransform(
        source,
        tile.sxInternal,
        tile.syInternal,
        tile.rDeg,
        this.width,
        this.height
      );
      if (
        Math.abs(canonical.sxInternal - tile.sxInternal) > 1.0e-12 ||
        Math.abs(canonical.syInternal - tile.syInternal) > 1.0e-12 ||
        canonical.rDeg !== tile.rDeg ||
        canonical.sxInternal === 0 ||
        canonical.syInternal === 0
      ) return false;

      const geometry = variantGeometry(source, tile.sxInternal, tile.syInternal, tile.rDeg);
      if (
        !Number.isFinite(geometry.width) ||
        !Number.isFinite(geometry.height) ||
        geometry.width > this.width * 1.5 ||
        geometry.height > this.height * 1.5
      ) return false;

      const left = Math.round(tile.centerX - geometry.width / 2);
      const top = Math.round(tile.centerY - geometry.height / 2);
      const right = left + geometry.width;
      const bottom = top + geometry.height;
      if (tile.centerX !== left + geometry.width / 2 || tile.centerY !== top + geometry.height / 2) return false;
      const bbox: BBox = [left, top, right, bottom];
      if (bbox.some((value, index) => value !== tile.bbox[index])) return false;

      const draft = buildDecoDraft(
        source,
        tile.centerX,
        tile.centerY,
        tile.sxInternal,
        tile.syInternal,
        tile.rDeg,
        this.width,
        this.height
      );
      const decorationMatches =
        typeof tile.decoration.id === 'string' &&
        tile.decoration.id.length > 0 &&
        tile.decoration.code === draft.code &&
        tile.decoration.assetId === draft.assetId &&
        tile.decoration.name === draft.name &&
        tile.decoration.x === draft.x &&
        tile.decoration.y === draft.y &&
        tile.decoration.scaleX === draft.scaleX &&
        tile.decoration.scaleY === draft.scaleY &&
        tile.decoration.rotation === draft.rotation &&
        tile.decoration.visible === true &&
        tile.decoration.opacity === 1;
      const legacyMatches =
        tile.legacy.c === draft.legacy.c &&
        tile.legacy.x === draft.legacy.x &&
        tile.legacy.y === draft.legacy.y &&
        tile.legacy.sx === draft.legacy.sx &&
        tile.legacy.sy === draft.legacy.sy &&
        tile.legacy.r === draft.legacy.r;
      if (!decorationMatches || !legacyMatches) return false;

      sourceIds[i] = tile.sourceId >>> 0;
      const p = i * 6;
      params[p] = tile.centerX;
      params[p + 1] = tile.centerY;
      params[p + 2] = tile.sxInternal;
      params[p + 3] = tile.syInternal;
      params[p + 4] = tile.rDeg;
      params[p + 5] = tile.gainMse;
    }

    const codeToIndex = new Map<string, number>();
    for (let i = 0; i < this.sources.length; i += 1) {
      codeToIndex.set(this.sources[i].code, i);
    }

    const nSources = this.sources.length;
    const srcCountsPtr = nSources > 0 ? this.wasm.wasm_alloc(nSources * 2 * 4) : 0;
    const srcFloatsPtr = nSources > 0 ? this.wasm.wasm_alloc(nSources * 2 * 8) : 0;
    const colorEntries: Array<{ lo: number; stat: MemoryStat }> = [];
    for (const [key, stat] of Object.entries(restoredExperience.color_stats)) {
      const sep = key.lastIndexOf('|');
      if (sep <= 0) continue;
      const sourceIdx = codeToIndex.get(key.slice(0, sep));
      if (sourceIdx === undefined) continue;
      const parts = key.slice(sep + 1).split(',');
      if (parts.length !== 3) continue;
      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      if (
        !Number.isInteger(r) || r < 0 || r > 15 ||
        !Number.isInteger(g) || g < 0 || g > 15 ||
        !Number.isInteger(b) || b < 0 || b > 15
      ) continue;
      colorEntries.push({
        lo: ((sourceIdx << 16) | (r << 8) | (g << 4) | b) >>> 0,
        stat
      });
    }

    const nColor = colorEntries.length;
    const colorKeysPtr = nColor > 0 ? this.wasm.wasm_alloc(nColor * 8) : 0;
    const colorCountsPtr = nColor > 0 ? this.wasm.wasm_alloc(nColor * 2 * 4) : 0;
    const colorFloatsPtr = nColor > 0 ? this.wasm.wasm_alloc(nColor * 2 * 8) : 0;
    const tileIdsPtr = count > 0 ? this.wasm.wasm_alloc(count * 4) : 0;
    const tileParamsPtr = count > 0 ? this.wasm.wasm_alloc(count * 6 * 8) : 0;

    try {
      if (nSources > 0) {
        const sc = new Int32Array(this.wasm.memory.buffer, srcCountsPtr, nSources * 2);
        const sf = new Float64Array(this.wasm.memory.buffer, srcFloatsPtr, nSources * 2);
        for (let i = 0; i < nSources; i += 1) {
          const st = restoredExperience.source_stats[this.sources[i].code];
          if (st) {
            sc[i * 2] = st.trials;
            sc[i * 2 + 1] = st.accepted;
            sf[i * 2] = st.gain_sum;
            sf[i * 2 + 1] = st.ema_gain;
          }
        }
      }

      if (nColor > 0) {
        const ck = new Uint32Array(this.wasm.memory.buffer, colorKeysPtr, nColor * 2);
        const cc = new Int32Array(this.wasm.memory.buffer, colorCountsPtr, nColor * 2);
        const cf = new Float64Array(this.wasm.memory.buffer, colorFloatsPtr, nColor * 2);
        for (let i = 0; i < nColor; i += 1) {
          const entry = colorEntries[i];
          ck[i * 2] = entry.lo;
          ck[i * 2 + 1] = 0;
          cc[i * 2] = entry.stat.trials;
          cc[i * 2 + 1] = entry.stat.accepted;
          cf[i * 2] = entry.stat.gain_sum;
          cf[i * 2 + 1] = entry.stat.ema_gain;
        }
      }

      if (count > 0) {
        new Uint32Array(this.wasm.memory.buffer, tileIdsPtr, count).set(sourceIds);
        new Float64Array(this.wasm.memory.buffer, tileParamsPtr, count * 6).set(params);
      }

      this.wasm.engine_restore_memory(
        this.ptr,
        nSources,
        srcCountsPtr,
        srcFloatsPtr,
        nColor,
        colorKeysPtr,
        colorCountsPtr,
        colorFloatsPtr
      );
      const restored = this.wasm.engine_restore_tiles(
        this.ptr,
        count,
        tileIdsPtr,
        tileParamsPtr,
        snapshot.accepted >>> 0,
        snapshot.rejected >>> 0,
        snapshot.pruned >>> 0,
        snapshot.replaced >>> 0
      ) !== 0;
      if (!restored) return false;
      this.wasm.engine_set_rng(
        this.ptr,
        snapshot.rngState >>> 0,
        snapshot.rngSpareNormal !== null ? 1 : 0,
        snapshot.rngSpareNormal ?? 0
      );
      this.canvasRevision += 1;
      this.refreshStats();
      return true;
    } finally {
      if (srcCountsPtr) this.wasm.wasm_dealloc(srcCountsPtr, nSources * 2 * 4);
      if (srcFloatsPtr) this.wasm.wasm_dealloc(srcFloatsPtr, nSources * 2 * 8);
      if (colorKeysPtr) this.wasm.wasm_dealloc(colorKeysPtr, nColor * 8);
      if (colorCountsPtr) this.wasm.wasm_dealloc(colorCountsPtr, nColor * 2 * 4);
      if (colorFloatsPtr) this.wasm.wasm_dealloc(colorFloatsPtr, nColor * 2 * 8);
      if (tileIdsPtr) this.wasm.wasm_dealloc(tileIdsPtr, count * 4);
      if (tileParamsPtr) this.wasm.wasm_dealloc(tileParamsPtr, count * 6 * 8);
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
    const count = this.wasm.engine_export_tile_count(this.ptr);
    const tiles: AutoCreateTwroleSnapshot['tiles'] = [];
    if (count > 0) {
      const idsPtr = this.wasm.wasm_alloc(count * 4);
      const paramsPtr = this.wasm.wasm_alloc(count * 6 * 8);
      try {
        this.wasm.engine_export_tiles(this.ptr, idsPtr, paramsPtr);
        const ids = new Uint32Array(this.wasm.memory.buffer, idsPtr, count);
        const params = new Float64Array(this.wasm.memory.buffer, paramsPtr, count * 6);
        for (let i = 0; i < count; i += 1) {
          const sourceId = ids[i];
          const source = this.sources[sourceId];
          const p = i * 6;
          const centerX = params[p];
          const centerY = params[p + 1];
          const sxInternal = params[p + 2];
          const syInternal = params[p + 3];
          const rDeg = params[p + 4];
          const gainMse = params[p + 5];
          const geom = variantGeometry(source, sxInternal, syInternal, rDeg);
          const left = Math.round(centerX - geom.width / 2);
          const top = Math.round(centerY - geom.height / 2);
          const bbox: BBox = [left, top, left + geom.width, top + geom.height];
          const draft = buildDecoDraft(
            source,
            centerX,
            centerY,
            sxInternal,
            syInternal,
            rDeg,
            this.width,
            this.height
          );
          tiles.push({
            active: true,
            sourceId,
            sxInternal,
            syInternal,
            rDeg,
            centerX,
            centerY,
            bbox,
            decoration: decorationFromDraft(draft),
            legacy: draft.legacy,
            gainMse
          });
        }
      } finally {
        this.wasm.wasm_dealloc(idsPtr, count * 4);
        this.wasm.wasm_dealloc(paramsPtr, count * 6 * 8);
      }
    }

    const rngState = this.wasm.engine_rng_state(this.ptr) >>> 0;
    const rngSpareNormal = this.wasm.engine_rng_has_spare(this.ptr) !== 0
      ? this.wasm.engine_rng_spare(this.ptr)
      : null;

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
      experienceState: this.exportExperienceState(),
      step: Math.max(0, Math.round(step)),
      totalSteps: Math.max(1, Math.round(totalSteps)),
      finalPruneStep: Math.max(0, Math.round(finalPruneStep)),
      seed,
      rngState,
      rngSpareNormal,
      accepted: this._accepted,
      rejected: this._rejected,
      pruned: this._pruned,
      replaced: this._replaced,
      mse: this.currentMse(),
      tiles,
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
