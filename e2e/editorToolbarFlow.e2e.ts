import { expect, test } from '@playwright/test';
import {
  downloadJsonExport,
  expectNoPageErrors,
  importRoleFile,
  makeEditorSmokeRole,
  nonHeadDecoCodes,
  readLegacyPayload,
  visibleLayerIds,
  watchPageErrors,
  writeRoleFixture
} from './editorSmoke.helpers';

test('copy, paste, mirror copy, and delete selected update exported layer count', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'toolbar-source', makeEditorSmokeRole(1));
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

  await importRoleFile(page, fixture, 1);
  await page.getByTestId('layer-row-e2e-deco-1').click();

  await page.keyboard.press(`${modifier}+C`);
  await page.keyboard.press(`${modifier}+V`);
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(3);

  await page.getByTestId('toolbar-mirror-copy-horizontal-button').click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(4);

  await page.getByTestId('toolbar-mirror-copy-vertical-button').click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(5);

  await page.keyboard.press('Delete');
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(4);

  const exportPath = await downloadJsonExport(page, testInfo, 'toolbar-export.json');
  expect(nonHeadDecoCodes(await readLegacyPayload(exportPath))).toHaveLength(3);
  expectNoPageErrors(monitor);
});

test('stage scale, face rotate, and animation controls respond without page errors', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'stage-controls-source', makeEditorSmokeRole(1));

  await importRoleFile(page, fixture, 1);
  await expect(page.getByTestId('stage-scale-value')).toHaveCount(0);
  await page.getByTestId('stage-scale-plus-button').click();
  await expect.poll(async () => page.locator('.stage-bg').evaluate((element) => (element as HTMLElement).style.transform)).toContain('scale(1.5)');
  await page.getByTestId('stage-scale-minus-button').click();
  await expect.poll(async () => page.locator('.stage-bg').evaluate((element) => (element as HTMLElement).style.transform)).toContain('scale(1)');

  await expect(page.locator('.playback-tool')).toBeVisible();
  await expect(page.getByTestId('toolbar-playback-toggle-button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('toolbar-playback-toggle-button').click();
  await expect(page.locator('.playback-tool')).toHaveCount(0);
  await expect(page.getByTestId('toolbar-animation-start-button')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('role-editor:playback-tool-visible'))).toBe('false');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('toolbar-playback-toggle-button')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.playback-tool')).toHaveCount(0);
  await page.getByTestId('toolbar-playback-toggle-button').click();
  await expect(page.getByTestId('toolbar-playback-toggle-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.playback-tool')).toBeVisible();

  await page.getByTestId('toolbar-face-rotate-button').click();
  await page.getByTestId('toolbar-animation-start-button').click();
  await expect(page.getByTestId('toolbar-animation-start-button')).toBeDisabled();
  await expect(page.getByTestId('toolbar-animation-stop-button')).toBeEnabled();
  await page.getByTestId('toolbar-animation-stop-button').click();
  await expect(page.getByTestId('toolbar-animation-start-button')).toBeEnabled();
  await expect(page.getByTestId('toolbar-animation-stop-button')).toBeDisabled();
  await page.getByTestId('toolbar-animation-restart-button').click();
  await expect(page.getByTestId('toolbar-animation-restart-button')).toBeEnabled();
  expectNoPageErrors(monitor);
});
