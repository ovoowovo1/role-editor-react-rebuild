/**
 * Build-time generator: parses public/assets/gaf/*.gaf into lightweight metadata
 * and a separately loaded runtime manifest under src/generated/.
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
  extractGafRuntime,
  flattenActorFrames,
  flattenDecorationFrames,
  readPngDimensions,
  validateAtlasAgainstPng
} from './lib/gafManifestExtract.mjs';
import { splitGafManifestPayload } from './lib/gafManifestPayload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const GAFDIR = path.join(root, 'public', 'assets', 'gaf');
const FALLBACK = path.join(root, 'scripts', 'gafManifest.fallback.json');
const METADATA_OUT = path.join(root, 'src', 'generated', 'gafManifest.json');
const RUNTIME_OUT = path.join(root, 'src', 'generated', 'gafRuntimeManifest.json');

const DEC_GAF = path.join(GAFDIR, 'decorations.gaf');
const ACT_GAF = path.join(GAFDIR, 'twactor.gaf');
const ASSETS_GAF = path.join(GAFDIR, 'twassests.gaf');
const DEC_PNG = path.join(GAFDIR, 'decorations.png');
const ACT_PNG = path.join(GAFDIR, 'twactor.png');
const ASSETS_PNG = path.join(GAFDIR, 'twassests.png');

function copyFallback(reason) {
  if (!fs.existsSync(FALLBACK)) {
    throw new Error(`[generate:gaf] ${reason} and ${path.relative(root, FALLBACK)} is missing — run node scripts/extractFallbackFromLegacyTs.mjs`);
  }
  writeGeneratedManifests(JSON.parse(fs.readFileSync(FALLBACK, 'utf8')));
  console.warn(`[generate:gaf] ${reason}`);
  console.warn(`[generate:gaf] Using fallback → ${path.relative(root, METADATA_OUT)}`);
}

function writeIfChanged(filePath, contents) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === contents) {
    return false;
  }
  fs.writeFileSync(filePath, contents);
  return true;
}

function writeGeneratedManifests(payload) {
  const { metadata, runtime } = splitGafManifestPayload(payload);
  fs.mkdirSync(path.dirname(METADATA_OUT), { recursive: true });
  const metadataChanged = writeIfChanged(METADATA_OUT, `${JSON.stringify(metadata, null, 2)}\n`);
  const runtimeChanged = writeIfChanged(RUNTIME_OUT, `${JSON.stringify(runtime)}\n`);
  const actions = [
    `${metadataChanged ? 'Wrote' : 'Unchanged'} ${path.relative(root, METADATA_OUT)}`,
    `${runtimeChanged ? 'Wrote' : 'Unchanged'} ${path.relative(root, RUNTIME_OUT)}`
  ];
  console.log(`[generate:gaf] ${actions.join('; ')} (${metadata.decorationGafSymbols.length} deco symbols)`);
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

  if (!fs.existsSync(DEC_GAF) || !fs.existsSync(ACT_GAF) || !fs.existsSync(ASSETS_GAF)) {
    copyFallback(
      `Missing ${path.relative(root, DEC_GAF)}, ${path.relative(root, ACT_GAF)}, or ${path.relative(root, ASSETS_GAF)}`
    );
    return;
  }

  const decBuf = await loadGafPayload(DEC_GAF, 'decorations.gaf');
  const actBuf = await loadGafPayload(ACT_GAF, 'twactor.gaf');
  const assetsBuf = await loadGafPayload(ASSETS_GAF, 'twassests.gaf');

  const decParsed = parseGafBinary(decBuf, 'decorations');
  const actParsed = parseGafBinary(actBuf, 'twactor');
  const assetsParsed = parseGafBinary(assetsBuf, 'twassests');

  const deco = extractDecorationSlice(decParsed);
  const actor = extractActorSlice(actParsed);
  const { decorationRuntime } = extractDecorationRuntime(decParsed);
  const { actorRuntime } = extractActorRuntime(actParsed, actor.actorAtlasFrameData);
  const assetsRuntime = extractGafRuntime(assetsParsed);

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

  if (fs.existsSync(ASSETS_PNG)) {
    const dims = readPngDimensions(fs.readFileSync(ASSETS_PNG));
    validateAtlasAgainstPng(
      'twassests.png',
      Object.values(assetsRuntime.elements).map((el) => ({
        x: el.region.x,
        y: el.region.y,
        width: el.region.width,
        height: el.region.height
      })),
      dims
    );
  } else {
    console.warn(`[generate:gaf] Optional ${path.relative(root, ASSETS_PNG)} not found - skipping PNG bounds check`);
  }

  const payload = {
    schemaVersion: 2,
    source: 'parsed',
    assetManifest: {
      decorations: '/assets/gaf/decorations.gaf',
      actor: '/assets/gaf/twactor.gaf',
      assets: '/assets/gaf/twassests.gaf',
      decorationsTexture: '/assets/gaf/decorations.png',
      actorTexture: '/assets/gaf/twactor.png',
      assetsTexture: '/assets/gaf/twassests.png',
      decorationsTextureName: 'decorations.png',
      actorTextureName: 'twactor.png',
      assetsTextureName: 'twassests.png'
    },
    decorationGafSymbols: deco.decorationGafSymbols,
    decorationAtlasFrameData: deco.decorationAtlasFrameData,
    decorationRuntime,
    assetsRuntime,
    actorAtlasFrameData: actor.actorAtlasFrameData,
    actorFallbackFrameCounts: actor.actorFallbackFrameCounts,
    actorRuntime
  };

  writeGeneratedManifests(payload);
}

main().catch((err) => {
  console.error('[generate:gaf] Failed:', err);
  process.exit(1);
});
