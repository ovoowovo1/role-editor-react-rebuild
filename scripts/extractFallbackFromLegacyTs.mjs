/**
 * One-shot helper: reads legacy inline atlas blocks from src/mock/gafManifest.ts and writes
 * scripts/gafManifest.fallback.json (used when public/assets/gaf binaries are absent).
 *
 * Requires a legacy `src/mock/gafManifest.ts` that still embeds `decorationGafSymbols` + atlas maps.
 * The default repo uses `src/generated/gafManifest.json` instead; only run this when refreshing
 * `scripts/gafManifest.fallback.json`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/** Strip trailing commas so TS-looking collections become JSON.parse-safe */
function stripTrailingCommas(raw) {
  return raw.replace(/,\s*([\]}])/g, '$1');
}

function extractBalanced(ts, marker, openChar, closeChar) {
  const idx = ts.indexOf(marker);
  if (idx < 0) throw new Error(`Missing marker: ${marker}`);
  let i = idx + marker.length;
  while (i < ts.length && /\s/.test(ts[i])) i += 1;
  if (ts[i] !== openChar) throw new Error(`Expected "${openChar}" after marker: ${marker}`);
  let depth = 0;
  let inStr = false;
  let esc = false;
  const start = i;
  for (; i < ts.length; i += 1) {
    const c = ts[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === openChar) depth += 1;
    if (c === closeChar) {
      depth -= 1;
      if (depth === 0) return ts.slice(start, i + 1);
    }
  }
  throw new Error(`Unbalanced ${openChar}${closeChar} for marker: ${marker}`);
}

function extractBalancedObject(ts, marker) {
  return extractBalanced(ts, marker, '{', '}');
}

function extractSymbols(ts) {
  const raw = extractBalanced(ts, 'export const decorationGafSymbols = ', '[', ']');
  return JSON.parse(stripTrailingCommas(raw));
}

function extractFallbackCounts(ts) {
  const raw = extractBalanced(ts, 'export const actorFallbackFrameCounts = ', '{', '}');
  return JSON.parse(stripTrailingCommas(raw));
}

function main() {
  const tsPath = path.join(root, 'src', 'mock', 'gafManifest.ts');
  const ts = fs.readFileSync(tsPath, 'utf8');

  const decoObjRaw = extractBalancedObject(ts, 'const decorationAtlasFrameData: Record<string, GafAtlasFrameData> = ');
  const actorObjRaw = extractBalancedObject(ts, 'const actorAtlasFrameData: Record<string, GafAtlasFrameData[]> = ');

  const payload = {
    schemaVersion: 1,
    source: 'legacy-ts-extract',
    assetManifest: {
      decorations: '/assets/gaf/decorations.gaf',
      actor: '/assets/gaf/twactor.gaf',
      decorationsTexture: '/assets/gaf/decorations.png',
      actorTexture: '/assets/gaf/twactor.png',
      decorationsTextureName: 'decorations.png',
      actorTextureName: 'twactor.png'
    },
    decorationGafSymbols: extractSymbols(ts),
    decorationAtlasFrameData: JSON.parse(stripTrailingCommas(decoObjRaw)),
    actorAtlasFrameData: JSON.parse(stripTrailingCommas(actorObjRaw)),
    actorFallbackFrameCounts: extractFallbackCounts(ts)
  };

  const outPath = path.join(root, 'scripts', 'gafManifest.fallback.json');
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, outPath)}`);
}

main();
