import type { DecorationLayer } from '../../../types/role';
import {
  ALPHA_MSE_WEIGHT,
  AUTO_CREATE_EXPERIENCE_STORAGE_PREFIX,
  AUTO_CREATE_SNAPSHOT_VERSION,
  DEFAULT_MEMORY_NAME,
  INV_255,
  autoCreateSnapshotSettingsSignature,
  type AutoCreateTwroleLegacyDecoEntry,
  type AutoCreateTwroleSettings,
  type AutoCreateTwroleSnapshot
} from './contracts';
import type {
  AutoCreateCanvas,
  BBox,
  Candidate,
  SourceTile,
  TargetImageData,
  TileRecord,
  TransformedImage,
  Vec3
} from './internalTypes';
import { AutoCreateDiagnosticsCollector } from './diagnostics';
import {
  BinaryMaskIndex,
  ErrorField,
  SeededRandom,
  TargetMomentIndex,
  TileSpatialIndex,
  bboxClip,
  bboxIntersects,
  pixelOffset
} from './numericCore';
import { canvasToDataUrl, clamp, createCanvas, get2d } from './platform';
import { premultToStraightImageData, sourceSignatureForTiles } from './sourcePipeline';
import { ExperienceMemory } from './experienceMemory';
import { VariantCache, variantGeometry } from './variantCache';
import { candidateContainmentMode, candidateFitsContainment } from './containment';
import {
  autoMaxRenderedPx,
  buildDecoDraft,
  canonicalCandidateTransform,
  chooseSourceIds,
  decorationFromDraft,
  proposeCandidate,
  sourceChoiceScores
} from './candidateSearch';

const EMPTY_TRANSFORMED_IMAGE: TransformedImage = {
  width: 0,
  height: 0,
  data: new Uint8ClampedArray(0),
  alphaBounds: [0, 0, 0, 0],
  alphaRowStart: new Int32Array(0),
  alphaRowEnd: new Int32Array(0),
  alphaSum: 0
};

export function replacePartialSseCannotBeat(
  beforeSse: number,
  partialAfterSse: number,
  denominator: number,
  incumbentGainMse: number
): boolean {
  return (beforeSse - partialAfterSse) / denominator <= incumbentGainMse;
}

export class ColorLearningCollage {
  private readonly canvas: Float32Array;
  private readonly errors: ErrorField;
  private readonly cache: VariantCache;
  private readonly memory: ExperienceMemory;
  private readonly maskIndex: BinaryMaskIndex;
  private readonly placementMaskIndex: BinaryMaskIndex;
  private readonly spatialIndex: TileSpatialIndex;
  private readonly tiles: TileRecord[] = [];
  private readonly globalDen: number;
  private readonly targetMoments: TargetMomentIndex;
  private readonly sourceScoreScratch: Float64Array;
  private readonly sourceIdScratch: number[] = [];
  private readonly cumulativeScoreScratch: Float64Array;
  private readonly candidateScratch: [Candidate | null, Candidate | null] = [null, null];
  private patchScratch = new Float32Array(0);
  private activeTileCount = 0;
  private previewCanvas: AutoCreateCanvas | null = null;
  private previewPixels: Uint8ClampedArray | null = null;
  private previewRevision = -1;
  private previewUrl = '';
  private canvasRevision = 0;
  private diagnosticCandidatePixels = 0;

  accepted = 0;
  rejected = 0;
  pruned = 0;
  replaced = 0;

  constructor(
    private readonly sources: SourceTile[],
    private readonly targetStraight: Uint8ClampedArray,
    private readonly targetPremult: Float32Array,
    private readonly mask: Uint8Array,
    private readonly placementMask: Uint8Array,
    private readonly width: number,
    private readonly height: number,
    private readonly rng: SeededRandom,
    private readonly settings: AutoCreateTwroleSettings,
    private readonly diagnostics: AutoCreateDiagnosticsCollector | null = null
  ) {
    this.canvas = new Float32Array(width * height * 4);
    const maskCount = Math.max(1, mask.reduce((sum, value) => sum + (value ? 1 : 0), 0));
    this.globalDen = maskCount * (3 + ALPHA_MSE_WEIGHT);
    this.targetMoments = new TargetMomentIndex(targetStraight, mask, width, height);
    this.sourceScoreScratch = new Float64Array(sources.length);
    this.cumulativeScoreScratch = new Float64Array(sources.length);
    const focusMask = new Uint8Array(mask.length);
    for (let pixel = 0; pixel < mask.length; pixel += 1) {
      focusMask[pixel] = mask[pixel] && placementMask[pixel] ? 1 : 0;
    }
    this.errors = new ErrorField(
      this.canvas,
      targetPremult,
      targetStraight,
      mask,
      width,
      height,
      settings.errorCellSize,
      focusMask
    );
    this.cache = new VariantCache(settings.variantCacheItems, diagnostics);
    this.maskIndex = new BinaryMaskIndex(mask, width, height);
    this.placementMaskIndex = new BinaryMaskIndex(placementMask, width, height);
    this.spatialIndex = new TileSpatialIndex(width, height, Math.max(16, Math.min(64, Math.round(settings.maxTileSize))));
    const experienceName = settings.experienceJson || DEFAULT_MEMORY_NAME;
    this.memory = new ExperienceMemory(`${AUTO_CREATE_EXPERIENCE_STORAGE_PREFIX}${experienceName}`, sources, settings.resetExperience);
  }

  currentMse(): number {
    return this.errors.totalSse / Math.max(1, this.globalDen);
  }

  activeCount(): number {
    return this.activeTileCount;
  }

  restoreFromSnapshot(snapshot: AutoCreateTwroleSnapshot): boolean {
    const restoredExperience = this.memory.prepareSnapshotState(snapshot.experienceState);
    if (!restoredExperience) return false;
    const restored: TileRecord[] = [];

    for (const tile of snapshot.tiles) {
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

      const rgba = this.cache.get(source, tile.sxInternal, tile.syInternal, tile.rDeg);
      const left = Math.round(tile.centerX - rgba.width / 2);
      const top = Math.round(tile.centerY - rgba.height / 2);
      const right = left + rgba.width;
      const bottom = top + rgba.height;
      if (tile.centerX !== left + rgba.width / 2 || tile.centerY !== top + rgba.height / 2) return false;
      const bbox: BBox = [left, top, right, bottom];
      if (bbox.some((value, index) => value !== tile.bbox[index])) return false;
      if (!candidateFitsContainment(rgba, bbox, this.placementMask, this.width, this.height)) return false;

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

      restored.push({
        active: true,
        sourceId: tile.sourceId,
        sxInternal: tile.sxInternal,
        syInternal: tile.syInternal,
        rDeg: tile.rDeg,
        bbox,
        centerX: tile.centerX,
        centerY: tile.centerY,
        decoration: { ...tile.decoration },
        legacy: { ...tile.legacy },
        gainMse: tile.gainMse
      });
    }

    this.tiles.splice(0, this.tiles.length, ...restored);
    this.activeTileCount = restored.length;
    this.spatialIndex.clear();
    for (let index = 0; index < restored.length; index += 1) {
      this.spatialIndex.update(index, restored[index].bbox);
    }
    this.accepted = snapshot.accepted;
    this.rejected = snapshot.rejected;
    this.pruned = snapshot.pruned;
    this.replaced = snapshot.replaced;

    this.canvas.fill(0);
    for (const tile of this.tiles) {
      this.alphaOverFull(tile.bbox, this.tileRgba(tile));
    }
    this.errors.recomputeAll();
    this.memory.commitSnapshotState(restoredExperience);
    this.markCanvasChanged();
    return true;
  }

  createSnapshot(
    step: number,
    totalSteps: number,
    finalPruneStep: number,
    seed: number,
    target: Pick<TargetImageData, 'width' | 'height' | 'sourceWidth' | 'sourceHeight'>,
    targetSignature: string,
    warnings: string[]
  ): AutoCreateTwroleSnapshot {
    const rng = this.rng.snapshot();
    return {
      version: AUTO_CREATE_SNAPSHOT_VERSION,
      targetWidth: target.width,
      targetHeight: target.height,
      sourceWidth: target.sourceWidth,
      sourceHeight: target.sourceHeight,
      sourceCount: this.sources.length,
      sourceSignature: sourceSignatureForTiles(this.sources),
      targetSignature,
      settingsSignature: autoCreateSnapshotSettingsSignature(this.settings),
      experienceState: this.memory.snapshotState(),
      step: Math.max(0, Math.round(step)),
      totalSteps: Math.max(1, Math.round(totalSteps)),
      finalPruneStep: Math.max(0, Math.round(finalPruneStep)),
      seed,
      rngState: rng.state,
      rngSpareNormal: rng.spareNormal,
      accepted: this.accepted,
      rejected: this.rejected,
      pruned: this.pruned,
      replaced: this.replaced,
      mse: this.currentMse(),
      tiles: this.tiles
        .filter((tile) => tile.active)
        .map((tile) => ({
          active: true,
          sourceId: tile.sourceId,
          sxInternal: tile.sxInternal,
          syInternal: tile.syInternal,
          rDeg: tile.rDeg,
          centerX: tile.centerX,
          centerY: tile.centerY,
          bbox: [...tile.bbox] as [number, number, number, number],
          decoration: { ...tile.decoration },
          legacy: { ...tile.legacy },
          gainMse: tile.gainMse
        })),
      warnings: [...warnings]
    };
  }

  exportDecorations(): DecorationLayer[] {
    // Python export_deco() is in render order: first accepted = bottom,
    // last accepted = top. role-editor-react-rebuild stores RoleDocument
    // decorations in top-first order and reverses them when drawing/exporting.
    // Reverse only the in-memory DecorationLayer[] used for insertion; keep
    // exportLegacyDeco() in Python's original bottom-to-top order.
    return this.tiles
      .filter((tile) => tile.active)
      .slice()
      .reverse()
      .map((tile) => tile.decoration);
  }

  exportLegacyDeco(): AutoCreateTwroleLegacyDecoEntry[] {
    return this.tiles.filter((tile) => tile.active).map((tile) => tile.legacy);
  }

  saveMemory(): void {
    this.memory.save();
  }

  async previewDataUrl(): Promise<string> {
    if (this.previewRevision === this.canvasRevision && this.previewUrl) return this.previewUrl;
    this.previewPixels ??= new Uint8ClampedArray(this.canvas.length);
    this.previewCanvas ??= createCanvas(this.width, this.height);
    const imageData = premultToStraightImageData(this.canvas, this.width, this.height, this.previewPixels);
    get2d(this.previewCanvas, false).putImageData(imageData, 0, 0);
    this.previewUrl = await canvasToDataUrl(this.previewCanvas);
    this.previewRevision = this.canvasRevision;
    return this.previewUrl;
  }

  private markCanvasChanged(): void {
    this.canvasRevision += 1;
  }

  private evaluateCandidate(candidate: Candidate, incumbentScore = Number.NEGATIVE_INFINITY): Candidate | null {
    if (!this.diagnostics) return this.evaluateCandidateCore(candidate, incumbentScore);
    this.diagnostics.add('candidatesEvaluated');
    this.diagnosticCandidatePixels = 0;
    try {
      return this.diagnostics.measure('candidateEvaluation', () => this.evaluateCandidateCore(candidate, incumbentScore));
    } finally {
      this.diagnostics.add('candidatePixelsEvaluated', this.diagnosticCandidatePixels);
    }
  }

  private evaluateCandidateCore(candidate: Candidate, incumbentScore: number): Candidate | null {
    const [left, top, right, bottom] = candidate.bbox;
    if (candidate.rgba.width !== right - left || candidate.rgba.height !== bottom - top) return null;

    let beforeSse = 0;
    const rgba = candidate.rgba;
    const sourceData = rgba.data;
    const canvas = this.canvas;
    const target = this.targetPremult;
    const mask = this.mask;
    const alphaSum = rgba.alphaSum;
    if (alphaSum <= 0) return null;

    const containmentMode = candidateContainmentMode(
      rgba,
      candidate.bbox,
      this.placementMask,
      this.width,
      this.height,
      this.placementMaskIndex
    );
    if (containmentMode === 'invalid') {
      this.diagnostics?.add('containmentRejected');
      return null;
    }
    if (containmentMode === 'fast') this.diagnostics?.add('containmentFastAccepted');
    else this.diagnostics?.add('containmentFallbacks');

    const [alphaLeft, alphaTop, alphaRight, alphaBottom] = rgba.alphaBounds;
    const visibleBounds: BBox = [
      left + alphaLeft,
      top + alphaTop,
      left + alphaRight,
      top + alphaBottom
    ];
    if (this.maskIndex.count(visibleBounds) <= 0) return null;

    let containmentPixelsChecked = 0;

    // Stage one fuses the exact fallback containment scan with before-SSE.
    // Fast-path candidates skip placement-mask reads entirely.
    for (let localY = 0; localY < rgba.height; localY += 1) {
      const spanStart = rgba.alphaRowStart[localY];
      const spanEnd = rgba.alphaRowEnd[localY];
      if (spanEnd <= spanStart) continue;
      const y = top + localY;
      let srcOffset = (localY * rgba.width + spanStart) * 4;
      let pixel = y * this.width + left + spanStart;
      for (let localX = spanStart; localX < spanEnd; localX += 1, srcOffset += 4, pixel += 1) {
        const alphaByte = sourceData[srcOffset + 3];
        if (alphaByte <= 0) continue;
        if (containmentMode === 'scan') {
          containmentPixelsChecked += 1;
          if (!this.placementMask[pixel]) {
            this.diagnostics?.add('containmentPixelsChecked', containmentPixelsChecked);
            this.diagnostics?.add('containmentRejected');
            return null;
          }
        }
        if (!mask[pixel]) continue;
        if (this.diagnostics) this.diagnosticCandidatePixels += 1;
        const offset = pixel * 4;
        const beforeR = canvas[offset];
        const beforeG = canvas[offset + 1];
        const beforeB = canvas[offset + 2];
        const beforeA = canvas[offset + 3];
        const dr = beforeR - target[offset];
        const dg = beforeG - target[offset + 1];
        const db = beforeB - target[offset + 2];
        const da = beforeA - target[offset + 3];
        beforeSse += dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;
      }
    }
    if (containmentPixelsChecked > 0) {
      this.diagnostics?.add('containmentPixelsChecked', containmentPixelsChecked);
    }

    const penalty = this.settings.tilePenaltyMse;
    const denominator = Math.max(1, this.globalDen);
    const upperScore = beforeSse / denominator - penalty;
    if (upperScore <= incumbentScore) {
      this.diagnostics?.add('candidateUpperBoundRejected');
      return null;
    }

    // Stage two only performs alpha-over and after-SSE. Once the partial SSE
    // cannot strictly beat the incumbent, all remaining non-negative terms
    // can be skipped while preserving the original earliest-winner tie order.
    let afterSse = 0;
    const afterSseLimit = incumbentScore === Number.NEGATIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : beforeSse - (incumbentScore + penalty) * denominator;
    for (let localY = 0; localY < rgba.height; localY += 1) {
      const spanStart = rgba.alphaRowStart[localY];
      const spanEnd = rgba.alphaRowEnd[localY];
      if (spanEnd <= spanStart) continue;
      const y = top + localY;
      let srcOffset = (localY * rgba.width + spanStart) * 4;
      let pixel = y * this.width + left + spanStart;
      for (let localX = spanStart; localX < spanEnd; localX += 1, srcOffset += 4, pixel += 1) {
        const alphaByte = sourceData[srcOffset + 3];
        if (alphaByte <= 0 || !mask[pixel]) continue;
        const offset = pixel * 4;
        const beforeR = canvas[offset];
        const beforeG = canvas[offset + 1];
        const beforeB = canvas[offset + 2];
        const beforeA = canvas[offset + 3];
        let afterR: number;
        let afterG: number;
        let afterB: number;
        let afterA: number;
        if (alphaByte === 255) {
          afterR = sourceData[srcOffset];
          afterG = sourceData[srcOffset + 1];
          afterB = sourceData[srcOffset + 2];
          afterA = 255;
        } else {
          const srcA = alphaByte * INV_255;
          const inv = 1 - srcA;
          afterR = sourceData[srcOffset] * srcA + beforeR * inv;
          afterG = sourceData[srcOffset + 1] * srcA + beforeG * inv;
          afterB = sourceData[srcOffset + 2] * srcA + beforeB * inv;
          afterA = (srcA + beforeA * INV_255 * inv) * 255;
        }
        const ar = afterR - target[offset];
        const ag = afterG - target[offset + 1];
        const ab = afterB - target[offset + 2];
        const aa = afterA - target[offset + 3];
        afterSse += ar * ar + ag * ag + ab * ab + ALPHA_MSE_WEIGHT * aa * aa;
        if (
          afterSse >= afterSseLimit &&
          (beforeSse - afterSse) / denominator - penalty <= incumbentScore
        ) {
          this.diagnostics?.add('candidateAfterSseEarlyRejected');
          return null;
        }
      }
    }

    candidate.sseBefore = beforeSse;
    candidate.sseAfter = afterSse;
    candidate.globalGainMse = (beforeSse - afterSse) / denominator;
    candidate.score = candidate.globalGainMse - penalty;
    return candidate;
  }

  private localTargetStats(x: number, y: number, radius: number): { mean: Vec3; std: Vec3; complexity: number } {
    const indexed = this.targetMoments.stats(x, y, radius);
    if (indexed) return indexed;

    const offset = pixelOffset(this.width, clamp(x, 0, this.width - 1), clamp(y, 0, this.height - 1));
    return {
      mean: [this.targetStraight[offset], this.targetStraight[offset + 1], this.targetStraight[offset + 2]],
      std: [0, 0, 0],
      complexity: 0
    };
  }

  private focusGradientColor(focusX: number, focusY: number): { color: Vec3; std: Vec3; complexity: number } {
    const stats = this.localTargetStats(focusX, focusY, this.settings.gradientLocalRadius);
    const offset = pixelOffset(this.width, clamp(focusX, 0, this.width - 1), clamp(focusY, 0, this.height - 1));
    const mix = clamp(this.settings.gradientPixelMix, 0, 1);
    return {
      color: [
        this.targetStraight[offset] * mix + stats.mean[0] * (1 - mix),
        this.targetStraight[offset + 1] * mix + stats.mean[1] * (1 - mix),
        this.targetStraight[offset + 2] * mix + stats.mean[2] * (1 - mix)
      ],
      std: stats.std,
      complexity: stats.complexity
    };
  }

  private generateBestAddCandidate(progress: number): Candidate | null {
    const focus = this.errors.chooseFocus(this.rng);
    const target = this.focusGradientColor(focus.x, focus.y);
    const allScores = sourceChoiceScores(this.sources, target.color, this.memory, this.settings, target.std, this.sourceScoreScratch);
    const sourceIds = chooseSourceIds(this.sources, target.color, this.memory, this.rng, this.settings, target.std, undefined, undefined, allScores, this.sourceIdScratch);
    if (!sourceIds.length) return null;

    this.fillCumulativeScores(sourceIds, allScores);
    let bestSlot = -1;
    let proposalSlot = 0;
    const batch = Math.max(1, Math.round(this.settings.candidateBatch));
    const jitter = Math.max(1, this.settings.errorCellSize * 0.35);
    const isGradient = target.complexity >= this.settings.gradientComplexityThreshold;
    let desiredPx: number | undefined;
    let maxRenderedPx = this.settings.maxRenderedPx;
    if (isGradient) {
      desiredPx = Math.max(this.settings.minRenderedPx, this.settings.gradientOriginalMaxPx);
      const autoMax = maxRenderedPx > 0 ? maxRenderedPx : autoMaxRenderedPx(this.width, this.height);
      maxRenderedPx = Math.min(autoMax, this.settings.gradientOriginalMaxPx);
    }
    const proposalOptions = {
      desiredPx,
      maxRenderedPx,
      centerJitterPx: jitter,
      acceptGeometry: (bbox: BBox) => {
        const best = bestSlot >= 0 ? this.candidateScratch[bestSlot] : null;
        if (!best) return true;
        const upperScore = this.errors.focusSseUpperBound(bbox) / Math.max(1, this.globalDen)
          - this.settings.tilePenaltyMse;
        return upperScore > best.score;
      }
    };

    for (let i = 0; i < batch; i += 1) {
      const sourceId = sourceIds[this.rng.weightedIndexFromCumulative(this.cumulativeScoreScratch, sourceIds.length)];
      const candidate = proposeCandidate(
        this.sources,
        sourceId,
        focus.x,
        focus.y,
        this.width,
        this.height,
        progress,
        this.rng,
        this.cache,
        this.settings,
        proposalOptions,
        this.diagnostics,
        this.candidateScratch[proposalSlot]
      );
      if (!candidate) continue;
      this.candidateScratch[proposalSlot] = candidate;
      const best = bestSlot >= 0 ? this.candidateScratch[bestSlot] : null;
      const evaluated = this.evaluateCandidate(candidate, best?.score ?? Number.NEGATIVE_INFINITY);
      if (evaluated && (!best || evaluated.score > best.score)) {
        bestSlot = proposalSlot;
        proposalSlot = 1 - bestSlot;
      }
    }
    return bestSlot >= 0 ? this.candidateScratch[bestSlot] : null;
  }

  private fillCumulativeScores(sourceIds: readonly number[], scores: ArrayLike<number>): void {
    let total = 0;
    for (let index = 0; index < sourceIds.length; index += 1) {
      total += Math.max(1.0e-12, scores[sourceIds[index]]);
      this.cumulativeScoreScratch[index] = total;
    }
  }

  private alphaOverFull(bbox: BBox, rgba: TransformedImage): void {
    const [left, top] = bbox;
    for (let localY = 0; localY < rgba.height; localY += 1) {
      const start = rgba.alphaRowStart[localY];
      const end = rgba.alphaRowEnd[localY];
      if (end <= start) continue;
      const y = top + localY;
      for (let localX = start; localX < end; localX += 1) {
        const srcOffset = pixelOffset(rgba.width, localX, localY);
        const alphaByte = rgba.data[srcOffset + 3];
        if (alphaByte <= 0) continue;
        const x = left + localX;
        const offset = pixelOffset(this.width, x, y);
        if (alphaByte === 255) {
          this.canvas[offset] = rgba.data[srcOffset];
          this.canvas[offset + 1] = rgba.data[srcOffset + 1];
          this.canvas[offset + 2] = rgba.data[srcOffset + 2];
          this.canvas[offset + 3] = 255;
          continue;
        }
        const srcA = alphaByte * INV_255;
        const inv = 1 - srcA;
        this.canvas[offset] = rgba.data[srcOffset] * srcA + this.canvas[offset] * inv;
        this.canvas[offset + 1] = rgba.data[srcOffset + 1] * srcA + this.canvas[offset + 1] * inv;
        this.canvas[offset + 2] = rgba.data[srcOffset + 2] * srcA + this.canvas[offset + 2] * inv;
        this.canvas[offset + 3] = (srcA + (this.canvas[offset + 3] / 255) * inv) * 255;
      }
    }
  }

  private recordFromCandidate(candidate: Candidate): TileRecord {
    const source = this.sources[candidate.sourceId];
    // A continuously-rotated proposal may have been rendered transiently.
    // Keep accepted variants so pruning, replacement and snapshot rendering do
    // not rasterize them again.
    this.cache.remember(source, candidate.sxInternal, candidate.syInternal, candidate.rDeg, candidate.rgba);
    this.diagnostics?.add('decoDraftsAllocated');
    const draft = buildDecoDraft(
      source,
      candidate.centerX,
      candidate.centerY,
      candidate.sxInternal,
      candidate.syInternal,
      candidate.rDeg,
      this.width,
      this.height
    );
    return {
      active: true,
      sourceId: candidate.sourceId,
      sxInternal: candidate.sxInternal,
      syInternal: candidate.syInternal,
      rDeg: candidate.rDeg,
      // Candidate instances are reused by the search loops. Tile records need
      // an owned bbox so a later proposal cannot mutate accepted geometry.
      bbox: [...candidate.bbox] as BBox,
      centerX: candidate.centerX,
      centerY: candidate.centerY,
      decoration: decorationFromDraft(draft),
      legacy: draft.legacy,
      gainMse: candidate.globalGainMse
    };
  }

  private acceptCandidate(candidate: Candidate, memoryColor?: Vec3): void {
    this.assertCandidateContained(candidate);
    const apply = () => {
      this.alphaOverFull(candidate.bbox, candidate.rgba);
      this.errors.updateBBox(candidate.bbox);
    };
    if (this.diagnostics) {
      this.diagnostics.measure('candidateApply', apply);
    } else {
      apply();
    }
    const tileIndex = this.tiles.length;
    this.tiles.push(this.recordFromCandidate(candidate));
    this.spatialIndex.update(tileIndex, candidate.bbox);
    this.activeTileCount += 1;
    this.markCanvasChanged();
    this.accepted += 1;
    this.diagnostics?.add('tilesAccepted');
    const source = this.sources[candidate.sourceId];
    const color = memoryColor ?? this.focusGradientColor(candidate.centerX, candidate.centerY).color;
    this.memory.noteTrial(source.code, color, true, candidate.globalGainMse);
  }

  private assertCandidateContained(candidate: Candidate): void {
    if (!candidateFitsContainment(candidate.rgba, candidate.bbox, this.placementMask, this.width, this.height)) {
      throw new Error('AutoCreate invariant failed: candidate escaped the target alpha containment mask.');
    }
  }

  private candidateFitsPlacementFast(candidate: Candidate): boolean {
    const mode = candidateContainmentMode(
      candidate.rgba,
      candidate.bbox,
      this.placementMask,
      this.width,
      this.height,
      this.placementMaskIndex
    );
    if (mode === 'invalid') {
      this.diagnostics?.add('containmentRejected');
      return false;
    }
    if (mode === 'fast') {
      this.diagnostics?.add('containmentFastAccepted');
      return true;
    }
    this.diagnostics?.add('containmentFallbacks');
    const fits = candidateFitsContainment(
      candidate.rgba,
      candidate.bbox,
      this.placementMask,
      this.width,
      this.height
    );
    if (!fits) this.diagnostics?.add('containmentRejected');
    return fits;
  }

  tryAdd(step: number, totalSteps: number): boolean {
    try {
      if (this.settings.tileBudget > 0 && this.activeCount() >= this.settings.tileBudget) return false;
      const progress = step / Math.max(1, totalSteps);
      const best = this.generateBestAddCandidate(progress);
      if (!best) {
        this.rejected += 1;
        return false;
      }
      const targetColor = this.focusGradientColor(best.centerX, best.centerY).color;
      const source = this.sources[best.sourceId];
      if (best.score > 0) {
        this.acceptCandidate(best, targetColor);
        return true;
      }
      this.memory.noteTrial(source.code, targetColor, false, best.globalGainMse);
      this.rejected += 1;
      return false;
    } finally {
      this.releaseCandidateScratchImages();
    }
  }

  private releaseCandidateScratchImages(): void {
    for (const candidate of this.candidateScratch) {
      if (candidate) candidate.rgba = EMPTY_TRANSFORMED_IMAGE;
    }
  }

  private activeIndices(): number[] {
    return this.tiles.map((tile, index) => (tile.active ? index : -1)).filter((index) => index >= 0);
  }

  private tileRgba(tile: TileRecord): TransformedImage {
    return this.cache.get(this.sources[tile.sourceId], tile.sxInternal, tile.syInternal, tile.rDeg);
  }

  private alphaOverPatch(
    dst: Float32Array,
    dstWidth: number,
    src: TransformedImage,
    srcX: number,
    srcY: number,
    dstX: number,
    dstY: number,
    width: number,
    height: number
  ): void {
    for (let y = 0; y < height; y += 1) {
      const sourceY = srcY + y;
      const start = Math.max(srcX, src.alphaRowStart[sourceY]);
      const end = Math.min(srcX + width, src.alphaRowEnd[sourceY]);
      if (end <= start) continue;
      for (let sourceX = start; sourceX < end; sourceX += 1) {
        const srcOffset = pixelOffset(src.width, sourceX, sourceY);
        const alphaByte = src.data[srcOffset + 3];
        if (alphaByte <= 0) continue;
        const dstOffset = pixelOffset(dstWidth, dstX + sourceX - srcX, dstY + y);
        if (alphaByte === 255) {
          dst[dstOffset] = src.data[srcOffset];
          dst[dstOffset + 1] = src.data[srcOffset + 1];
          dst[dstOffset + 2] = src.data[srcOffset + 2];
          dst[dstOffset + 3] = 255;
          continue;
        }
        const srcA = alphaByte * INV_255;
        const inv = 1 - srcA;
        dst[dstOffset] = src.data[srcOffset] * srcA + dst[dstOffset] * inv;
        dst[dstOffset + 1] = src.data[srcOffset + 1] * srcA + dst[dstOffset + 1] * inv;
        dst[dstOffset + 2] = src.data[srcOffset + 2] * srcA + dst[dstOffset + 2] * inv;
        dst[dstOffset + 3] = (srcA + (dst[dstOffset + 3] / 255) * inv) * 255;
      }
    }
  }

  private acquirePatchBuffer(length: number): Float32Array {
    if (this.patchScratch.length < length) {
      let capacity = Math.max(16, this.patchScratch.length || 16);
      while (capacity < length) capacity *= 2;
      this.patchScratch = new Float32Array(capacity);
      this.diagnostics?.add('scratchBuffersAllocated');
    }
    const patch = this.patchScratch.length === length ? this.patchScratch : this.patchScratch.subarray(0, length);
    patch.fill(0);
    return patch;
  }

  private renderPatchFromTiles(bbox: BBox, excludeIndex?: number, replaceIndex?: number, replacement?: Candidate): Float32Array {
    const [left, top, right, bottom] = bbox;
    const patchWidth = right - left;
    const out = this.acquirePatchBuffer(patchWidth * (bottom - top) * 4);
    const tileIndices = this.spatialIndex.query(bbox);
    if (
      replaceIndex != null &&
      replacement &&
      bboxIntersects(replacement.bbox, bbox) &&
      !tileIndices.includes(replaceIndex)
    ) {
      tileIndices.push(replaceIndex);
      tileIndices.sort((a, b) => a - b);
    }

    for (const index of tileIndices) {
      const tile = this.tiles[index];
      if (!tile?.active) continue;
      if (excludeIndex != null && index === excludeIndex) continue;

      const useReplacement = replaceIndex != null && index === replaceIndex && replacement != null;
      const tileBox = useReplacement ? replacement.bbox : tile.bbox;
      if (!bboxIntersects(tileBox, bbox)) continue;
      // Do not touch the variant cache until the cheap bbox rejection passed.
      const rgba = useReplacement ? replacement.rgba : this.tileRgba(tile);

      const il = Math.max(left, tileBox[0]);
      const it = Math.max(top, tileBox[1]);
      const ir = Math.min(right, tileBox[2]);
      const ib = Math.min(bottom, tileBox[3]);
      if (ir <= il || ib <= it) continue;

      this.alphaOverPatch(
        out,
        patchWidth,
        rgba,
        il - tileBox[0],
        it - tileBox[1],
        il - left,
        it - top,
        ir - il,
        ib - it
      );
    }
    return out;
  }

  private maskedSseFull(bbox: BBox): number {
    const [left, top, right, bottom] = bbox;
    let sse = 0;
    for (let y = top; y < bottom; y += 1) {
      const range = this.maskIndex.rowVisibleRange(y, left, right);
      if (!range) continue;
      for (let x = range[0]; x < range[1]; x += 1) {
        const pixel = y * this.width + x;
        if (!this.maskIndex.isSet(pixel)) continue;
        const offset = pixel * 4;
        const dr = this.canvas[offset] - this.targetPremult[offset];
        const dg = this.canvas[offset + 1] - this.targetPremult[offset + 1];
        const db = this.canvas[offset + 2] - this.targetPremult[offset + 2];
        const da = this.canvas[offset + 3] - this.targetPremult[offset + 3];
        sse += dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;
      }
    }
    return sse;
  }

  private maskedSsePatch(
    patch: Float32Array,
    bbox: BBox,
    stopAt = Number.POSITIVE_INFINITY,
    beforeSse = 0,
    incumbentGainMse = Number.POSITIVE_INFINITY,
    denominator = 1
  ): number {
    const [left, top, right, bottom] = bbox;
    const patchWidth = right - left;
    let sse = 0;
    for (let y = top; y < bottom; y += 1) {
      const range = this.maskIndex.rowVisibleRange(y, left, right);
      if (!range) continue;
      for (let x = range[0]; x < range[1]; x += 1) {
        const pixel = y * this.width + x;
        if (!this.maskIndex.isSet(pixel)) continue;
        const patchOffset = pixelOffset(patchWidth, x - left, y - top);
        const targetOffset = pixel * 4;
        const dr = patch[patchOffset] - this.targetPremult[targetOffset];
        const dg = patch[patchOffset + 1] - this.targetPremult[targetOffset + 1];
        const db = patch[patchOffset + 2] - this.targetPremult[targetOffset + 2];
        const da = patch[patchOffset + 3] - this.targetPremult[targetOffset + 3];
        sse += dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;
        if (
          sse >= stopAt &&
          replacePartialSseCannotBeat(beforeSse, sse, denominator, incumbentGainMse)
        ) {
          this.diagnostics?.add('replaceAfterSseEarlyRejected');
          return sse;
        }
      }
    }
    return sse;
  }

  private copyPatchToCanvas(patch: Float32Array, bbox: BBox): void {
    const [left, top, right, bottom] = bbox;
    const patchWidth = right - left;
    for (let y = top; y < bottom; y += 1) {
      const patchOffset = pixelOffset(patchWidth, 0, y - top);
      const canvasOffset = pixelOffset(this.width, left, y);
      this.canvas.set(patch.subarray(patchOffset, patchOffset + patchWidth * 4), canvasOffset);
    }
  }

  tryPruneOnce(): boolean {
    return this.diagnostics
      ? this.diagnostics.measure('pruneReplace', () => this.tryPruneOnceCore())
      : this.tryPruneOnceCore();
  }

  private tryPruneOnceCore(): boolean {
    let active = this.activeIndices();
    if (!active.length) return false;
    const sampleSize = Math.max(1, Math.round(this.settings.pruneSampleSize));
    if (active.length > sampleSize) active = this.rng.shuffle(active).slice(0, sampleSize);
    active.sort((a, b) => this.tiles[a].gainMse - this.tiles[b].gainMse);

    for (const index of active) {
      const tile = this.tiles[index];
      const clipped = bboxClip(tile.bbox, this.width, this.height);
      if (!clipped) {
        tile.active = false;
        this.spatialIndex.remove(index);
        this.activeTileCount = Math.max(0, this.activeTileCount - 1);
        this.pruned += 1;
        this.diagnostics?.add('tilesPruned');
        return true;
      }
      const before = this.maskedSseFull(clipped);
      const afterPatch = this.renderPatchFromTiles(clipped, index);
      const after = this.maskedSsePatch(afterPatch, clipped);
      const deltaGlobal = (after - before) / Math.max(1, this.globalDen);
      if (deltaGlobal <= this.settings.tilePenaltyMse * this.settings.prunePenaltyFactor) {
        this.copyPatchToCanvas(afterPatch, clipped);
        tile.active = false;
        this.spatialIndex.remove(index);
        this.activeTileCount = Math.max(0, this.activeTileCount - 1);
        this.errors.updateBBox(clipped);
        this.markCanvasChanged();
        this.pruned += 1;
        this.diagnostics?.add('tilesPruned');
        return true;
      }
    }
    return false;
  }

  tryPrune(roundsCount: number): number {
    let count = 0;
    for (let i = 0; i < Math.max(1, Math.round(roundsCount)); i += 1) {
      if (!this.tryPruneOnce()) break;
      count += 1;
    }
    return count;
  }

  tryReplaceOnce(step: number, totalSteps: number): boolean {
    try {
      return this.diagnostics
        ? this.diagnostics.measure('pruneReplace', () => this.tryReplaceOnceCore(step, totalSteps))
        : this.tryReplaceOnceCore(step, totalSteps);
    } finally {
      this.releaseCandidateScratchImages();
    }
  }

  private tryReplaceOnceCore(step: number, totalSteps: number): boolean {
    const active = this.activeIndices();
    if (!active.length) return false;
    const tileIndex = active[this.rng.integer(0, active.length)];
    const old = this.tiles[tileIndex];
    const clipped = bboxClip(old.bbox, this.width, this.height);
    if (!clipped) return false;

    const target = this.focusGradientColor(old.centerX, old.centerY);
    const allScores = sourceChoiceScores(this.sources, target.color, this.memory, this.settings, target.std, this.sourceScoreScratch);
    const sourceIds = chooseSourceIds(
      this.sources,
      target.color,
      this.memory,
      this.rng,
      this.settings,
      target.std,
      Math.max(4, Math.floor(this.settings.colorTopk / 2)),
      Math.max(this.settings.exploration, 0.1),
      allScores,
      this.sourceIdScratch
    );
    if (!sourceIds.length) return false;

    this.fillCumulativeScores(sourceIds, allScores);
    const desiredPx = Math.max(4, old.bbox[2] - old.bbox[0], old.bbox[3] - old.bbox[1]);
    const progress = step / Math.max(1, totalSteps);
    const proposalOptions = {
      desiredPx,
      maxRenderedPx: this.settings.maxRenderedPx,
      rotationProb: Math.min(0.5, this.settings.rotationProb + 0.1),
      flipProb: this.settings.flipProb,
      centerJitterPx: Math.max(1, this.settings.errorCellSize * 0.1)
    };
    let bestSlot = -1;
    let proposalSlot = 0;
    let bestGainMse = this.settings.replaceMinGainMse;
    const globalDen = Math.max(1, this.globalDen);

    for (let i = 0; i < Math.max(1, Math.round(this.settings.replaceCandidateBatch)); i += 1) {
      const sourceId = sourceIds[this.rng.weightedIndexFromCumulative(this.cumulativeScoreScratch, sourceIds.length)];
      const candidate = proposeCandidate(
        this.sources,
        sourceId,
        old.centerX,
        old.centerY,
        this.width,
        this.height,
        progress,
        this.rng,
        this.cache,
        this.settings,
        proposalOptions,
        this.diagnostics,
        this.candidateScratch[proposalSlot]
      );
      if (!candidate) continue;
      this.candidateScratch[proposalSlot] = candidate;
      if (!this.candidateFitsPlacementFast(candidate)) continue;
      const union = bboxClip([
        Math.min(old.bbox[0], candidate.bbox[0]),
        Math.min(old.bbox[1], candidate.bbox[1]),
        Math.max(old.bbox[2], candidate.bbox[2]),
        Math.max(old.bbox[3], candidate.bbox[3])
      ], this.width, this.height);
      if (!union) continue;
      const beforeUnion = this.maskedSseFull(union);
      // Candidate unions can have different extents, so absolute after-SSE is
      // not comparable. To beat the incumbent global gain, this candidate's
      // final SSE must stay strictly below this union-specific threshold.
      const stopAt = beforeUnion - bestGainMse * globalDen;
      const afterPatch = this.renderPatchFromTiles(union, undefined, tileIndex, candidate);
      const afterUnion = this.maskedSsePatch(
        afterPatch,
        union,
        stopAt,
        beforeUnion,
        bestGainMse,
        globalDen
      );
      const gainMse = (beforeUnion - afterUnion) / globalDen;
      if (gainMse > bestGainMse) {
        candidate.sseBefore = beforeUnion;
        candidate.sseAfter = afterUnion;
        candidate.globalGainMse = gainMse;
        candidate.score = gainMse;
        bestSlot = proposalSlot;
        proposalSlot = 1 - bestSlot;
        bestGainMse = gainMse;
      }
    }

    const best = bestSlot >= 0 ? this.candidateScratch[bestSlot] : null;
    if (!best) return false;
    this.assertCandidateContained(best);

    const union = bboxClip([
      Math.min(old.bbox[0], best.bbox[0]),
      Math.min(old.bbox[1], best.bbox[1]),
      Math.max(old.bbox[2], best.bbox[2]),
      Math.max(old.bbox[3], best.bbox[3])
    ], this.width, this.height);
    if (!union) return false;
    const afterPatch = this.renderPatchFromTiles(union, undefined, tileIndex, best);
    this.copyPatchToCanvas(afterPatch, union);
    this.tiles[tileIndex] = this.recordFromCandidate(best);
    this.tiles[tileIndex].gainMse = best.globalGainMse;
    this.spatialIndex.update(tileIndex, best.bbox);
    this.errors.updateBBox(union);
    this.markCanvasChanged();
    this.replaced += 1;
    this.diagnostics?.add('tilesReplaced');
    this.memory.noteTrial(this.sources[best.sourceId].code, target.color, true, best.globalGainMse);
    return true;
  }

  recomputeErrors(): void {
    this.errors.recomputeAll();
  }
}
