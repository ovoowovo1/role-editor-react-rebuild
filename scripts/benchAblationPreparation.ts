import { deepStrictEqual } from 'node:assert';
import { performance } from 'node:perf_hooks';
import { HEAD_LAYER_ID } from '../src/constants/layers';
import { collectAtlasTextureUrlsForRole } from '../src/lib/runtime/atlasTextureAvailability';
import { normalizeImportedRole } from '../src/lib/serialization/roleSerializationImport';
import { createDefaultRole, partOptions } from '../src/mock/options';
import type { DecorationLayer } from '../src/types/role';

const modes = 6;
const warmups = 8;
const samples = 40;
const requestedLayers = process.argv.slice(2);
const layerCounts = requestedLayers.length ? requestedLayers.map(Number) : [1_000, 5_000];
if (layerCounts.some((count) => !Number.isSafeInteger(count) || count < 1)) {
  throw new Error('Pass positive integer layer counts as separate arguments, for example 1000 5000.');
}

function fixtures(count: number) {
  const defaultRole = createDefaultRole('royal', 'female');
  const atlasOptions = partOptions.deco.filter((part) => part.atlas && part.code).slice(0, 8);
  if (!atlasOptions.length) throw new Error('Benchmark fixture requires a decoration atlas symbol.');
  const decorations: DecorationLayer[] = Array.from({ length: count }, (_, index) => {
    const option = atlasOptions[index % atlasOptions.length];
    const unknown = index % 19 === 0;
    return {
      id: `bench-ablation-${index}`,
      code: unknown ? 'bench-unknown-deco' : option.code,
      assetId: unknown ? 'bench-unknown-deco' : option.id,
      name: `Fixture ${index}`,
      x: index % 61 - 30,
      y: Math.floor(index / 61) % 61 - 30,
      scaleX: index % 7 === 0 ? -0.25 : 0.25,
      scaleY: index % 5 === 0 ? -0.5 : 0.25,
      rotation: index % 360,
      visible: index % 11 !== 0,
      opacity: index % 13 === 0 ? 0.5 : 1
    };
  });
  const headLayer = {
    ...defaultRole.headLayer,
    x: 5, y: -7, scaleX: 0.75, scaleY: -0.8, rotation: 27, opacity: 0.8
  };
  const headLayerIndex = Math.floor(count / 2);
  const groupIds = [decorations[0].id, HEAD_LAYER_ID];
  const modern = {
    ...defaultRole,
    updatedAt: '2026-01-01T00:00:00.000Z',
    name: 'Ablation benchmark fixture',
    decorations,
    headLayer,
    headLayerIndex,
    groups: [{
      id: 'benchmark-group', name: 'Fixture group', visible: true, collapsed: false,
      itemIds: groupIds, members: groupIds.map((id) => ({ type: 'layer', id }))
    }]
  };
  const legacyDecos = decorations.map((item) => ({
    id: item.id, c: item.code, x: item.x, y: item.y, sx: item.scaleX, sy: item.scaleY,
    r: item.rotation * Math.PI / 180, visible: item.visible, opacity: item.opacity
  }));
  legacyDecos.splice(headLayerIndex, 0, {
    id: HEAD_LAYER_ID, c: 'head', x: headLayer.x, y: headLayer.y, sx: headLayer.scaleX,
    sy: headLayer.scaleY, r: headLayer.rotation * Math.PI / 180, visible: true, opacity: headLayer.opacity
  });
  const legacy = {
    data: {
      dr: 5,
      cr: {
        head: { f: 1, s: 0.75 }, hand: { f: 2, s: 1.15 },
        foot: { f: 1, s: 0.8 }, cape: { f: 1, s: 1.2 },
        deco: legacyDecos.reverse()
      }
    },
    decoGroups: [{ id: 'benchmark-group', itemIds: groupIds }]
  };
  return { modern, legacy };
}

// CPU portion only: neither the atlas image probe/load nor Pixi is invoked.
function prepare(payload: unknown) {
  const { role, warnings } = normalizeImportedRole(payload);
  return { role, warnings, atlasUrls: collectAtlasTextureUrlsForRole(role) };
}

function comparable(prepared: ReturnType<typeof prepare>) {
  // The fixtures provide IDs for all layers/groups. Only updatedAt is generated
  // by normalization and irrelevant to rendering; compare everything else.
  const { updatedAt: _timestamp, ...role } = prepared.role;
  return { ...prepared, role };
}

function independentlyPrepare(payload: unknown) {
  return Array.from({ length: modes }, () => prepare(payload));
}

function sharedPreparation(payload: unknown) {
  const single = prepare(payload);
  return Array.from({ length: modes }, () => single);
}

function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (percentile: number) => Number(sorted[Math.ceil(percentile * sorted.length) - 1].toFixed(3));
  return { medianMs: at(0.5), p95Ms: at(0.95) };
}

function measure(payload: unknown) {
  const previous = independentlyPrepare(payload);
  const shared = sharedPreparation(payload);
  for (let index = 0; index < modes; index += 1) {
    deepStrictEqual(comparable(shared[index]), comparable(previous[index]));
  }
  for (let run = 0; run < warmups; run += 1) {
    independentlyPrepare(payload);
    sharedPreparation(payload);
  }
  const oldTimes: number[] = [];
  const newTimes: number[] = [];
  const time = (fn: (value: unknown) => unknown, values: number[]) => {
    const start = performance.now();
    fn(payload);
    values.push(performance.now() - start);
  };
  for (let run = 0; run < samples; run += 1) {
    if (run % 2 === 0) {
      time(independentlyPrepare, oldTimes);
      time(sharedPreparation, newTimes);
    } else {
      time(sharedPreparation, newTimes);
      time(independentlyPrepare, oldTimes);
    }
  }
  return {
    parity: 'normalized role excluding updatedAt, warnings, and ordered atlas URLs match for all six modes',
    distinctAtlasUrls: shared[0].atlasUrls.length,
    repeated: { normalizations: modes, atlasCollections: modes, ...summary(oldTimes) },
    shared: { normalizations: 1, atlasCollections: 1, ...summary(newTimes) }
  };
}

const results = layerCounts.flatMap((layers) =>
  Object.entries(fixtures(layers)).map(([format, payload]) => ({ layers, format, ...measure(payload) }))
);
console.log(JSON.stringify({ node: process.version, warmups, samples, results }, null, 2));
