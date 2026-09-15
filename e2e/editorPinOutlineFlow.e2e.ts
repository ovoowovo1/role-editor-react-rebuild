import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { expectNoPageErrors, saveDownload, watchPageErrors } from './editorSmoke.helpers';

test('previews a pin outline and can insert it into role layers', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab-mode="extra"]').click();
  await page.getByTestId('extra-entry-pin-outline-button').click();
  await page.getByTestId('pin-outline-toggle-button').click();

  const canvas = page.locator('.pixi-host canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Expected the stage canvas to have a layout box.');
  const center = { x: box.width / 2, y: box.height / 2 };
  await canvas.click({ position: { x: center.x - 80, y: center.y - 40 } });
  await canvas.click({ position: { x: center.x + 70, y: center.y - 35 } });
  await canvas.click({ position: { x: center.x + 20, y: center.y + 70 } });
  await expect(page.locator('[data-testid^="pin-outline-pin-"]')).toHaveCount(3);

  const materialSelect = page.getByTestId('pin-outline-material-select');
  await materialSelect.selectOption({ index: 1 });
  await materialSelect.selectOption({ index: 2 });
  await materialSelect.selectOption({ index: 1 });
  await expect(page.locator('.pin-outline-material')).toHaveCount(3);
  await expect(page.locator('.pin-outline-material input[type="range"]')).toHaveCount(0);
  await expect(page.getByTestId('pin-outline-toggle-button')).toHaveText('停用圖釘描邊');

  // The preview is runtime-only until the user explicitly inserts it. The
  // insertion creates normal role decorations, which are then visible in the
  // layer list and included in exports.
  const insertButton = page.getByTestId('pin-outline-insert-button');
  await expect(insertButton).toBeEnabled();
  await insertButton.click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-json-button').click();
  const exportPath = await saveDownload(await downloadPromise, testInfo, 'pin-outline-export.json');
  const exportText = await readFile(exportPath, 'utf8');
  expect(exportText).not.toContain('pin-outline');
  const insertedPayload = JSON.parse(exportText) as {
    data?: { cr?: { deco?: Array<{ c?: string }> } };
  };
  const insertedCount = insertedPayload.data?.cr?.deco?.filter((deco) => deco.c !== 'head').length ?? 0;
  expect(insertedCount).toBeGreaterThan(0);
  await expect.poll(() => page.locator('[data-testid^="layer-row-"]').count()).toBeGreaterThan(1);

  // Removing a pin only changes the runtime preview. Already inserted role
  // layers remain in the document and therefore remain in the layer list and
  // export.
  await page.locator('[data-testid^="pin-outline-pin-"] .layer-delete').first().click();
  await expect(page.locator('[data-testid^="pin-outline-pin-"]')).toHaveCount(2);
  await expect(page.locator('.pin-outline-material')).toHaveCount(3);
  await expect.poll(() => page.locator('[data-testid^="layer-row-"]').count()).toBeGreaterThan(1);
  const afterPinRemoval = page.waitForEvent('download');
  await page.getByTestId('export-json-button').click();
  const afterRemovalPath = await saveDownload(await afterPinRemoval, testInfo, 'pin-outline-after-removal.json');
  const afterRemovalPayload = JSON.parse(await readFile(afterRemovalPath, 'utf8')) as {
    data?: { cr?: { deco?: Array<{ c?: string }> } };
  };
  expect(afterRemovalPayload.data?.cr?.deco?.filter((deco) => deco.c !== 'head')).toHaveLength(insertedCount);

  // The normal editor history owns the insertion, so undo/redo affects the
  // inserted role layers without touching the runtime pin state.
  await page.getByTestId('undo-button').click();
  await expect.poll(async () => {
    const download = page.waitForEvent('download');
    await page.getByTestId('export-json-button').click();
    const path = await saveDownload(await download, testInfo, 'pin-outline-undo.json');
    const payload = JSON.parse(await readFile(path, 'utf8')) as { data?: { cr?: { deco?: Array<{ c?: string }> } } };
    return payload.data?.cr?.deco?.filter((deco) => deco.c !== 'head').length ?? 0;
  }).toBe(0);
  await page.getByTestId('redo-button').click();
  await expect.poll(async () => {
    const download = page.waitForEvent('download');
    await page.getByTestId('export-json-button').click();
    const path = await saveDownload(await download, testInfo, 'pin-outline-redo.json');
    const payload = JSON.parse(await readFile(path, 'utf8')) as { data?: { cr?: { deco?: Array<{ c?: string }> } } };
    return payload.data?.cr?.deco?.filter((deco) => deco.c !== 'head').length ?? 0;
  }).toBe(insertedCount);
  expectNoPageErrors(monitor);
});
