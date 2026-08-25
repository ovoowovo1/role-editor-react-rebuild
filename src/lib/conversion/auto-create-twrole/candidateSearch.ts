import type { DecorationLayer } from '../../../types/role';
import { createId, round } from '../../math';
import {
  DEFAULT_GRADIENT_COMPLEXITY_THRESHOLD,
  DEFAULT_ROLE_EXPORT_MAX_SIDE,
  type AutoCreateTwroleSettings
} from './contracts';
import type { BBox, Candidate, DecoDraft, SourceTile, Vec3 } from './internalTypes';
import { AutoCreateDiagnosticsCollector } from './diagnostics';
import { SeededRandom } from './numericCore';
import { clamp } from './platform';
import { ExperienceMemory } from './experienceMemory';
import { VariantCache, variantGeometry } from './variantCache';

export function targetCenterCoords(px: number, py: number, width: number, height: number): { x: number; y: number } {
  return { x: px - width / 2, y: py - height / 2 };
}

export function roleExportScaleForTarget(width: number, height: number): number {
  const maxSide = Math.max(1, width, height);
  return Math.min(1, DEFAULT_ROLE_EXPORT_MAX_SIDE / maxSide);
}

export function canonicalCandidateTransform(
  source: SourceTile,
  sxInternal: number,
  syInternal: number,
  rDeg: number,
  targetWidth: number,
  targetHeight: number
): { sxInternal: number; syInternal: number; rDeg: number } {
  const roleScale = roleExportScaleForTarget(targetWidth, targetHeight);
  const scaleDenominator = Math.max(1.0e-12, source.sFactor * roleScale);
  return {
    sxInternal: round(sxInternal * source.sFactor * roleScale, 4) / scaleDenominator,
    syInternal: round(syInternal * source.sFactor * roleScale, 4) / scaleDenominator,
    rDeg: round(rDeg, 3)
  };
}

export function rolePositionForVisualCenter(
  source: SourceTile,
  desiredX: number,
  desiredY: number,
  scaleX: number,
  scaleY: number,
  rDeg: number
): { x: number; y: number } {
  const rad = (rDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const offsetX = source.localCenterX * scaleX;
  const offsetY = source.localCenterY * scaleY;
  return {
    x: desiredX - (offsetX * cos - offsetY * sin),
    y: desiredY - (offsetX * sin + offsetY * cos)
  };
}

export function buildDecoDraft(source: SourceTile, centerX: number, centerY: number, sxInternal: number, syInternal: number, rDeg: number, width: number, height: number): DecoDraft {
  const roleScale = roleExportScaleForTarget(width, height);
  const rawScaleX = sxInternal * source.sFactor * roleScale;
  const rawScaleY = syInternal * source.sFactor * roleScale;
  const scaleX = round(rawScaleX, 4);
  const scaleY = round(rawScaleY, 4);
  const desired = targetCenterCoords(centerX, centerY, width, height);
  const desiredRoleX = desired.x * roleScale;
  const desiredRoleY = desired.y * roleScale;
  const { x, y } = rolePositionForVisualCenter(source, desiredRoleX, desiredRoleY, rawScaleX, rawScaleY, rDeg);
  // Keep enough position precision that the exported layer maps back to the
  // same raster center used by the preview. Two decimals can shift a 512px
  // target by a visible fraction of a pixel after role-space scaling.
  const roleX = round(x, 6);
  const roleY = round(y, 6);
  const rotation = round(rDeg, 3);
  return {
    code: source.code,
    assetId: source.assetId,
    name: source.label,
    x: roleX,
    y: roleY,
    scaleX,
    scaleY,
    rotation,
    legacy: {
      c: source.code,
      x: roleX,
      y: roleY,
      sx: scaleX,
      sy: scaleY,
      r: round((rDeg * Math.PI) / 180, 6)
    }
  };
}

/**
 * Converts a canonical AutoCreate draft to an editor layer. AutoCreate runs
 * pass a deterministic id so checkpoints can reproduce the complete result;
 * other callers retain the historical time/random id fallback.
 */
export function decorationFromDraft(draft: DecoDraft, deterministicId?: string): DecorationLayer {
  return {
    id: deterministicId ?? createId('deco'),
    code: draft.code,
    assetId: draft.assetId,
    name: draft.name,
    x: draft.x,
    y: draft.y,
    scaleX: draft.scaleX,
    scaleY: draft.scaleY,
    rotation: draft.rotation,
    visible: true,
    opacity: 1
  };
}

export function sourceChoiceScores(
  sources: readonly SourceTile[],
  targetColor: Vec3,
  memory: ExperienceMemory,
  settings: AutoCreateTwroleSettings,
  targetStd?: Vec3,
  output: Float64Array = new Float64Array(sources.length)
): Float64Array {
  const sigmaDen = Math.max(1, 2 * settings.colorSigma * settings.colorSigma);
  const stdDen = Math.max(1, 2 * settings.gradientStdSigma * settings.gradientStdSigma);
  const complexity = targetStd ? Math.hypot(targetStd[0], targetStd[1], targetStd[2]) : 0;
  const mix = clamp(complexity / Math.max(1, DEFAULT_GRADIENT_COMPLEXITY_THRESHOLD * 3), 0, 1);
  const stdWeight = clamp(settings.gradientStdWeight * mix, 0, 1);
  const colorBin = memory.colorBin(targetColor);

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    const dr = source.meanRgb[0] - targetColor[0];
    const dg = source.meanRgb[1] - targetColor[1];
    const db = source.meanRgb[2] - targetColor[2];
    let base = Math.exp(-(dr * dr + dg * dg + db * db) / sigmaDen);

    if (targetStd && stdWeight > 0) {
      const sr = source.stdRgb[0] - targetStd[0];
      const sg = source.stdRgb[1] - targetStd[1];
      const sb = source.stdRgb[2] - targetStd[2];
      const stdScore = Math.exp(-(sr * sr + sg * sg + sb * sb) / stdDen);
      base *= (1 - stdWeight) + stdWeight * stdScore;
    }

    const alphaBonus = 0.7 + 0.6 * Math.min(1, source.alphaRatio * 2);
    const memoryBonus = memory.sourceMultiplierForBin(source.code, colorBin);
    output[index] = Math.max(1.0e-9, base * alphaBonus * memoryBonus);
  }
  return output;
}

export function stableTopKIndices(
  scores: ArrayLike<number>,
  topk: number,
  output: number[] = []
): number[] {
  const limit = Math.max(0, Math.min(scores.length, Math.round(topk)));
  output.length = 0;
  if (limit === 0) return output;

  for (let index = 0; index < scores.length; index += 1) {
    let insertAt = output.length;
    while (insertAt > 0) {
      const previous = output[insertAt - 1];
      const scoreDelta = scores[index] - scores[previous];
      if (scoreDelta < 0 || (scoreDelta === 0 && index > previous)) break;
      insertAt -= 1;
    }
    if (insertAt >= limit) continue;
    const previousLength = output.length;
    if (previousLength < limit) output.push(index);
    for (let move = Math.min(previousLength, limit - 1); move > insertAt; move -= 1) {
      output[move] = output[move - 1];
    }
    output[insertAt] = index;
  }

  return output;
}

export function chooseSourceIds(
  sources: readonly SourceTile[],
  targetColor: Vec3,
  memory: ExperienceMemory,
  rng: SeededRandom,
  settings: AutoCreateTwroleSettings,
  targetStd?: Vec3,
  topkOverride?: number,
  explorationOverride?: number,
  scoresOverride?: ArrayLike<number>,
  output: number[] = []
): number[] {
  const n = sources.length;
  output.length = 0;
  if (n <= 0) return output;
  const topk = clamp(Math.round(topkOverride ?? settings.colorTopk), 1, n);
  const exploration = explorationOverride ?? settings.exploration;

  if (rng.next() < exploration) {
    for (let index = 0; index < n; index += 1) output.push(index);
    rng.shuffle(output);
    output.length = topk;
    return output;
  }

  const scores = scoresOverride ?? sourceChoiceScores(sources, targetColor, memory, settings, targetStd);
  return stableTopKIndices(scores, topk, output);
}

export function autoMaxRenderedPx(width: number, height: number): number {
  return Math.max(32, Math.min(160, Math.round(Math.min(width, height) * 0.18)));
}

export interface CandidateProposalOptions {
  desiredPx?: number;
  maxRenderedPx?: number;
  rotationProb?: number;
  flipProb?: number;
  centerJitterPx?: number;
  acceptGeometry?: (bbox: BBox) => boolean;
  proposalIndex?: number;
  cheapUpperBound?: (bbox: BBox) => number;
  exploration?: boolean;
}

/**
 * A candidate whose transform and bounds are known, but whose RGBA pixels have
 * not been rasterized yet.
 */
export interface CandidateDescriptor {
  /** Index into the source array used to create this descriptor. */
  sourceIndex: number;
  /** Stable source identifier copied to the materialized Candidate. */
  sourceId: number;
  sxInternal: number;
  syInternal: number;
  rDeg: number;
  centerX: number;
  centerY: number;
  bbox: BBox;
  /** Stable generation order used for deterministic exact-score tie breaking. */
  proposalIndex: number;
  /** Conservative quality ceiling; never used as a final acceptance score. */
  cheapUpperBound: number;
  exploration: boolean;
  featureVector?: Float32Array;
  predictedValidityLogit?: number;
  predictedMargin?: number;
  predictedScore?: number;
  /**
   * Continuous rotations are intentionally kept out of the shared variant
   * cache until a winning candidate is promoted.
   */
  cacheVariant: boolean;
}

export function proposeCandidateDescriptor(
  sources: readonly SourceTile[],
  sourceId: number,
  centerX: number,
  centerY: number,
  targetWidth: number,
  targetHeight: number,
  progress: number,
  rng: SeededRandom,
  settings: AutoCreateTwroleSettings,
  options: CandidateProposalOptions = {},
  diagnostics: AutoCreateDiagnosticsCollector | null = null
): CandidateDescriptor | null {
  diagnostics?.add('candidatesProposed');
  diagnostics?.add('descriptorsProposed');
  const source = sources[sourceId];
  const maxPx = options.maxRenderedPx && options.maxRenderedPx > 0 ? options.maxRenderedPx : autoMaxRenderedPx(targetWidth, targetHeight);
  const minPx = Math.max(2, Math.round(settings.minRenderedPx));
  let sizePx: number;

  if (options.desiredPx == null) {
    const minDim = Math.max(1, Math.min(targetWidth, targetHeight));
    const early = Math.min(maxPx, Math.max(18, minDim * 0.13));
    const late = Math.max(minPx, Math.min(24, minDim * 0.035));
    const base = early * (1 - progress) ** 0.75 + late * progress ** 0.75;
    sizePx = base * Math.exp(rng.normal(0, 0.5));
  } else {
    sizePx = options.desiredPx * Math.exp(rng.normal(0, 0.22));
  }

  sizePx = clamp(sizePx, minPx, maxPx);
  const maxOrig = Math.max(1, source.origW, source.origH);
  let finalScale = sizePx / maxOrig;
  finalScale = clamp(finalScale, minPx / maxOrig, 2);

  const flipProb = options.flipProb ?? settings.flipProb;
  const sxSign = rng.next() < flipProb ? -1 : 1;
  const sySign = rng.next() < flipProb ? -1 : 1;
  const aspectJitter = Math.exp(rng.normal(0, 0.06));
  const finalSx = sxSign * finalScale;
  const finalSy = sySign * finalScale * aspectJitter;
  let sxInternal = finalSx / source.sFactor;
  let syInternal = finalSy / source.sFactor;

  let rDeg = 0;
  let cacheVariant = true;
  const rotationProb = options.rotationProb ?? settings.rotationProb;
  if (rng.next() < rotationProb && sizePx >= Math.max(8, settings.minRenderedPx * 2)) {
    if (rng.next() < 0.65) {
      rDeg = rng.choice([0, 15, -15, 30, -30, 45, -45, 60, -60, 90, -90, 135, -135, 180]);
    } else {
      rDeg = rng.uniform(-180, 180);
      // Continuous rotations are effectively unique. Rendering them into the
      // shared LRU would evict reusable discrete variants; the winner is
      // promoted by ColorLearningCollage when it is accepted.
      cacheVariant = false;
    }
  }

  // Rasterize the exact scale/rotation precision that is exported. This keeps
  // candidate containment, the Worker preview, legacy JSON and the editor
  // layer on one canonical transform.
  const canonical = canonicalCandidateTransform(
    source,
    sxInternal,
    syInternal,
    rDeg,
    targetWidth,
    targetHeight
  );
  sxInternal = canonical.sxInternal;
  syInternal = canonical.syInternal;
  rDeg = canonical.rDeg;
  if (sxInternal === 0 || syInternal === 0) {
    diagnostics?.add('candidatesGeometryRejected');
    return null;
  }

  const jitter = Math.max(0, options.centerJitterPx ?? 0);
  if (jitter > 0) {
    centerX = Math.round(centerX + rng.normal(0, jitter));
    centerY = Math.round(centerY + rng.normal(0, jitter));
  }
  centerX = clamp(centerX, 0, Math.max(0, targetWidth - 1));
  centerY = clamp(centerY, 0, Math.max(0, targetHeight - 1));

  const geometry = variantGeometry(source, sxInternal, syInternal, rDeg);
  if (geometry.width > targetWidth * 1.5 || geometry.height > targetHeight * 1.5) {
    diagnostics?.add('candidatesGeometryRejected');
    return null;
  }

  const left = Math.round(centerX - geometry.width / 2);
  const top = Math.round(centerY - geometry.height / 2);
  const right = left + geometry.width;
  const bottom = top + geometry.height;

  const rasterCenterX = left + geometry.width / 2;
  const rasterCenterY = top + geometry.height / 2;

  const bbox: BBox = [left, top, right, bottom];
  if (options.acceptGeometry && !options.acceptGeometry(bbox)) {
    diagnostics?.add('candidatesGeometryScoreRejected');
    return null;
  }

  return {
    sourceIndex: sourceId,
    sourceId: source.idx,
    sxInternal,
    syInternal,
    rDeg,
    centerX: rasterCenterX,
    centerY: rasterCenterY,
    bbox,
    proposalIndex: Math.max(0, Math.round(options.proposalIndex ?? 0)),
    cheapUpperBound: options.cheapUpperBound?.(bbox) ?? Number.POSITIVE_INFINITY,
    exploration: options.exploration === true,
    cacheVariant
  };
}

export function materializeCandidate(
  sources: readonly SourceTile[],
  descriptor: CandidateDescriptor,
  cache: VariantCache,
  diagnostics: AutoCreateDiagnosticsCollector | null = null,
  reuse: Candidate | null = null
): Candidate {
  const source = sources[descriptor.sourceIndex];
  diagnostics?.add('candidateMaterializations');
  const materialize = () => cache.get(
      source,
      descriptor.sxInternal,
      descriptor.syInternal,
      descriptor.rDeg,
      descriptor.cacheVariant
    );
  const rgba = diagnostics
    ? diagnostics.measure('candidateMaterialization', materialize)
    : materialize();
  if (reuse) {
    reuse.sourceId = descriptor.sourceId;
    reuse.sxInternal = descriptor.sxInternal;
    reuse.syInternal = descriptor.syInternal;
    reuse.rDeg = descriptor.rDeg;
    reuse.centerX = descriptor.centerX;
    reuse.centerY = descriptor.centerY;
    reuse.rgba = rgba;
    reuse.bbox[0] = descriptor.bbox[0];
    reuse.bbox[1] = descriptor.bbox[1];
    reuse.bbox[2] = descriptor.bbox[2];
    reuse.bbox[3] = descriptor.bbox[3];
    reuse.sseBefore = 0;
    reuse.sseAfter = 0;
    reuse.globalGainMse = -1.0e30;
    reuse.score = -1.0e30;
    return reuse;
  }

  diagnostics?.add('candidateObjectsAllocated');
  return {
    sourceId: descriptor.sourceId,
    sxInternal: descriptor.sxInternal,
    syInternal: descriptor.syInternal,
    rDeg: descriptor.rDeg,
    centerX: descriptor.centerX,
    centerY: descriptor.centerY,
    rgba,
    bbox: descriptor.bbox,
    sseBefore: 0,
    sseAfter: 0,
    globalGainMse: -1.0e30,
    score: -1.0e30
  };
}

export function proposeCandidate(
  sources: readonly SourceTile[],
  sourceId: number,
  centerX: number,
  centerY: number,
  targetWidth: number,
  targetHeight: number,
  progress: number,
  rng: SeededRandom,
  cache: VariantCache,
  settings: AutoCreateTwroleSettings,
  options: CandidateProposalOptions = {},
  diagnostics: AutoCreateDiagnosticsCollector | null = null,
  reuse: Candidate | null = null
): Candidate | null {
  const descriptor = proposeCandidateDescriptor(
    sources,
    sourceId,
    centerX,
    centerY,
    targetWidth,
    targetHeight,
    progress,
    rng,
    settings,
    options,
    diagnostics
  );
  return descriptor == null
    ? null
    : materializeCandidate(sources, descriptor, cache, diagnostics, reuse);
}
