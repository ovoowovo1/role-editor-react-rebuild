import { expect, test } from '@playwright/test';
import {
  downloadJsonExport,
  expectNoPageErrors,
  importRoleFile,
  makeEditorSmokeRole,
  readLegacyPayload,
  visibleLayerIds,
  watchPageErrors,
  writeRoleFixture
} from './editorSmoke.helpers';

async function openInsertSettings(page: import('@playwright/test').Page): Promise<void> {
  await page.getByTestId('insert-settings-button').click();
  await expect(page.locator('.dialog-form')).toBeVisible();
}

test('applies palette insertion settings and rejects an invalid visible-row index', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'insert-settings-source', makeEditorSmokeRole(3));

  await importRoleFile(page, fixture, 3);
  const initialIds = await visibleLayerIds(page);

  await openInsertSettings(page);
  const placement = page.locator('input[name="insert-placement"]');
  await placement.nth(2).check();
  const indexInput = page.locator('.dialog-form input[type="number"]');
  const saveButton = page.locator('.modal-footer .button--primary');
  await indexInput.fill('0');
  await expect(saveButton).toBeDisabled();
  await expect(indexInput).toHaveAttribute('aria-invalid', 'true');

  await indexInput.fill('2');
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await page.locator('.choice-block').first().click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(initialIds.length + 1);
  const afterIndexedInsert = await visibleLayerIds(page);
  const indexedLayerId = afterIndexedInsert.find((id) => !initialIds.includes(id));
  if (!indexedLayerId) throw new Error('Expected the palette choice to create a deco layer.');
  expect(afterIndexedInsert).toEqual([
    initialIds[0],
    initialIds[1],
    indexedLayerId,
    ...initialIds.slice(2)
  ]);

  await openInsertSettings(page);
  const paletteScope = page.locator('.dialog-form input[type="checkbox"]').first();
  await expect(paletteScope).toBeChecked();
  await paletteScope.uncheck();
  await saveButton.click();

  await page.locator('.choice-block').nth(1).click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(afterIndexedInsert.length + 1);
  const afterBottomInsert = await visibleLayerIds(page);
  const bottomLayerId = afterBottomInsert.find((id) => !afterIndexedInsert.includes(id));
  if (!bottomLayerId) throw new Error('Expected a second palette choice to create a deco layer.');
  expect(afterBottomInsert.at(-1)).toBe(bottomLayerId);
  expectNoPageErrors(monitor);
});

test('switches body-part tabs, keeps the selected asset in sync, and exports the selected frames', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'body-part-source', makeEditorSmokeRole(1));
  const selectedFrames: Record<'head' | 'hand' | 'foot' | 'cape', number> = {
    head: 0,
    hand: 0,
    foot: 0,
    cape: 0
  };

  await importRoleFile(page, fixture, 1);
  for (const tab of Object.keys(selectedFrames) as Array<keyof typeof selectedFrames>) {
    const tabButton = page.locator(`[data-tab-mode="${tab}"]`);
    await tabButton.click();
    await expect(tabButton).toHaveAttribute('aria-selected', 'true');

    const choice = page.locator('.choice-block').nth(1);
    await expect(choice).toBeVisible();
    const title = await choice.getAttribute('title');
    const frame = Number(title?.match(/\((\d+)\)$/)?.[1]);
    if (!Number.isInteger(frame)) throw new Error(`Expected a numeric body-part frame in choice title: ${title}`);
    await choice.click();
    await expect(choice).toHaveClass(/selected/);
    selectedFrames[tab] = frame;
  }

  const payload = await readLegacyPayload(await downloadJsonExport(page, testInfo, 'body-part-export.json'));
  expect(payload.data.cr.head?.f).toBe(selectedFrames.head);
  expect(payload.data.cr.hand?.f).toBe(selectedFrames.hand);
  expect(payload.data.cr.foot?.f).toBe(selectedFrames.foot);
  expect(payload.data.cr.cape?.f).toBe(selectedFrames.cape);
  expectNoPageErrors(monitor);
});

test('changes camp and gender, refreshes available assets, and persists their legacy role data', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'camp-gender-source', makeEditorSmokeRole(1));

  await importRoleFile(page, fixture, 1);
  const selects = page.locator('.menu-selects select');
  const campSelect = selects.nth(0);
  const genderSelect = selects.nth(1);
  await expect(campSelect).toHaveValue('royal');
  await expect(genderSelect).toHaveValue('male');

  await page.locator('[data-tab-mode="deco"]').click();
  const royalAssetTitle = await page.locator('.choice-block').first().getAttribute('title');
  await campSelect.selectOption('skydow');
  await expect(campSelect).toHaveValue('skydow');
  await expect.poll(async () => page.locator('.choice-block').first().getAttribute('title')).not.toBe(royalAssetTitle);

  await genderSelect.selectOption('female');
  await expect(genderSelect).toHaveValue('female');
  const payload = await readLegacyPayload(await downloadJsonExport(page, testInfo, 'camp-gender-export.json'));
  expect(payload.data.dr).toBe(1);
  expectNoPageErrors(monitor);
});
