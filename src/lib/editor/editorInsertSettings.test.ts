import { describe, expect, it } from 'vitest';
import { HEAD_ATOM, HEAD_LAYER_ID } from '../../constants/layers';
import { makeDecorationGroup, makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import type { DecorationLayer, RoleDocument } from '../../types/role';
import { referenceImageLayerToken } from '../../types/referenceImage';
import { clamp } from '../math';
import { applyRoleHistoryPatch, makeRoleHistoryEntry } from './editorRoleHistoryPatch';
import { DEFAULT_INSERT_SETTINGS, getInsertVirtualIndex, insertDecorations, type InsertDraftSettings } from './editorInsertSettings';
import { atomsForRole, layerIdsForRole } from './layerOrdering';
import { reconcileReferenceImageLayerOrder } from './referenceImageModel';

function originalInsert(role: RoleDocument, incoming: DecorationLayer[], settings: InsertDraftSettings): RoleDocument {
  if (!incoming.length) return role;
  const atoms = atomsForRole(role);
  const insertIndex = (() => {
    if (settings.placement === 'top') return 0;
    if (settings.placement === 'bottom') return atoms.length;
    const index = Number(settings.index);
    return Number.isInteger(index) && index >= 1 ? clamp(index, 0, atoms.length) : atoms.length;
  })();
  const nextAtoms = [...atoms.slice(0, insertIndex), ...incoming.map((layer) => layer.id), ...atoms.slice(insertIndex)];
  const extras = new Map(incoming.map((layer) => [layer.id, layer]));
  const byId = new Map(role.decorations.map((layer) => [layer.id, layer] as const));
  extras.forEach((layer, id) => byId.set(id, layer));
  const decorations = nextAtoms
    .filter((atom) => atom !== HEAD_ATOM)
    .map((atom) => byId.get(atom))
    .filter((layer): layer is DecorationLayer => Boolean(layer));
  const headIndex = nextAtoms.indexOf(HEAD_ATOM);
  const headLayerIndex = nextAtoms
    .slice(0, headIndex < 0 ? nextAtoms.length : headIndex)
    .filter((atom) => atom !== HEAD_ATOM).length;
  return { ...role, decorations, headLayerIndex: clamp(headLayerIndex, 0, decorations.length), updatedAt: new Date().toISOString() };
}

function assertParity(role: RoleDocument, added: DecorationLayer[], settings: InsertDraftSettings): RoleDocument {
  const old = originalInsert(role, added, settings);
  const next = insertDecorations(role, added, settings);
  expect(next).toEqual({ ...old, updatedAt: next.updatedAt });
  expect(next.headLayer).toBe(role.headLayer);
  expect(next.groups).toBe(role.groups);
  next.decorations.forEach((layer, index) => expect(layer).toBe(old.decorations[index]));
  return next;
}

function settings(placement: InsertDraftSettings['placement'], index = '1'): InsertDraftSettings {
  return { ...DEFAULT_INSERT_SETTINGS, placement, index };
}

describe('direct decoration insertion', () => {
  it('returns the original role unchanged for an empty batch', () => {
    const role = makeRoleDocument();
    expect(insertDecorations(role, [], settings('top'))).toBe(role);
  });

  it('preserves dense order and the virtual HEAD boundary for normalized, malformed and rounded positions', () => {
    const previous = ['a', 'b', 'c', 'd'].map((id) => makeDecorationLayer(id));
    const incoming = ['x', 'y'].map((id) => makeDecorationLayer(id));
    for (const headLayerIndex of [0, 1, 4, 2.6, -10, 99, NaN, Infinity, '2']) {
      const role = makeRoleDocument({ decorations: previous, headLayerIndex: headLayerIndex as number });
      assertParity(role, incoming, settings('top'));
      assertParity(role, incoming, settings('bottom'));
      for (const index of ['1', '2', '4', '5', '99', '0', '-1', '0.5', '', 'oops', ' 2 ', '1e0', '0x2']) {
        assertParity(role, incoming, settings('after_index', index));
      }
    }
    const role = makeRoleDocument({ decorations: previous, headLayerIndex: 2 });
    const atHead = assertParity(role, incoming, settings('after_index', '2'));
    expect(atHead.headLayerIndex).toBe(4);
    expect(atHead.decorations.map((layer) => layer.id)).toEqual(['a', 'b', 'x', 'y', 'c', 'd']);
    const pastHead = assertParity(role, incoming, settings('after_index', '3'));
    expect(pastHead.headLayerIndex).toBe(2);
    expect(pastHead.decorations.map((layer) => layer.id)).toEqual(['a', 'b', 'x', 'y', 'c', 'd']);
  });

  it('does not read the index for top and bottom placements', () => {
    const role = makeRoleDocument({ decorations: [makeDecorationLayer('a')] });
    const incoming = [makeDecorationLayer('x')];
    for (const placement of ['top', 'bottom'] as const) {
      const mode: InsertDraftSettings = { ...DEFAULT_INSERT_SETTINGS, placement, get index(): string { throw new Error('index not needed'); } };
      expect(getInsertVirtualIndex(role, mode)).toBe(placement === 'top' ? 0 : 2);
      assertParity(role, incoming, mode);
    }
  });

  it('preserves last-ID-wins behavior for previous, batch, and cross-list collisions', () => {
    const first = makeDecorationLayer('dup', { x: 1 });
    const last = makeDecorationLayer('dup', { x: 2 });
    const incomingA = makeDecorationLayer('dup', { x: 3 });
    const incomingB = makeDecorationLayer('dup', { x: 4 });
    const role = makeRoleDocument({ decorations: [first, makeDecorationLayer('a'), last], headLayerIndex: 1 });
    assertParity(role, [incomingA, incomingB], settings('after_index', '1'));
    const cross = assertParity(role, [incomingB], settings('bottom'));
    expect(cross.decorations.filter((layer) => layer.id === 'dup').every((layer) => layer === incomingB)).toBe(true);
  });

  it('matches fallback for both reserved IDs, non-string IDs, and sparse arrays', () => {
    const role = makeRoleDocument({ decorations: [makeDecorationLayer('a')], headLayerIndex: 1 });
    for (const id of [HEAD_ATOM, HEAD_LAYER_ID, 55 as unknown as string]) {
      const reserved = makeDecorationLayer(id);
      assertParity(role, [reserved], settings('top'));
      assertParity({ ...role, decorations: [reserved, ...role.decorations] }, [makeDecorationLayer('x')], settings('bottom'));
    }
    const sparse = new Array<DecorationLayer>(2);
    sparse[1] = makeDecorationLayer('b');
    expect(() => originalInsert(role, sparse, settings('top'))).toThrow(TypeError);
    expect(() => insertDecorations(role, sparse, settings('top'))).toThrow(TypeError);
    const withSparse = { ...role, decorations: sparse };
    expect(() => originalInsert(withSparse, [makeDecorationLayer('c')], settings('top'))).toThrow(TypeError);
    expect(() => insertDecorations(withSparse, [makeDecorationLayer('c')], settings('top'))).toThrow(TypeError);
    const malformed = [undefined as unknown as DecorationLayer, makeDecorationLayer('d')];
    expect(() => originalInsert(role, malformed, settings('bottom'))).toThrow(TypeError);
    expect(() => insertDecorations(role, malformed, settings('bottom'))).toThrow(TypeError);
  });

  it('preserves groups, inserted selection, and reference image order through Undo and Redo', () => {
    const group = makeDecorationGroup('g', {
      itemIds: ['a', 'b'], members: [{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }]
    });
    const before = makeRoleDocument({
      decorations: ['a', 'b', 'c'].map((id) => makeDecorationLayer(id)),
      groups: [group],
      headLayerIndex: 1
    });
    const after = assertParity(before, ['x', 'y'].map((id) => makeDecorationLayer(id)), settings('after_index', '2'));
    const history = makeRoleHistoryEntry(before, after, ['a'], ['x', 'y']);
    if (history?.kind !== 'patch') throw new Error('Expected insertion history patch.');
    expect(history.selectionIds).toEqual(['a']);
    expect(history.inverseSelectionIds).toEqual(['x', 'y']);

    const image = referenceImageLayerToken('ref');
    const imageIds = new Set(['ref']);
    const beforeOrder = ['c', image, 'b', HEAD_LAYER_ID, 'a'];
    const renderOrder = (role: RoleDocument) => layerIdsForRole(role).reverse();
    const afterOrder = reconcileReferenceImageLayerOrder(beforeOrder, renderOrder(after), imageIds);
    expect(afterOrder).toEqual(['c', image, 'b', 'y', 'x', HEAD_LAYER_ID, 'a']);
    const undone = applyRoleHistoryPatch(after, history.patch, 'before');
    expect(undone).toEqual(before);
    expect(reconcileReferenceImageLayerOrder(afterOrder, renderOrder(undone), imageIds)).toEqual(beforeOrder);
    const redone = applyRoleHistoryPatch(undone, history.patch, 'after');
    expect(redone).toEqual(after);
    expect(reconcileReferenceImageLayerOrder(beforeOrder, renderOrder(redone), imageIds)).toEqual(afterOrder);
  });
});
