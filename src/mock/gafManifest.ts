/**
 * Atlas URLs come from `assetManifest` inside `src/generated/gafManifest.json`.
 * Regenerate via `npm run generate:gaf` (parses `public/assets/gaf/*.gaf` when present).
 */

import type { GafAtlasFrame as GafAtlasFrameType } from '../types/role';
import type { GafRuntimeManifest as GafRuntimeManifestType } from '../types/gafRuntime';
import generatedManifest from '../generated/gafManifest.json';

export type GafAtlasFrame = GafAtlasFrameType;
export type GafRuntimeManifest = GafRuntimeManifestType;
export type ActorGafRuntimeManifest = GafRuntimeManifest;

export interface GafAssetManifest {
  decorations: string;
  actor: string;
  decorationsTexture: string;
  actorTexture: string;
  decorationsTextureName: string;
  actorTextureName: string;
}

interface GeneratedGafManifest {
  schemaVersion: number;
  assetManifest: GafAssetManifest;
  decorationGafSymbols: string[];
  decorationAtlasFrameData: Record<string, GafAtlasFrameData>;
  actorAtlasFrameData: Record<string, GafAtlasFrameData[]>;
  actorFallbackFrameCounts: {
    head: number;
    hand: number;
    foot: number;
    cape: number;
  };
  /** Present when built from decorations.gaf (schema >= 2); optional in scripts/gafManifest.fallback.json */
  decorationRuntime?: GafRuntimeManifest;
  /** Present when built from twactor.gaf (schema >= 2); optional in scripts/gafManifest.fallback.json */
  actorRuntime?: GafRuntimeManifest;
}

type GafAtlasFrameData = Omit<GafAtlasFrame, 'texture'>;

const manifest = generatedManifest as unknown as GeneratedGafManifest;

export const defaultGafAssetManifest: GafAssetManifest = manifest.assetManifest;

export function defineGafSources(manifestArg: GafAssetManifest = defaultGafAssetManifest): GafAssetManifest {
  return { ...manifestArg };
}

export const gafSources = defineGafSources(defaultGafAssetManifest);

function withTexture(frame: GafAtlasFrameData, texture: string): GafAtlasFrame {
  return { ...frame, texture };
}

function withTextureMap(frames: Record<string, GafAtlasFrameData>, texture: string): Record<string, GafAtlasFrame> {
  return Object.fromEntries(Object.entries(frames).map(([key, frame]) => [key, withTexture(frame, texture)]));
}

function withTextureLists(
  frames: Record<string, GafAtlasFrameData[]>,
  texture: string
): Record<string, GafAtlasFrame[]> {
  return Object.fromEntries(
    Object.entries(frames).map(([key, list]) => [key, list.map((frame) => withTexture(frame, texture))])
  );
}

export const decorationGafSymbols = manifest.decorationGafSymbols;

const decorationAtlasFrameData = manifest.decorationAtlasFrameData;
const actorAtlasFrameData = manifest.actorAtlasFrameData;

export const decorationAtlasFrames: Record<string, GafAtlasFrame> = withTextureMap(
  decorationAtlasFrameData,
  gafSources.decorationsTexture
);
export const actorAtlasFrames: Record<string, GafAtlasFrame[]> = withTextureLists(
  actorAtlasFrameData,
  gafSources.actorTexture
);

export const actorFallbackFrameCounts = manifest.actorFallbackFrameCounts;

export const decorationRuntimeManifest: GafRuntimeManifest | undefined = manifest.decorationRuntime;
export const actorRuntimeManifest: GafRuntimeManifest | undefined = manifest.actorRuntime;
