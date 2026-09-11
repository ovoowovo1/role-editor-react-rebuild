import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { makeDecorationLayer } from '../../test/roleFixtures';
import { decorationSelectionIndex, orderedIndexedDecorations, retainEqualArray, stableIndexedSelectionIds, validIndexedLayerIds } from './editorSelectionIndex';

describe('selection index', () => {
  const layers = Array.from({ length: 20 }, (_, i) => makeDecorationLayer(String(i)));
  it('reuses membership and ordering through transforms, but rebuilds for reorder, add and remove', () => {
    const index = decorationSelectionIndex(layers);
    const moved = layers.map(layer => ({ ...layer, x: 10 }));
    expect(decorationSelectionIndex(moved, index)).toBe(index);
    for (const changed of [[...layers].reverse(), layers.slice(1), [...layers, makeDecorationLayer('new')]]) {
      expect(decorationSelectionIndex(changed, index)).not.toBe(index);
    }
    expect(orderedIndexedDecorations(moved, index, ['2', '0', '2', 'missing', HEAD_LAYER_ID])).toEqual([moved[0], moved[2]]);
  });

  it('keeps valid head selection, first fallback semantics and document ordering for select-all', () => {
    const index = decorationSelectionIndex(layers);
    expect(validIndexedLayerIds(index, [HEAD_LAYER_ID, 'missing', '0'])).toEqual([HEAD_LAYER_ID, '0']);
    expect(stableIndexedSelectionIds(index, [], false, ['0'])).toEqual([]);
    expect(stableIndexedSelectionIds(index, [], true, [], ['2'])).toEqual(['2']);
    expect(stableIndexedSelectionIds(index, [], true, ['missing'], ['2'])).toEqual([]);
    expect(orderedIndexedDecorations(layers, index, [...index.ids].reverse())).toEqual(layers);
  });

  it('preserves array references only when every value and its order match', () => {
    const previous = ['a', 'b'];
    expect(retainEqualArray(previous, ['a', 'b'])).toBe(previous);
    expect(retainEqualArray(previous, ['b', 'a'])).not.toBe(previous);
    expect(retainEqualArray(previous, ['a'])).not.toBe(previous);
  });
});
