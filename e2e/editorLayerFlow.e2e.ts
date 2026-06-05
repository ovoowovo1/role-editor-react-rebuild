import { expect, test } from '@playwright/test';
import {
  downloadJsonExport,
  expectNoPageErrors,
  firstGroupId,
  importRoleFile,
  makeEditorSmokeRole,
  nonHeadDecoCodes,
  readLegacyPayload,
  visibleLayerIds,
  watchPageErrors,
  writeRoleFixture
} from './editorSmoke.helpers';

test('groups, ungroups, undoes, and redoes selected layers', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'group-history-source', makeEditorSmokeRole(2));

  await importRoleFile(page, fixture, 2);
  await page.getByTestId('layer-row-e2e-deco-1').click();
  await page.getByTestId('layer-row-e2e-deco-2').click({ modifiers: ['ControlOrMeta'] });

  await expect(page.getByTestId('group-selected-button')).toBeEnabled();
  await page.getByTestId('group-selected-button').click();
  const groupRows = page.locator('[data-testid^="group-row-"]');
  await expect(groupRows).toHaveCount(1);

  await page.getByTestId('undo-button').click();
  await expect(groupRows).toHaveCount(0);

  await page.getByTestId('redo-button').click();
  await expect(groupRows).toHaveCount(1);

  await page.locator('[data-testid^="group-ungroup-"]').first().click();
  await expect(groupRows).toHaveCount(0);
  expectNoPageErrors(monitor);
});

test('reorders a layer, exports JSON, and keeps order after import back', async ({ page, context }, testInfo) => {
  const monitor = watchPageErrors(page);
  const sourceRole = makeEditorSmokeRole(3);
  const fixture = await writeRoleFixture(testInfo, 'reorder-source', sourceRole);

  await importRoleFile(page, fixture, 3);
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'e2e-deco-2', 'e2e-deco-3', 'head']);

  await page.getByTestId('layer-drag-e2e-deco-1').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-2', 'e2e-deco-1', 'e2e-deco-3', 'head']);

  const reorderedJsonPath = await downloadJsonExport(page, testInfo, 'reordered-export.json');
  const reorderedPayload = await readLegacyPayload(reorderedJsonPath);
  const reorderedCodes = nonHeadDecoCodes(reorderedPayload);
  expect(reorderedCodes).not.toEqual(sourceRole.decorations.map((deco) => deco.code).reverse());

  const roundTripPage = await context.newPage();
  const roundTripMonitor = watchPageErrors(roundTripPage);
  await importRoleFile(roundTripPage, reorderedJsonPath, 3);
  const roundTripJsonPath = await downloadJsonExport(roundTripPage, testInfo, 'reordered-round-trip-export.json');
  const roundTripPayload = await readLegacyPayload(roundTripJsonPath);
  expect(nonHeadDecoCodes(roundTripPayload)).toEqual(reorderedCodes);
  expectNoPageErrors(monitor);
  expectNoPageErrors(roundTripMonitor);
});

test('layer visibility excludes hidden deco from legacy compact export', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const sourceRole = makeEditorSmokeRole(2);
  const fixture = await writeRoleFixture(testInfo, 'visibility-source', sourceRole);

  await importRoleFile(page, fixture, 2);
  await page.getByTestId('layer-visibility-e2e-deco-1').click();
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toHaveClass(/muted/);

  const exportPath = await downloadJsonExport(page, testInfo, 'visibility-export.json');
  const payload = await readLegacyPayload(exportPath);
  expect(nonHeadDecoCodes(payload)).toEqual([sourceRole.decorations[1].code]);
  expectNoPageErrors(monitor);
});

test('renames, collapses, toggles visibility, and preserves group metadata', async ({ page, context }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'group-management-source', makeEditorSmokeRole(2));

  await importRoleFile(page, fixture, 2);
  await page.getByTestId('layer-row-e2e-deco-1').click();
  await page.getByTestId('layer-row-e2e-deco-2').click({ modifiers: ['ControlOrMeta'] });
  await page.getByTestId('group-selected-button').click();

  const groupId = await firstGroupId(page);
  await page.getByTestId(`group-edit-${groupId}`).click();
  await page.getByTestId(`group-name-input-${groupId}`).fill('Renamed E2E Group');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(`group-row-${groupId}`)).toContainText('Renamed E2E Group');

  await page.getByTestId(`group-toggle-${groupId}`).click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['head']);
  await page.getByTestId(`group-toggle-${groupId}`).click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'e2e-deco-2', 'head']);

  await page.getByTestId(`group-visibility-${groupId}`).click();
  await expect(page.getByTestId(`group-row-${groupId}`)).toHaveClass(/muted/);
  const hiddenExportPath = await downloadJsonExport(page, testInfo, 'group-hidden-export.json');
  expect(nonHeadDecoCodes(await readLegacyPayload(hiddenExportPath))).toEqual([]);

  await page.getByTestId(`group-visibility-${groupId}`).click();
  const exportPath = await downloadJsonExport(page, testInfo, 'group-visible-export.json');
  const payload = await readLegacyPayload(exportPath);
  expect(payload.decoGroups?.[0]?.name).toBe('Renamed E2E Group');

  const roundTripPage = await context.newPage();
  const roundTripMonitor = watchPageErrors(roundTripPage);
  await importRoleFile(roundTripPage, exportPath, 2);
  const roundTripPath = await downloadJsonExport(roundTripPage, testInfo, 'group-visible-round-trip.json');
  const roundTripPayload = await readLegacyPayload(roundTripPath);
  expect(roundTripPayload.decoGroups?.[0]?.name).toBe('Renamed E2E Group');
  expectNoPageErrors(monitor);
  expectNoPageErrors(roundTripMonitor);
});
