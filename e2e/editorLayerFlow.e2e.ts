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
  await page.getByTestId('layer-row-e2e-deco-1').locator('.layer-badge').click();
  await page.getByTestId('layer-row-e2e-deco-2').locator('.layer-badge').click({ modifiers: ['ControlOrMeta'] });

  await expect(page.getByTestId('group-selected-button')).toBeEnabled();
  await page.getByTestId('group-selected-button').click();
  const groupRows = page.locator('[data-testid^="group-row-"]');
  await expect(groupRows).toHaveCount(1);
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toHaveClass(/selected/);
  await expect(page.getByTestId('layer-row-e2e-deco-2')).toHaveClass(/selected/);

  await page.getByTestId('undo-button').click();
  await expect(groupRows).toHaveCount(0);
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toHaveClass(/selected/);
  await expect(page.getByTestId('layer-row-e2e-deco-2')).toHaveClass(/selected/);

  await page.getByTestId('redo-button').click();
  await expect(groupRows).toHaveCount(1);
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toHaveClass(/selected/);
  await expect(page.getByTestId('layer-row-e2e-deco-2')).toHaveClass(/selected/);

  await page.locator('[data-testid^="group-ungroup-"]').first().click();
  await expect(groupRows).toHaveCount(0);
  expectNoPageErrors(monitor);
});

test('clears selection from blank areas without clearing after stage drag', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'blank-clear-source', makeEditorSmokeRole(1));

  await importRoleFile(page, fixture, 1);
  const row = page.getByTestId('layer-row-e2e-deco-1');
  await row.locator('.layer-badge').click();
  await expect(row).toHaveClass(/selected/);

  const layerList = page.getByTestId('layer-list-scroll');
  const listBox = await layerList.boundingBox();
  if (!listBox) throw new Error('Expected layer list scroll area to be visible.');
  await layerList.click({ position: { x: 8, y: Math.max(8, listBox.height - 8) } });
  await expect(row).not.toHaveClass(/selected/);

  await row.locator('.layer-badge').click();
  await expect(row).toHaveClass(/selected/);
  const canvas = page.locator('.pixi-host canvas');
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 8, y: 8 } });
  await expect(row).not.toHaveClass(/selected/);

  await row.locator('.layer-badge').click();
  await expect(row).toHaveClass(/selected/);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Expected stage canvas to be visible.');
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 24, canvasBox.y + canvasBox.height / 2 + 12);
  await page.mouse.up();
  await expect(row).toHaveClass(/selected/);
  expectNoPageErrors(monitor);
});

test('reorders a layer, exports JSON, and keeps order after import back', async ({ page, context }, testInfo) => {
  const monitor = watchPageErrors(page);
  const sourceRole = makeEditorSmokeRole(3);
  const fixture = await writeRoleFixture(testInfo, 'reorder-source', sourceRole);

  await importRoleFile(page, fixture, 3);
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'e2e-deco-2', 'e2e-deco-3', 'head']);
  const reorderedRow = page.getByTestId('layer-row-e2e-deco-1');
  await reorderedRow.locator('.layer-badge').click();
  await expect(reorderedRow).toHaveClass(/selected/);

  await page.getByTestId('layer-drag-e2e-deco-1').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-2', 'e2e-deco-1', 'e2e-deco-3', 'head']);

  await page.getByTestId('undo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'e2e-deco-2', 'e2e-deco-3', 'head']);
  await expect(reorderedRow).toHaveClass(/selected/);

  await page.getByTestId('redo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-2', 'e2e-deco-1', 'e2e-deco-3', 'head']);
  await expect(reorderedRow).toHaveClass(/selected/);

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

test('undoes and redoes a deco reorder without removing a previously added deco', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'reorder-history-source', makeEditorSmokeRole(3));

  await importRoleFile(page, fixture, 3);
  const initialLayerIds = await visibleLayerIds(page);

  await page.locator('.choice-block').first().click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(initialLayerIds.length + 1);
  const idsAfterInsert = await visibleLayerIds(page);
  const addedLayerId = idsAfterInsert.find((id) => !initialLayerIds.includes(id));
  if (!addedLayerId) throw new Error('Expected choosing a palette option to add a deco layer.');
  const addedRow = page.getByTestId(`layer-row-${addedLayerId}`);
  await expect(addedRow).toHaveClass(/selected/);

  await page.getByTestId('layer-drag-e2e-deco-1').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const reorderedLayerIds = await visibleLayerIds(page);
  expect(reorderedLayerIds).not.toEqual(idsAfterInsert);

  await page.getByTestId('undo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(idsAfterInsert);
  await expect(addedRow).toHaveClass(/selected/);

  await page.getByTestId('redo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(reorderedLayerIds);
  expectNoPageErrors(monitor);
});

test('restores the recorded selection when undoing and redoing an inserted deco', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'insert-selection-history-source', makeEditorSmokeRole(1));

  await importRoleFile(page, fixture, 1);
  const originalRow = page.getByTestId('layer-row-e2e-deco-1');
  await originalRow.locator('.layer-badge').click();
  await expect(originalRow).toHaveClass(/selected/);

  await page.locator('.choice-block').first().click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(3);
  const insertedLayerId = (await visibleLayerIds(page)).find((id) => id !== 'e2e-deco-1' && id !== 'head');
  if (!insertedLayerId) throw new Error('Expected choosing a palette option to add a deco layer.');
  const insertedRow = page.getByTestId(`layer-row-${insertedLayerId}`);
  await expect(insertedRow).toHaveClass(/selected/);

  await page.getByTestId('undo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'head']);
  await expect(originalRow).toHaveClass(/selected/);

  await page.getByTestId('redo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toContain(insertedLayerId);
  await expect(insertedRow).toHaveClass(/selected/);
  expectNoPageErrors(monitor);
});

test('restores and clears the recorded selection when undoing and redoing a deleted deco', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'delete-selection-history-source', makeEditorSmokeRole(1));

  await importRoleFile(page, fixture, 1);
  const deletedRow = page.getByTestId('layer-row-e2e-deco-1');
  await deletedRow.locator('.layer-badge').click();
  await expect(deletedRow).toHaveClass(/selected/);

  await page.getByTestId('layer-delete-e2e-deco-1').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['head']);

  await page.getByTestId('undo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'head']);
  await expect(deletedRow).toHaveClass(/selected/);

  await page.getByTestId('redo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['head']);
  await expect(page.locator('.layer-row.selected')).toHaveCount(0);
  expectNoPageErrors(monitor);
});

test('preserves head selection when undoing and redoing head visibility', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'head-visibility-history-source', makeEditorSmokeRole(1));

  await importRoleFile(page, fixture, 1);
  const headRow = page.getByTestId('layer-row-head');
  await headRow.locator('.layer-badge').click();
  await expect(headRow).toHaveClass(/selected/);

  await page.getByTestId('layer-visibility-head').click();
  await expect(headRow).toHaveClass(/muted/);

  await page.getByTestId('undo-button').click();
  await expect(headRow).not.toHaveClass(/muted/);
  await expect(headRow).toHaveClass(/selected/);

  await page.getByTestId('redo-button').click();
  await expect(headRow).toHaveClass(/muted/);
  await expect(headRow).toHaveClass(/selected/);
  expectNoPageErrors(monitor);
});

test('preserves deco selection when undoing and redoing visibility', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'deco-visibility-history-source', makeEditorSmokeRole(1));

  await importRoleFile(page, fixture, 1);
  const decoRow = page.getByTestId('layer-row-e2e-deco-1');
  await decoRow.locator('.layer-badge').click();
  await expect(decoRow).toHaveClass(/selected/);

  await page.getByTestId('layer-visibility-e2e-deco-1').click();
  await expect(decoRow).toHaveClass(/muted/);

  await page.getByTestId('undo-button').click();
  await expect(decoRow).not.toHaveClass(/muted/);
  await expect(decoRow).toHaveClass(/selected/);

  await page.getByTestId('redo-button').click();
  await expect(decoRow).toHaveClass(/muted/);
  await expect(decoRow).toHaveClass(/selected/);
  expectNoPageErrors(monitor);
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
  await page.getByTestId('layer-row-e2e-deco-1').locator('.layer-badge').click();
  await page.getByTestId('layer-row-e2e-deco-2').locator('.layer-badge').click({ modifiers: ['ControlOrMeta'] });
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
