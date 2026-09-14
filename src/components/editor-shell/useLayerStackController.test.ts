import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID, HEAD_ROW_ID } from '../../constants/layers';
import type { DecorationGroup } from '../../types/role';
import {
  resolveGroupBoundaryTarget,
  resolveLayerStackReorderAction,
  resolveReferenceImageReorderTarget,
  referenceImageIdFromLayerRow
} from './useLayerStackController';

const groups: DecorationGroup[] = [
  {
    id: 'root',
    name: 'Root',
    itemIds: ['a', 'b'],
    members: [{ type: 'group', id: 'nested' }],
    visible: true,
    collapsed: false
  },
  {
    id: 'nested',
    name: 'Nested',
    itemIds: ['a', 'b'],
    members: [{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }],
    visible: true,
    collapsed: false
  }
];

const context = {
  groups,
  roleLayerOrder: ['b', 'a', 'c', HEAD_LAYER_ID]
};

describe('layer stack reorder resolver', () => {
  it('parses reference-image rows and rejects other rows', () => {
    expect(referenceImageIdFromLayerRow('reference-image:one')).toBe('one');
    expect(referenceImageIdFromLayerRow('item:one')).toBeNull();
  });

  it('resolves image targets with visual-to-canonical placement conversion', () => {
    expect(resolveReferenceImageReorderTarget(
      'reference-image:one',
      HEAD_ROW_ID,
      { placement: 'before' },
      context
    )).toEqual({ imageId: 'one', targetToken: HEAD_LAYER_ID, placement: 'after' });

    expect(resolveReferenceImageReorderTarget(
      'reference-image:one',
      'item:c',
      { placement: 'after' },
      context
    )).toEqual({ imageId: 'one', targetToken: 'c', placement: 'before' });

    expect(resolveReferenceImageReorderTarget(
      'reference-image:one',
      'reference-image:two',
      { placement: 'before' },
      context
    )).toEqual({ imageId: 'one', targetToken: 'reference-image:two', placement: 'after' });
  });

  it('places images at the outer boundary when targeting a group or member', () => {
    expect(resolveGroupBoundaryTarget('root', 'before', context))
      .toEqual({ token: 'a', placement: 'after' });
    expect(resolveGroupBoundaryTarget('root', 'after', context))
      .toEqual({ token: 'b', placement: 'before' });

    expect(resolveReferenceImageReorderTarget(
      'reference-image:one',
      'group:nested',
      { placement: 'after' },
      context
    )).toEqual({ imageId: 'one', targetToken: 'b', placement: 'before' });
  });

  it('returns null for role rows, invalid rows, empty groups and self-drops', () => {
    expect(resolveReferenceImageReorderTarget('item:a', 'item:b', undefined, context)).toBeNull();
    expect(resolveReferenceImageReorderTarget('reference-image:one', 'unknown', undefined, context)).toBeNull();
    expect(resolveReferenceImageReorderTarget('reference-image:one', 'reference-image:one', undefined, context)).toBeNull();
    expect(resolveGroupBoundaryTarget('missing', 'before', context)).toBeNull();
    expect(resolveGroupBoundaryTarget('empty', 'before', {
      groups: [{ ...groups[0], id: 'empty', itemIds: [], members: [] }],
      roleLayerOrder: context.roleLayerOrder
    })).toBeNull();
  });

  it('keeps role and runtime reorder routes separate', () => {
    expect(resolveLayerStackReorderAction('item:a', 'reference-image:one', undefined, context)).toBeNull();
    expect(resolveLayerStackReorderAction('item:a', 'item:c', { placement: 'after' }, context))
      .toEqual({ kind: 'role', activeRowId: 'item:a', overRowId: 'item:c', options: { placement: 'after' } });
    expect(resolveLayerStackReorderAction('reference-image:one', HEAD_ROW_ID, undefined, context))
      .toEqual({ kind: 'reference-image', imageId: 'one', targetToken: HEAD_LAYER_ID, placement: 'after' });
  });
});
