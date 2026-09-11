import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationLayer } from '../../types/role';

export interface DecorationSelectionIndex {
  ids: readonly string[];
  positions: ReadonlyMap<string, number>;
}

export function decorationSelectionIndex(
  decorations: readonly DecorationLayer[], previous?: DecorationSelectionIndex
): DecorationSelectionIndex {
  if (previous && previous.ids.length === decorations.length &&
    previous.ids.every((id, index) => id === decorations[index].id)) return previous;
  const ids = decorations.map(layer => layer.id);
  return { ids, positions: new Map(ids.map((id, index) => [id, index])) };
}

export function retainEqualArray<T>(previous: T[], next: T[]): T[] {
  return previous.length === next.length && previous.every((value, index) => value === next[index]) ? previous : next;
}

export function validIndexedLayerIds(index: DecorationSelectionIndex, ids: string[]): string[] {
  return ids.filter(id => id === HEAD_LAYER_ID || index.positions.has(id));
}

export function stableIndexedSelectionIds(
  index: DecorationSelectionIndex, selected: string[], transientActive: boolean, ...fallbacks: string[][]
): string[] {
  const current = validIndexedLayerIds(index, selected);
  if (current.length || !transientActive) return current;
  return validIndexedLayerIds(index, fallbacks.find(ids => ids.length) ?? []);
}

export function orderedIndexedDecorations(
  decorations: DecorationLayer[], index: DecorationSelectionIndex, ids: string[]
): DecorationLayer[] {
  const selected = new Set(ids);
  if (selected.size > decorations.length / 4) return decorations.filter(layer => selected.has(layer.id));
  return [...selected]
    .map(id => index.positions.get(id))
    .filter((position): position is number => position !== undefined)
    .sort((a, b) => a - b)
    .map(position => decorations[position]);
}
