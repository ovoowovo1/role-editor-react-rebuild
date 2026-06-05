import { expect, test } from '@playwright/test';
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
  const sourceRole = makeEditorSmokeRole(2, { grouped: true });
  const sourceFixture = await writeRoleFixture(testInfo, 'round-trip-source', sourceRole);

  await importRoleFile(page, sourceFixture, 2);
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toBeVisible();
  await expect(page.getByTestId('layer-row-e2e-deco-2')).toBeVisible();

  const twrolePath = await downloadTwrole(page, testInfo, 'round-trip-role.twrole');
  const twrolePayload = await readLegacyPayload(twrolePath);
  expect(nonHeadDecoCodes(twrolePayload).sort()).toEqual(sourceRole.decorations.map((deco) => deco.code).sort());
  expect(twrolePayload.decoGroups).toHaveLength(1);
  expect(twrolePayload.decoGroups?.[0]?.name).toBe('E2E Group');

  const roundTripPage = await context.newPage();
  const roundTripMonitor = watchPageErrors(roundTripPage);
  await importRoleFile(roundTripPage, twrolePath, 2);
  await expect.poll(() => visibleLayerIds(roundTripPage)).toHaveLength(3);

  const exportedJsonPath = await downloadJsonExport(roundTripPage, testInfo, 'round-trip-export.json');
  const exportedPayload = await readLegacyPayload(exportedJsonPath);
  expect(nonHeadDecoCodes(exportedPayload).sort()).toEqual(sourceRole.decorations.map((deco) => deco.code).sort());
  expect(exportedPayload.decoGroups).toHaveLength(1);
  expect(exportedPayload.decoGroups?.[0]?.name).toBe('E2E Group');
  expectNoPageErrors(monitor);
  expectNoPageErrors(roundTripMonitor);
});

test('invalid import reports failure without corrupting the current role', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'valid-before-invalid', makeEditorSmokeRole(2));
  const invalidFixture = await writeTextFixture(testInfo, 'invalid-role.json', '{ this is not valid role json');

  await importRoleFile(page, fixture, 2);
  await page.getByTestId('import-file-input').setInputFiles(invalidFixture);

  await expect(page.getByTestId('status-pill')).toContainText('Unsupported role file', { timeout: 20_000 });
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'e2e-deco-2', 'head']);
  expectNoPageErrors(monitor);
});
