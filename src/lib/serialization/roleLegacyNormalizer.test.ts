import { describe, expect, it } from 'vitest';
import { partOptions } from '../../mock/options';
import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationLayer } from '../../types/role';
import { asArray, asRecord, readProperty } from './rawInput';
import { convertLegacyRole, normalizeLegacyDecorations } from './roleLegacyNormalizer';
import { defaultHeadLayer, isHeadDecoCode, normalizeHeadLayerIndex, rotationRadiansForExport } from './roleSerializationLegacy';
import { normalizeDecoration, readHeadLayer } from './roleSchemaV1';

// Frozen pre-optimization two-pass logic. Plain legacy role rows carry
// explicit IDs in this oracle so the comparison isn't affected by random IDs.
function previousNormalize(rawList: unknown, fallbackHeadScale = 1): ReturnType<typeof normalizeLegacyDecorations> {
  const list = asArray(rawList);
  const decorationsBottomToTop: DecorationLayer[] = [];
  const originalIndexToId: Array<string | null> = [];
  let headOriginalIndex = -1;
  let headLayer = defaultHeadLayer(fallbackHeadScale);

  list.forEach((item, originalIndex) => {
    const raw = asRecord(item);
    const code = readProperty(raw, 'code') ?? readProperty(raw, 'c') ?? readProperty(raw, 'assetId');
    if (!code) {
      originalIndexToId[originalIndex] = null;
      return;
    }
    if (isHeadDecoCode(code)) {
      headOriginalIndex = originalIndex;
      headLayer = readHeadLayer(raw, fallbackHeadScale);
      originalIndexToId[originalIndex] = null;
      return;
    }
    const decoration = normalizeDecoration(raw, decorationsBottomToTop.length);
    decorationsBottomToTop.push(decoration);
    originalIndexToId[originalIndex] = decoration.id;
  });

  const decorations = decorationsBottomToTop.slice().reverse();
  const nonHeadAbove = headOriginalIndex >= 0
    ? list.slice(headOriginalIndex + 1).filter((item) => {
      const raw = asRecord(item);
      const code = readProperty(raw, 'code') ?? readProperty(raw, 'c') ?? readProperty(raw, 'assetId');
      return Boolean(code) && !isHeadDecoCode(code);
    }).length
    : 0;
  const headLayerIndex = headOriginalIndex >= 0
    ? normalizeHeadLayerIndex(nonHeadAbove, decorations.length, decorations.length)
    : decorations.length;
  return { decorations, originalIndexToId, headLayerIndex, headLayer };
}

const sprite = partOptions.deco[0];

describe('single-pass legacy role decoration normalization', () => {
  it('matches the previous pass for sparse and malformed rows, alias precedence, and last-head transforms', () => {
    const rows: unknown[] = [];
    rows[1] = { c: sprite.code, id: 'bottom', r: -0.13 };
    rows[2] = { c: 'head', x: 100 };
    rows[4] = null;
    rows[6] = { code: null, c: null, assetId: sprite.id, id: 'middle' };
    rows[7] = { code: '', c: sprite.code, id: 'blocked-alias' };
    rows[8] = { code: 'HeAd', sx: -0.027, sy: 0.044, r: 0.89, x: 12, opacity: 0.72, visible: false };
    rows[9] = { code: 'foreign-deco', c: 'head', id: 'missing', sx: -0.01, sy: 0.02 };
    rows[11] = { code: sprite.code, id: 'top', name: 'explicit name', r: -0.3 };
    rows.length = 14;

    const old = previousNormalize(rows, 2);
    const result = normalizeLegacyDecorations(rows, 2);
    expect(result).toEqual(old);
    expect(result.headLayerIndex).toBe(2);
    expect(result.headLayer).toMatchObject({ x: 12, opacity: 0.72, visible: false });
    expect(result.decorations.map((deco) => deco.id)).toEqual(['top', 'missing', 'middle', 'bottom']);
    expect(result.decorations[1].assetId).toBe('deco:missing:foreign-deco');
    expect(rotationRadiansForExport(result.decorations[0])).toBe(-0.3);
    expect(Object.keys(result.originalIndexToId)).toEqual(['1', '2', '4', '6', '7', '8', '9', '11']);
    expect(result.originalIndexToId[4]).toBeNull();
    expect(result.originalIndexToId[3]).toBeUndefined();
    expect(rows[1]).toMatchObject({ id: 'bottom' });
  });

  it('keeps original pre-reversal ordinals under randomized first, last, multiple, and absent heads', () => {
    let seed = 0x23aa645;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed >>> 25;
    };
    for (let iteration = 0; iteration < 80; iteration++) {
      const input: unknown[] = [];
      for (let i = 0; i < 40; i++) {
        switch (rand() % 7) {
          case 0: continue;
          case 1: input[i] = 42; break;
          case 2: input[i] = { code: false, c: sprite.code }; break;
          case 3: input[i] = { c: '__head__', x: i }; break;
          case 4: input[i] = { assetId: sprite.id, id: `sprite-${i}` }; break;
          case 5: input[i] = { c: sprite.code, id: `c-sprite-${i}` }; break;
          case 6: input[i] = { code: 'missing', id: `missing-${i}` }; break;
        }
      }
      if (iteration % 4 === 0) input.unshift({ c: 'actor_head', x: 999 });
      if (iteration % 4 === 1) input.push({ c: 'head', x: 123 });
      if (iteration % 4 === 2) {
        for (let i = 0; i < input.length; i++) {
          if (asRecord(input[i])?.c === '__head__') input[i] = null;
        }
      }
      const expected = previousNormalize(input, 0.6);
      const actual = normalizeLegacyDecorations(input, 0.6);
      expect(actual, `iteration ${iteration}`).toEqual(expected);
      expect(Object.keys(actual.originalIndexToId)).toEqual(Object.keys(expected.originalIndexToId));
    }
  });

  it('preserves explicit and legacy-index nested group references around the last head', () => {
    const result = convertLegacyRole({
      customRoleConfig: {
        deco: [
          { id: 'bottom', c: sprite.code },
          { c: 'head', x: -1 },
          { id: 'middle', c: sprite.code },
          { c: 'HEAD', x: 50 },
          { id: 'top', c: sprite.code }
        ]
      },
      decoGroups: [
        { id: 'child', members: [{ type: 'layer', itemIndex: 0 }, { type: 'layer', itemIndex: 1 }] },
        { id: 'parent', members: [
          { type: 'group', id: 'child' },
          { type: 'layer', itemIndex: 2 },
          { type: 'layer', id: 'top' }
        ] }
      ]
    });

    expect(result.headLayerIndex).toBe(1);
    expect(result.headLayer.x).toBe(50);
    expect(result.groups.map(({ id, members }) => ({ id, members }))).toEqual([
      { id: 'child', members: [{ type: 'layer', id: 'bottom' }, { type: 'layer', id: 'middle' }] },
      { id: 'parent', members: [
        { type: 'group', id: 'child' },
        { type: 'layer', id: HEAD_LAYER_ID },
        { type: 'layer', id: 'top' }
      ] }
    ]);
  });
});
