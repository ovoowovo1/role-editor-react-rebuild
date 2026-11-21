import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');
const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const batchHtml = fs.readFileSync(path.join(distDir, 'batch-render.html'), 'utf8');
const assetNames = fs.readdirSync(assetsDir);

function fail(message) {
  throw new Error(`[bundle-boundary] ${message}`);
}

function matchingAsset(prefix, suffix = '.js') {
  const matches = assetNames.filter((name) => name.startsWith(prefix) && name.endsWith(suffix));
  if (matches.length !== 1) fail(`Expected one ${prefix}*${suffix} asset, found ${matches.length}.`);
  return matches[0];
}

function assetBytes(name) {
  return fs.readFileSync(path.join(assetsDir, name));
}

const metadataName = matchingAsset('gaf-metadata-');
const runtimeName = matchingAsset('gaf-runtime-');
const weaponName = matchingAsset('gafWeaponRuntimeManifest-', '.json');
const pixiName = matchingAsset('pixi-vendor-');
const chartName = matchingAsset('chart-vendor-');
const batchName = matchingAsset('batchRender-');
const reactName = matchingAsset('react-vendor-');
const extraName = matchingAsset('ExtraPanel-');
const codecName = matchingAsset('codec-vendor-');
const importWorkerName = matchingAsset('roleImportWorker-');
const metadataSize = assetBytes(metadataName).length;
const runtimeBytes = assetBytes(runtimeName);
const runtimeSize = runtimeBytes.length;
const runtimeGzip = gzipSync(runtimeBytes).length;
const weaponBytes = assetBytes(weaponName);
const weaponGzip = gzipSync(weaponBytes).length;
if (html.includes(weaponName) || batchHtml.includes(weaponName)) {
  fail('The editor and batch HTML must not link or preload optional weapon runtime data.');
}
const chartSize = assetBytes(chartName).length;
const extraGzip = gzipSync(assetBytes(extraName)).length;
const codecGzip = gzipSync(assetBytes(codecName)).length;
const importWorkerSize = assetBytes(importWorkerName).length;
if (metadataSize > 250_000) fail(`GAF metadata grew to ${metadataSize} bytes (budget: 250000).`);
if (runtimeSize > 3_500_000) fail(`GAF runtime grew to ${runtimeSize} bytes (budget: 3500000).`);
if (runtimeGzip > 700_000) fail(`GAF runtime grew to ${runtimeGzip} gzipped bytes (budget: 700000).`);
if (importWorkerSize > 500_000) fail(`Role import worker grew to ${importWorkerSize} bytes (budget: 500000).`);

function htmlJsNames(page) {
  const urls = [...page.matchAll(/(?:src|href)\s*=\s*["']([^"']+\.js(?:\?[^"']*)?)["']/g)];
  return [...new Set(urls.map((match) => path.basename(new URL(match[1], 'https://bundle.local/').pathname)))]
    .filter((name) => assetNames.includes(name));
}

const initialAssetNames = htmlJsNames(html);
const batchAssets = htmlJsNames(batchHtml);
if (!batchAssets.includes(batchName)) fail('batch-render.html must load the dedicated renderer entry.');
if (batchAssets.includes(reactName) || batchAssets.includes(matchingAsset('index-')) ||
    batchAssets.includes(chartName) || batchAssets.includes(extraName)) {
  fail('batch-render.html must not load the React editor or its tool UI.');
}
if (/rel=["']stylesheet["']|fonts\.googleapis|id=["']root["']/.test(batchHtml)) {
  fail('batch-render.html must not include the editor shell, icon font, or stylesheet.');
}
if (initialAssetNames.includes(batchName)) fail('index.html must not preload the batch renderer.');
const batchGzip = batchAssets.reduce((total, asset) => total + gzipSync(assetBytes(asset)).length, 0);
if (!initialAssetNames.length) fail('Expected at least one initial JavaScript asset in index.html.');
if (initialAssetNames.includes(runtimeName)) fail('index.html must not preload the GAF runtime chunk.');
if (initialAssetNames.includes(pixiName)) fail('index.html must not preload Pixi before the lazy stage boundary.');
if (initialAssetNames.includes(codecName)) fail('index.html must not preload gzip codecs before file actions.');
if (initialAssetNames.includes(extraName)) fail('index.html must not preload the Extra tools before opening the Extra tab.');
if (initialAssetNames.includes(chartName)) fail('index.html must not preload Chart.js before the Auto Create boundary.');
const initialAssets = initialAssetNames.map(assetBytes);
const initialRaw = initialAssets.reduce((total, bytes) => total + bytes.length, 0);
const initialGzip = initialAssets.reduce((total, bytes) => total + gzipSync(bytes).length, 0);
if (initialRaw > 1_000_000) fail(`Initial JS grew to ${initialRaw} bytes (budget: 1000000).`);
if (initialGzip > 300_000) fail(`Initial gzipped JS grew to ${initialGzip} bytes (budget: 300000).`);

console.log(
  `[bundle-boundary] initial=${initialRaw}B raw/${initialGzip}B gzip; ` +
  `batch=${batchGzip}B gzip; metadata=${metadataSize}B; importWorker=${importWorkerSize}B; ` +
  `extra=${extraGzip}B gzip lazy; codec=${codecGzip}B gzip lazy; chart=${chartSize}B lazy; runtime=${runtimeSize}B raw/${runtimeGzip}B gzip lazy; ` +
  `weapon=${weaponBytes.length}B raw/${weaponGzip}B gzip on demand`
);
