import { DEFAULT_POSITION_RANGE } from '../../../constants/editor';
import type { DecorationLayer, PartOption } from '../../../types/role';

export const ALPHA_MSE_WEIGHT = 1.0;
export const INV_255 = 1 / 255;
export const ALPHA_THRESH_DEFAULT = 10;
export const DEFAULT_MAX_TILE_SIZE = 40;
export const DEFAULT_CELL_SIZE = 16;
export const DEFAULT_CANDIDATE_BATCH = 96;
export const DEFAULT_COLOR_TOPK = 24;
export const DEFAULT_TILE_PENALTY_MSE = 2.5e-4;
// Retained in AutoCreateTwroleSettings for API compatibility. The production
// engine now enforces strict alpha containment and treats this as zero.
export const DEFAULT_MAX_OUTSIDE_ALPHA_RATIO = 0.0;
export const DEFAULT_GRADIENT_LOCAL_RADIUS = 12;
export const DEFAULT_GRADIENT_PIXEL_MIX = 0.72;
export const DEFAULT_GRADIENT_STD_SIGMA = 44.0;
export const DEFAULT_GRADIENT_STD_WEIGHT = 0.42;
export const DEFAULT_GRADIENT_COMPLEXITY_THRESHOLD = 18.0;
export const DEFAULT_GRADIENT_ORIGINAL_MAX_PX = 12;
export const MEMORY_VERSION = 1;
export const AUTO_CREATE_SNAPSHOT_VERSION = 4;
export const DEFAULT_ROLE_EXPORT_MAX_SIDE = DEFAULT_POSITION_RANGE * 2;
export const DEFAULT_MEMORY_NAME = 'experience_color_memory.json';
export const AUTO_CREATE_EXPERIENCE_STORAGE_PREFIX = 'auto-create-twrole:';

export interface AutoCreateTwroleSettings {
  // These names mirror the Python worker CLI. The React panel only exposes the
  // same controls as gui_app.py: --tiles, --tile-budget, --log-every,
  // and the preview checkbox that maps to --export-every.
  tiles: number;
  tileBudget: number;
  seed: number;
  logEvery: number;
  exportEvery: number;
  maxTileSize: number;
  alphaThresh: number;
  errorCellSize: number;
  candidateBatch: number;
  replaceCandidateBatch: number;
  colorTopk: number;
  colorSigma: number;
  exploration: number;
  tilePenaltyMse: number;
  maxOutsideAlphaRatio: number;
  gradientLocalRadius: number;
  gradientPixelMix: number;
  gradientStdSigma: number;
  gradientStdWeight: number;
  gradientComplexityThreshold: number;
  gradientOriginalMaxPx: number;
  minRenderedPx: number;
  maxRenderedPx: number;
  rotationProb: number;
  flipProb: number;
  removeEvery: number;
  replaceEvery: number;
  pruneRounds: number;
  pruneSampleSize: number;
  prunePenaltyFactor: number;
  replaceMinGainMse: number;
  finalPruneRounds: number;
  fullErrorRecomputeEvery: number;
  variantCacheItems: number;
  experienceJson: string;
  resetExperience: boolean;
}

export const DEFAULT_AUTO_CREATE_TWROLE_SETTINGS: AutoCreateTwroleSettings = {
  // gui_app.py defaults for the user-visible controls.
  tiles: 4000,
  tileBudget: 3000,
  seed: 0,
  logEvery: 1000,
  exportEvery: 1000,

  // reversible_collage_system_hotcachev2_fast_exact.py defaults for the worker.
  maxTileSize: DEFAULT_MAX_TILE_SIZE,
  alphaThresh: ALPHA_THRESH_DEFAULT,
  errorCellSize: DEFAULT_CELL_SIZE,
  candidateBatch: DEFAULT_CANDIDATE_BATCH,
  replaceCandidateBatch: 32,
  colorTopk: DEFAULT_COLOR_TOPK,
  colorSigma: 54,
  exploration: 0.12,
  tilePenaltyMse: DEFAULT_TILE_PENALTY_MSE,
  maxOutsideAlphaRatio: DEFAULT_MAX_OUTSIDE_ALPHA_RATIO,
  gradientLocalRadius: DEFAULT_GRADIENT_LOCAL_RADIUS,
  gradientPixelMix: DEFAULT_GRADIENT_PIXEL_MIX,
  gradientStdSigma: DEFAULT_GRADIENT_STD_SIGMA,
  gradientStdWeight: DEFAULT_GRADIENT_STD_WEIGHT,
  gradientComplexityThreshold: DEFAULT_GRADIENT_COMPLEXITY_THRESHOLD,
  gradientOriginalMaxPx: DEFAULT_GRADIENT_ORIGINAL_MAX_PX,
  minRenderedPx: 4,
  maxRenderedPx: 0,
  rotationProb: 0.22,
  flipProb: 0.04,
  removeEvery: 200,
  replaceEvery: 350,
  pruneRounds: 1,
  pruneSampleSize: 18,
  prunePenaltyFactor: 1.15,
  replaceMinGainMse: 1.0e-7,
  finalPruneRounds: 200,
  fullErrorRecomputeEvery: 1000,
  variantCacheItems: 8192,
  experienceJson: DEFAULT_MEMORY_NAME,
  resetExperience: false
};

const SNAPSHOT_SETTINGS_POLICY_VERSION = 1;
const SNAPSHOT_ALGORITHM_SETTING_KEYS = [
  'tiles',
  'tileBudget',
  'maxTileSize',
  'alphaThresh',
  'errorCellSize',
  'candidateBatch',
  'replaceCandidateBatch',
  'colorTopk',
  'colorSigma',
  'exploration',
  'tilePenaltyMse',
  'maxOutsideAlphaRatio',
  'gradientLocalRadius',
  'gradientPixelMix',
  'gradientStdSigma',
  'gradientStdWeight',
  'gradientComplexityThreshold',
  'gradientOriginalMaxPx',
  'minRenderedPx',
  'maxRenderedPx',
  'rotationProb',
  'flipProb',
  'removeEvery',
  'replaceEvery',
  'pruneRounds',
  'pruneSampleSize',
  'prunePenaltyFactor',
  'replaceMinGainMse',
  'finalPruneRounds',
  'fullErrorRecomputeEvery',
  'variantCacheItems'
] as const satisfies readonly (keyof AutoCreateTwroleSettings)[];

/**
 * Identifies every setting that can change the generated sequence after a
 * checkpoint. Observer-only cadence and the captured RNG/experience identity
 * are intentionally excluded.
 */
export function autoCreateSnapshotSettingsSignature(settings: AutoCreateTwroleSettings): string {
  const payload = JSON.stringify(SNAPSHOT_ALGORITHM_SETTING_KEYS.map((key) => {
    const value = settings[key];
    return [key, typeof value === 'number' && !Number.isFinite(value) ? String(value) : value];
  }));
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < payload.length; index += 1) {
    const code = payload.charCodeAt(index);
    hashA = Math.imul(hashA ^ code, 0x01000193);
    hashB = Math.imul(hashB ^ code, 0x85ebca6b);
    hashB ^= hashB >>> 13;
  }
  return `${SNAPSHOT_SETTINGS_POLICY_VERSION}:${payload.length}:${(hashA >>> 0).toString(16)}:${(hashB >>> 0).toString(16)}`;
}

export type AutoCreateTwroleProgressStage = 'sources' | 'run' | 'final';

export interface AutoCreateTwroleProgress {
  stage: AutoCreateTwroleProgressStage;
  step: number;
  total: number;
  mse: number;
  active: number;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  message?: string;
}

export interface AutoCreateTwroleLegacyDecoEntry {
  c: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  r: number;
}

export interface AutoCreateTwroleResult {
  decorations: DecorationLayer[];
  exportJson: { deco: AutoCreateTwroleLegacyDecoEntry[] };
  previewDataUrl: string;
  targetWidth: number;
  targetHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceCount: number;
  insertScale: number;
  mse: number;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  warnings: string[];
}

export interface AutoCreateTwroleSnapshotTile {
  active: boolean;
  sourceId: number;
  sxInternal: number;
  syInternal: number;
  rDeg: number;
  centerX: number;
  centerY: number;
  bbox: [left: number, top: number, right: number, bottom: number];
  decoration: DecorationLayer;
  legacy: AutoCreateTwroleLegacyDecoEntry;
  gainMse: number;
}

export interface AutoCreateTwroleSnapshot {
  version: number;
  targetWidth: number;
  targetHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceCount: number;
  sourceSignature: string;
  /** v4 identity of the exact target RGBA, containment and focus policy. */
  targetSignature?: string;
  /** v4 identity of every setting that can alter the remaining search. */
  settingsSignature: string;
  /** Serialized adaptive source/color statistics required for deterministic resume. */
  experienceState: string;
  step: number;
  totalSteps: number;
  /** Number of final-prune rounds already completed; required for v4 deterministic resume. */
  finalPruneStep: number;
  seed: number;
  rngState: number;
  rngSpareNormal: number | null;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  mse: number;
  tiles: AutoCreateTwroleSnapshotTile[];
  warnings: string[];
}

export interface AutoCreateTwroleCheckpoint {
  progress: AutoCreateTwroleProgress;
  result: AutoCreateTwroleResult;
  snapshot: AutoCreateTwroleSnapshot;
}

export interface AutoCreateTwroleStoppedResult {
  result: AutoCreateTwroleResult;
  checkpoint: AutoCreateTwroleCheckpoint;
}

export class AutoCreateTwroleStoppedError extends Error {
  readonly result: AutoCreateTwroleResult;
  readonly checkpoint: AutoCreateTwroleCheckpoint;

  constructor(stopped: AutoCreateTwroleStoppedResult) {
    super('AutoCreateTwrole was stopped.');
    this.name = 'AutoCreateTwroleStoppedError';
    this.result = stopped.result;
    this.checkpoint = stopped.checkpoint;
  }
}

export function isAutoCreateTwroleStoppedError(error: unknown): error is AutoCreateTwroleStoppedError {
  return error instanceof AutoCreateTwroleStoppedError;
}

export interface RunAutoCreateTwroleOptions {
  targetFile: File;
  decoOptions: PartOption[];
  settings?: Partial<AutoCreateTwroleSettings>;
  resumeSnapshot?: AutoCreateTwroleSnapshot | null;
  signal?: AbortSignal;
  onProgress?: (progress: AutoCreateTwroleProgress) => void;
  onCheckpoint?: (checkpoint: AutoCreateTwroleCheckpoint) => void;
}
