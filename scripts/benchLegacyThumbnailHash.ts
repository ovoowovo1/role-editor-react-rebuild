import { strictEqual } from 'node:assert';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';
import { md5Hex } from '../src/lib/serialization/md5';

const [baseline, sampleArg = '120'] = process.argv.slice(2);
const samples = Number(sampleArg);
if (!baseline || !Number.isSafeInteger(samples) || samples < 1) {
  throw new Error('Usage: node --import tsx scripts/benchLegacyThumbnailHash.ts TRUSTED_V16_CHECKOUT [samples]');
}
const { md5Hex: previous } = await import(
  pathToFileURL(resolve(baseline, 'src/lib/serialization/md5.ts')).href
) as { md5Hex: typeof md5Hex };

function pngChunk(type: string, payload: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), payload]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, body, checksum]);
}

function thumbnail(noiseSide: number): string {
  // Generate a valid transparent RGBA PNG, with a smooth silhouette and a seeded
  // detailed patch to span realistic compressed sizes plus an upper stress case.
  const side = 256;
  const stride = 1 + side * 4;
  const raw = Buffer.alloc(side * stride);
  let seed = 0x96d402fc;
  function randomByte(): number {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed >>> 24;
  }
  const noiseFrom = Math.floor((side - noiseSide) * .5);
  const noiseTo = noiseFrom + noiseSide;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const offset = y * stride + 1 + x * 4;
      if (x >= noiseFrom && x < noiseTo && y >= noiseFrom && y < noiseTo) {
        for (let c = 0; c < 4; c++) raw[offset + c] = randomByte();
      } else if (((x - 128) / 76) ** 2 + ((y - 124) / 107) ** 2 < 1) {
        raw[offset] = 70 + Math.floor(y / 8);
        raw[offset + 1] = 120 + Math.floor(x / 8);
        raw[offset + 2] = 215;
        raw[offset + 3] = 255;
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0);
  header.writeUInt32BE(side, 4);
  header[8] = 8;
  header[9] = 6;
  return 'data:image/png;base64,' + Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))
  ]).toString('base64');
}

function check(input: string) {
  const expected = createHash('md5').update(input, 'utf8').digest('hex');
  strictEqual(previous(input), expected);
  strictEqual(md5Hex(input), expected);
}
const fixtures = [
  ['small', thumbnail(24)], ['detailed', thumbnail(128)], ['high-entropy stress', thumbnail(256)]
];
for (const [, dataUrl] of fixtures) check(dataUrl);
for (const text of ['', 'abc', '中文與 emoji 🎨', '孤立代理 \ud800x\udc00', 'a\u0000b', 'café']) check(text);
for (let size = 0; size <= 260; size++) {
  check('p'.repeat(size));
  check('x'.repeat(size) + '🎨');
}
function stats(input: number[]) {
  const sorted = [...input].sort((a, b) => a - b);
  return { medianMs: +sorted[Math.ceil(sorted.length * .5) - 1].toFixed(4),
    p95Ms: +sorted[Math.ceil(sorted.length * .95) - 1].toFixed(4) };
}

let checksum = 0;
for (const [fixture, dataUrl] of fixtures) {
  const before: number[] = [], after: number[] = [];
  function sample(hash: typeof md5Hex) {
    const start = performance.now();
    const result = hash(dataUrl);
    const elapsed = performance.now() - start;
    checksum += result.charCodeAt(0);
    return elapsed;
  }
  for (let i = -24; i < samples; i++) {
    const forward = i % 2 === 0;
    const first = sample(forward ? previous : md5Hex);
    const second = sample(forward ? md5Hex : previous);
    if (i >= 0) {
      before.push(forward ? first : second);
      after.push(forward ? second : first);
    }
  }
  console.log(JSON.stringify({ fixture, pngBytes: Buffer.from(dataUrl.slice(22), 'base64').length,
    dataUrlLength: dataUrl.length, v16: stats(before), current: stats(after) }));
}
console.log({ node: process.version, samples, exactNodeCryptoParity: 531, checksum });
