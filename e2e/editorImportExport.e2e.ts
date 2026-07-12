import { expect, test } from '@playwright/test';
import { HEAD_LAYER_ID } from '../src/constants/layers';
import {
  downloadJsonExport,
  downloadTwrole,
  expectNoPageErrors,
  importRoleFile,
  makeEditorSmokeRole,
  nonHeadDecoCodes,
  readLegacyPayload,
  visibleLayerIds,
  watchPageErrors,
  writeRoleFixture,
  writeTextFixture
} from './editorSmoke.helpers';

test('imports a role, downloads .twrole, imports back, and preserves compact export data', async ({ page, context }, testInfo) => {
  const monitor = watchPageErrors(page);
  const baseRole = makeEditorSmokeRole(3);
  const sourceRole = {
    ...baseRole,
    camp: 'third',
    gender: 'female' as const,
    headLayerIndex: 1,
    groups: [
      {
        id: 'e2e-child-group',
        name: 'E2E Child Group',
        itemIds: [baseRole.decorations[0].id, baseRole.decorations[1].id],
        members: [
          { type: 'layer' as const, id: baseRole.decorations[0].id },
          { type: 'layer' as const, id: baseRole.decorations[1].id }
        ],
        visible: true,
        collapsed: false
      },
      {
        id: 'e2e-parent-group',
        name: 'E2E Parent Group',
        itemIds: [baseRole.decorations[0].id, baseRole.decorations[1].id, HEAD_LAYER_ID],
        members: [
          { type: 'group' as const, id: 'e2e-child-group' },
          { type: 'layer' as const, id: HEAD_LAYER_ID }
        ],
        visible: true,
        collapsed: false
      }
    ]
  };
  const sourceFixture = await writeRoleFixture(testInfo, 'round-trip-source', sourceRole);

  await importRoleFile(page, sourceFixture, 3);
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toBeVisible();
  await expect(page.getByTestId('layer-row-e2e-deco-2')).toBeVisible();
  await expect(page.getByLabel('陣營')).toHaveValue('third');
  await expect(page.getByLabel('性別')).toHaveValue('female');

  const twrolePath = await downloadTwrole(page, testInfo, 'round-trip-role.twrole');
  const twrolePayload = await readLegacyPayload(twrolePath);
  expect(nonHeadDecoCodes(twrolePayload).sort()).toEqual(sourceRole.decorations.map((deco) => deco.code).sort());
  expect(twrolePayload.data.dr).toBe(9);
  expect(twrolePayload.decoGroups).toHaveLength(2);
  expect(twrolePayload.decoGroups?.map((group) => group.name)).toEqual([
    'E2E Child Group',
    'E2E Parent Group'
  ]);
  expect(twrolePayload.decoGroups?.[1]?.members?.[0]).toMatchObject({
    type: 'group',
    id: 'e2e-child-group'
  });

  const roundTripPage = await context.newPage();
  const roundTripMonitor = watchPageErrors(roundTripPage);
  await importRoleFile(roundTripPage, twrolePath, 3);
  await expect.poll(() => visibleLayerIds(roundTripPage)).toHaveLength(4);
  await expect(roundTripPage.getByLabel('陣營')).toHaveValue('third');
  await expect(roundTripPage.getByLabel('性別')).toHaveValue('female');

  const exportedJsonPath = await downloadJsonExport(roundTripPage, testInfo, 'round-trip-export.json');
  const exportedPayload = await readLegacyPayload(exportedJsonPath);
  expect(nonHeadDecoCodes(exportedPayload).sort()).toEqual(sourceRole.decorations.map((deco) => deco.code).sort());
  expect(exportedPayload.data.dr).toBe(9);
  expect(exportedPayload.decoGroups).toHaveLength(2);
  expect(exportedPayload.decoGroups?.[1]?.members?.[0]).toMatchObject({
    type: 'group',
    id: 'e2e-child-group'
  });
  expectNoPageErrors(monitor);
  expectNoPageErrors(roundTripMonitor);
});

test('invalid import reports failure without corrupting the current role', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'valid-before-invalid', makeEditorSmokeRole(2));
  const invalidFixture = await writeTextFixture(testInfo, 'invalid-role.json', '{ this is not valid role json');

  await importRoleFile(page, fixture, 2);
  await page.getByTestId('import-file-input').setInputFiles(invalidFixture);

  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'e2e-deco-2', 'head']);
  expectNoPageErrors(monitor);
});
