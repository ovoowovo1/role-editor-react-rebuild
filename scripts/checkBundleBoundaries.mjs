import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');
const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const assetNames = fs.readdirSync(assetsDir);

function fail(message) {
  throw new Error(`[bundle-boundary] ${message}`);
}

function matchingAsset(prefix) {
  const matches = assetNames.filter((name) => name.startsWith(prefix) && name.endsWith('.js'));
  if (matches.length !== 1) fail(`Expected one ${prefix}*.js asset, found ${matches.length}.`);
  return matches[0];
}

function assetBytes(name) {
  return fs.readFileSync(path.join(assetsDir, name));
}

const metadataName = matchingAsset('gaf-metadata-');
const runtimeName = matchingAsset('gaf-runtime-');
const pixiName = matchingAsset('pixi-vendor-');
const chartName = matchingAsset('chart-vendor-');
const importWorkerName = matchingAsset('roleImportWorker-');
const metadataSize = assetBytes(metadataName).length;
const runtimeSize = assetBytes(runtimeName).length;
const chartSize = assetBytes(chartName).length;
const importWorkerSize = assetBytes(importWorkerName).length;
if (metadataSize > 250_000) fail(`GAF metadata grew to ${metadataSize} bytes (budget: 250000).`);
if (runtimeSize > 7_000_000) fail(`GAF runtime grew to ${runtimeSize} bytes (budget: 7000000).`);
if (importWorkerSize > 500_000) fail(`Role import worker grew to ${importWorkerSize} bytes (budget: 500000).`);

const initialAssetNames = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+\.js(?:\?[^"']*)?)["']/g)]
  .map((match) => path.basename(new URL(match[1], 'https://bundle.local/').pathname))
  .filter((name) => assetNames.includes(name));
if (!initialAssetNames.length) fail('Expected at least one initial JavaScript asset in index.html.');
if (initialAssetNames.includes(runtimeName)) fail('index.html must not preload the GAF runtime chunk.');
if (initialAssetNames.includes(pixiName)) fail('index.html must not preload Pixi before the lazy stage boundary.');
if (initialAssetNames.includes(chartName)) fail('index.html must not preload Chart.js before the Auto Create boundary.');
const initialAssets = initialAssetNames.map(assetBytes);
const initialRaw = initialAssets.reduce((total, bytes) => total + bytes.length, 0);
const initialGzip = initialAssets.reduce((total, bytes) => total + gzipSync(bytes).length, 0);
if (initialRaw > 1_000_000) fail(`Initial JS grew to ${initialRaw} bytes (budget: 1000000).`);
if (initialGzip > 300_000) fail(`Initial gzipped JS grew to ${initialGzip} bytes (budget: 300000).`);

console.log(
  `[bundle-boundary] initial=${initialRaw}B raw/${initialGzip}B gzip; ` +
  `metadata=${metadataSize}B; importWorker=${importWorkerSize}B; ` +
  `chart=${chartSize}B lazy; runtime=${runtimeSize}B lazy`
);
