import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import { makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import type { ImportResult } from '../../types/role';
import { applyLegacyPayloadMetadata, getLegacyCampGender } from './legacyGroupImport';

function importResult(): ImportResult {
  return {
    role: makeRoleDocument({
      camp: 'skydow',
      gender: 'male',
      headLayerIndex: 1,
      decorations: [
        makeDecorationLayer('a'),
        makeDecorationLayer('b'),
        makeDecorationLayer('c')
      ]
    }),
    warnings: []
  };
}

describe('legacy group import metadata', () => {
  it('maps legacy dr values to camp and gender metadata', () => {
    expect(getLegacyCampGender({ dr: '8' })).toEqual({ camp: 'third', gender: 'male' });
    expect(getLegacyCampGender({ data: { dr: 14 } })).toEqual({ camp: 'civil', gender: 'female' });
    expect(getLegacyCampGender({ dr: 99 })).toBeNull();
    expect(getLegacyCampGender(null)).toBeNull();
  });

  it('applies legacy camp, gender, and root deco groups to parsed roles', () => {
    const result = applyLegacyPayloadMetadata(importResult(), {
      dr: 9,
      decoGroups: [{ id: 'g1', name: 'Root Group', itemIndexes: [0, 2] }]
    });

    expect(result.role).toMatchObject({ camp: 'third', gender: 'female' });
    expect(result.role.groups).toHaveLength(1);
    expect(result.role.groups?.[0]).toMatchObject({
      id: 'g1',
      name: 'Root Group',
      itemIds: ['c', HEAD_LAYER_ID]
    });
  });

  it('applies legacy groups from nested data payload locations', () => {
    const fromData = applyLegacyPayloadMetadata(importResult(), {
      data: { decoGroups: [{ id: 'data-group', itemIndexes: [1, 3] }] }
    });
    const fromConfig = applyLegacyPayloadMetadata(importResult(), {
      data: { cr: { decoGroups: [{ id: 'config-group', itemIndexes: [1, 3] }] } }
    });

    expect(fromData.role.groups?.[0]).toMatchObject({
      id: 'data-group',
      itemIds: ['b', 'a']
    });
    expect(fromConfig.role.groups?.[0]).toMatchObject({
      id: 'config-group',
      itemIds: ['b', 'a']
    });
  });
});
