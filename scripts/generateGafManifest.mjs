/**
 * Build-time generator: parses public/assets/gaf/*.gaf into src/generated/gafManifest.json.
 * Falls back to scripts/gafManifest.fallback.json when binaries are missing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { parseGafBinary } from './lib/gafBinParser.mjs';
import {
  extractActorRuntime,
  extractActorSlice,
  extractDecorationRuntime,
  extractDecorationSlice,
  flattenActorFrames,
  flattenDecorationFrames,
  readPngDimensions,
  validateAtlasAgainstPng
} from './lib/gafManifestExtract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const GAFDIR = path.join(root, 'public', 'assets', 'gaf');
const FALLBACK = path.join(root, 'scripts', 'gafManifest.fallback.json');
const OUT = path.join(root, 'src', 'generated', 'gafManifest.json');

const DEC_GAF = path.join(GAFDIR, 'decorations.gaf');
const ACT_GAF = path.join(GAFDIR, 'twactor.gaf');
const DEC_PNG = path.join(GAFDIR, 'decorations.png');
const ACT_PNG = path.join(GAFDIR, 'twactor.png');

function copyFallback(reason) {
  if (!fs.existsSync(FALLBACK)) {
    throw new Error(`[generate:gaf] ${reason} and ${path.relative(root, FALLBACK)} is missing — run node scripts/extractFallbackFromLegacyTs.mjs`);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.copyFileSync(FALLBACK, OUT);
  console.warn(`[generate:gaf] ${reason}`);
  console.warn(`[generate:gaf] Using fallback → ${path.relative(root, OUT)}`);
}

/** @returns {Promise<Buffer>} */
async function loadGafPayload(absPath, label) {
  const buf = fs.readFileSync(absPath);
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
    const zip = await JSZip.loadAsync(buf);
    /** @type {string[]} */
    const names = [];
    zip.forEach((relPath, entry) => {
      if (!entry.dir) names.push(relPath);
    });

    const binNames = names.filter((n) => /\.bin$/i.test(n));
    const candidates = binNames.length ? binNames : names.filter((n) => !/\.(png|jpe?g|gif|webp|txt|md)$/i.test(n));

    let best = /** @type {Buffer | null} */ (null);
    let bestLen = 0;
    for (const n of candidates) {
      const zf = zip.file(n);
      if (!zf) continue;
      const chunk = await zf.async('nodebuffer');
      if (chunk.length > bestLen && chunk.length > 32) {
        bestLen = chunk.length;
        best = chunk;
      }
    }

    if (!best) {
      throw new Error(`[generate:gaf] ZIP container ${label} has no readable config blob`);
    }
    return best;
  }
  return buf;
}

async function main() {
  if (process.env.SKIP_GAF_GENERATE === '1') {
    copyFallback('SKIP_GAF_GENERATE=1');
    return;
  }

  if (!fs.existsSync(DEC_GAF) || !fs.existsSync(ACT_GAF)) {
    copyFallback(`Missing ${path.relative(root, DEC_GAF)} or ${path.relative(root, ACT_GAF)}`);
    return;
  }

  const decBuf = await loadGafPayload(DEC_GAF, 'decorations.gaf');
  const actBuf = await loadGafPayload(ACT_GAF, 'twactor.gaf');

  const decParsed = parseGafBinary(decBuf, 'decorations');
  const actParsed = parseGafBinary(actBuf, 'twactor');

  const deco = extractDecorationSlice(decParsed);
  const actor = extractActorSlice(actParsed);
  const { decorationRuntime } = extractDecorationRuntime(decParsed);
  const { actorRuntime } = extractActorRuntime(actParsed, actor.actorAtlasFrameData);

  if (fs.existsSync(DEC_PNG)) {
    const dims = readPngDimensions(fs.readFileSync(DEC_PNG));
    validateAtlasAgainstPng('decorations.png', flattenDecorationFrames(deco.decorationAtlasFrameData), dims);
  } else {
    console.warn(`[generate:gaf] Optional ${path.relative(root, DEC_PNG)} not found — skipping PNG bounds check`);
  }

  if (fs.existsSync(ACT_PNG)) {
    const dims = readPngDimensions(fs.readFileSync(ACT_PNG));
    validateAtlasAgainstPng('twactor.png', flattenActorFrames(actor.actorAtlasFrameData), dims);
  } else {
    console.warn(`[generate:gaf] Optional ${path.relative(root, ACT_PNG)} not found — skipping PNG bounds check`);
  }

  const payload = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    source: 'parsed',
    assetManifest: {
      decorations: '/assets/gaf/decorations.gaf',
      actor: '/assets/gaf/twactor.gaf',
      decorationsTexture: '/assets/gaf/decorations.png',
      actorTexture: '/assets/gaf/twactor.png',
      decorationsTextureName: 'decorations.png',
      actorTextureName: 'twactor.png'
    },
    decorationGafSymbols: deco.decorationGafSymbols,
    decorationAtlasFrameData: deco.decorationAtlasFrameData,
    decorationRuntime,
    actorAtlasFrameData: actor.actorAtlasFrameData,
    actorFallbackFrameCounts: actor.actorFallbackFrameCounts,
    actorRuntime
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[generate:gaf] Wrote ${path.relative(root, OUT)} (${payload.decorationGafSymbols.length} deco symbols)`);
}

main().catch((err) => {
  console.error('[generate:gaf] Failed:', err);
  process.exit(1);
});
