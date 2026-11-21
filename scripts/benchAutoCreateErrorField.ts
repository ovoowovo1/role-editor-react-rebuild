import { deepStrictEqual, strictEqual } from 'node:assert';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { ErrorField, SeededRandom } from '../src/lib/conversion/auto-create-twrole/numericCore';
import { erodeContainmentMask } from '../src/lib/conversion/auto-create-twrole/containment';
import { premultiply } from '../src/lib/conversion/auto-create-twrole/sourcePipeline';

const [baseline, sampleArg = '24'] = process.argv.slice(2);
const samples = Number(sampleArg);
if (!baseline || !Number.isSafeInteger(samples) || samples < 1) {
  throw new Error('Usage: node --import tsx scripts/benchAutoCreateErrorField.ts TRUSTED_V20_CHECKOUT [samples]');
}
const old = await import(pathToFileURL(resolve(baseline, 'src/lib/conversion/auto-create-twrole/numericCore.ts')).href) as typeof import('../src/lib/conversion/auto-create-twrole/numericCore');

function input(size: number, kind: 'dense' | 'sparse' | 'tiny') {
  const disks = kind === 'dense' ? [[.5,.5,.48]]
    : kind === 'sparse' ? [[.2,.2,.11],[.75,.75,.15],[.2,.7,.12],[.72,.26,.1]]
    : [[.5,.5,.11]];
  const mask = Uint8Array.from({length: size * size}, (_, i) => {
    const x = (i % size) / size, y = Math.floor(i / size) / size;
    return Number(disks.some(([cx, cy, r]) => (x-cx)**2 + (y-cy)**2 <= r*r));
  });
  const focus = erodeContainmentMask(mask, size, size, 1);
  const straight = new Uint8ClampedArray(size * size * 4);
  let seed = 0x296fd1;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    for (let channel = 0; channel < 4; channel++) {
      seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
      straight[i * 4 + channel] = channel === 3 ? 192 + (seed >>> 26) : seed >>> 24;
    }
  }
  const target = premultiply(straight);
  const canvas = new Float32Array(target.length);
  return { mask, focus, target, straight, canvas };
}
function summary(values: number[]) {
  const sorted = [...values].sort((a,b) => a-b);
  return { medianMs: +sorted[Math.ceil(sorted.length * .5) - 1].toFixed(4),
    p95Ms: +sorted[Math.ceil(sorted.length * .95) - 1].toFixed(4) };
}

let checksum = 0, focusChoices = 0;
for (const [size, kind] of [
  [7,'tiny'], [128,'dense'], [128,'sparse'], [512,'dense'], [512,'sparse'], [1024,'dense'], [1024,'sparse']
] as const) {
  const fixture = input(size, kind);
  const { mask, focus, target, straight, canvas } = fixture;
  function make(Ctor: typeof ErrorField, render = canvas, focusMask = focus) {
    return new Ctor(render, target, straight, mask, size, size, 16, focusMask);
  }
  function compare(a: ErrorField, b: ErrorField, seed: number) {
    for (const key of ['errorMap','cellW','cellColor','cellMaskCount','cell','gw','gh','totalSse','focusSse'] as const) {
      deepStrictEqual(b[key], a[key], key);
    }
    deepStrictEqual(b.focusSseUpperBound([0, 0, size / 2, size / 2]), a.focusSseUpperBound([0, 0, size / 2, size / 2]));
    const x = new old.SeededRandom(seed), y = new SeededRandom(seed);
    for (let i = 0; i < 512; i++) {
      deepStrictEqual(b.chooseFocus(y), a.chooseFocus(x));
      focusChoices++;
    }
  }
  const editableCanvas = canvas.slice();
  const a = make(old.ErrorField, editableCanvas), b = make(ErrorField, editableCanvas);
  compare(a, b, 838812);
  const half = Math.floor(size * .5);
  const bbox = [0, 0, half, half] as const;
  for (let y = 0; y < half; y++) for (let x = 0; x < half; x++) {
    const index = (y * size + x) * 4;
    editableCanvas.set(target.subarray(index, index + 4), index);
  }
  a.updateBBox([...bbox]); b.updateBBox([...bbox]);
  compare(a, b, 7721);
  compare(make(old.ErrorField, target), make(ErrorField, target), 4054); // zero score fallback
  compare(make(old.ErrorField, canvas, mask), make(ErrorField, canvas, mask), 88801);
  strictEqual(canvas.some(Boolean), false);
  const repetitions = size < 20 ? 200 : size <= 128 ? 8 : 1;
  function time(Ctor: typeof ErrorField) {
    const start = performance.now();
    for (let i = 0; i < repetitions; i++) checksum += make(Ctor).totalSse;
    return (performance.now() - start) / repetitions;
  }
  const before: number[] = [], after: number[] = [];
  for (let i = -8; i < samples; i++) {
    const forward = i % 2 === 0;
    const first = time(forward ? old.ErrorField : ErrorField);
    const second = time(forward ? ErrorField : old.ErrorField);
    if (i >= 0) { before.push(forward ? first : second); after.push(forward ? second : first); }
  }
  console.log(JSON.stringify({ size, kind, pixels: mask.reduce((sum, x) => sum + x, 0),
    focusPixels: focus.reduce((sum, x) => sum + x, 0), v20: summary(before), current: summary(after) }));
}
console.log({node: process.version, samples, exactFocusChoices: focusChoices, checksum});
