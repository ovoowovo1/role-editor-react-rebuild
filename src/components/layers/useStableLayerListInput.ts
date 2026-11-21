import { useLayoutEffect, useMemo, useRef } from 'react';
import type { DecorationLayer } from '../../types/role';
import type { ReferenceImageLayer } from '../../types/referenceImage';

export function sameLayerListInput<T>(
  previous: readonly T[],
  next: readonly T[],
  sameItem: (left: T, right: T) => boolean
): boolean {
  return previous === next || (
    previous.length === next.length &&
    previous.every((item, index) => item === next[index] || sameItem(item, next[index]))
  );
}

/** Retain immutable snapshots when only fields irrelevant to a list consumer change. */
export function useStableLayerListInput<T>(
  input: readonly T[],
  sameItem: (left: T, right: T) => boolean
): readonly T[] {
  const committed = useRef(input);
  const stable = useMemo(() => {
    const previous = committed.current;
    return sameLayerListInput(previous, input, sameItem) ? previous : input;
  }, [input, sameItem]);
  useLayoutEffect(() => {
    committed.current = stable;
  }, [stable]);
  return stable;
}

export function sameLayerId(left: DecorationLayer, right: DecorationLayer): boolean {
  return left.id === right.id;
}

export function sameDecorationRow(left: DecorationLayer, right: DecorationLayer): boolean {
  return left.id === right.id && left.assetId === right.assetId && left.visible === right.visible;
}

export function sameReferenceImageRow(left: ReferenceImageLayer, right: ReferenceImageLayer): boolean {
  return left.id === right.id && left.src === right.src && left.name === right.name && left.visible === right.visible;
}
