import { expect, test } from '@playwright/test';
import {
  downloadJsonExport,
  expectNoPageErrors,
  importRoleFile,
  makeEditorSmokeRole,
  nonHeadDecoCodes,
  nonHeadDecoEntries,
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
  await page.getByTestId('layer-row-e2e-deco-1').locator('.layer-badge').click();

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

test('centre mirror copy buttons expand a single selection around the role centre', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'toolbar-centre-mirror-source', makeEditorSmokeRole(2));

  await importRoleFile(page, fixture, 2);
  await page.getByTestId('layer-row-e2e-deco-2').locator('.layer-badge').click();

  await expect(page.getByTestId('toolbar-center-mirror-copy-horizontal-button').locator('.material-icons')).toHaveText('vertical_align_center');
  await expect(page.getByTestId('toolbar-center-mirror-copy-vertical-button').locator('.material-icons')).toHaveText('format_align_center');

  await page.getByTestId('toolbar-center-mirror-copy-horizontal-button').click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(4);
  await expect(page.locator('[data-testid^="layer-row-"].selected')).toHaveCount(1);
  let exportPath = await downloadJsonExport(page, testInfo, 'toolbar-centre-horizontal.json');
  let entries = nonHeadDecoEntries(await readLegacyPayload(exportPath));
  expect(entries.filter((entry) => entry.x === 8 && entry.y === -6)).toHaveLength(1);
  expect(entries.filter((entry) => entry.x === 0 && entry.y === 0)).toHaveLength(2);

  await page.getByTestId('undo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(3);
  await page.getByTestId('redo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(4);

  await page.getByTestId('layer-row-e2e-deco-2').locator('.layer-badge').click();
  await page.getByTestId('toolbar-center-mirror-copy-vertical-button').click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(5);
  await expect(page.locator('[data-testid^="layer-row-"].selected')).toHaveCount(1);
  exportPath = await downloadJsonExport(page, testInfo, 'toolbar-centre-vertical.json');
  entries = nonHeadDecoEntries(await readLegacyPayload(exportPath));
  expect(entries.filter((entry) => entry.x === 8 && entry.y === -6)).toHaveLength(1);
  expect(entries.filter((entry) => entry.x === 0 && entry.y === 0)).toHaveLength(3);
  expectNoPageErrors(monitor);
});

test('centre mirror copy preserves the current multi-selection centre', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'toolbar-centre-mirror-multi-source', makeEditorSmokeRole(2));

  await importRoleFile(page, fixture, 2);
  await page.getByTestId('layer-row-e2e-deco-1').locator('.layer-badge').click();
  await page.getByTestId('layer-row-e2e-deco-2').locator('.layer-badge').click({ modifiers: ['ControlOrMeta'] });

  await page.getByTestId('toolbar-center-mirror-copy-horizontal-button').click();
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(5);
  await expect(page.locator('[data-testid^="layer-row-"].selected')).toHaveCount(2);
  const exportPath = await downloadJsonExport(page, testInfo, 'toolbar-centre-multi-horizontal.json');
  const entries = nonHeadDecoEntries(await readLegacyPayload(exportPath));
  expect(entries.filter((entry) => entry.x === 0 && entry.y === 0)).toHaveLength(1);
  expect(entries.filter((entry) => entry.x === 8 && entry.y === -6)).toHaveLength(1);
  expect(entries.filter((entry) => entry.x === 4 && entry.y === 3)).toHaveLength(1);
  expect(entries.filter((entry) => entry.x === -4 && entry.y === -3)).toHaveLength(1);
  expectNoPageErrors(monitor);
});

test('restores the recorded selection when undoing and redoing a paste', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const fixture = await writeRoleFixture(testInfo, 'paste-selection-history-source', makeEditorSmokeRole(1));
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

  await importRoleFile(page, fixture, 1);
  const originalRow = page.getByTestId('layer-row-e2e-deco-1');
  await originalRow.locator('.layer-badge').click();
  await expect(originalRow).toHaveClass(/selected/);

  await page.keyboard.press(`${modifier}+C`);
  await page.keyboard.press(`${modifier}+V`);
  await expect.poll(() => visibleLayerIds(page)).toHaveLength(3);
  const pastedLayerId = (await visibleLayerIds(page)).find((id) => id !== 'e2e-deco-1' && id !== 'head');
  if (!pastedLayerId) throw new Error('Expected paste to add a deco layer.');
  const pastedRow = page.getByTestId(`layer-row-${pastedLayerId}`);
  await expect(pastedRow).toHaveClass(/selected/);

  await page.getByTestId('undo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toEqual(['e2e-deco-1', 'head']);
  await expect(originalRow).toHaveClass(/selected/);

  await page.getByTestId('redo-button').click();
  await expect.poll(() => visibleLayerIds(page)).toContain(pastedLayerId);
  await expect(pastedRow).toHaveClass(/selected/);
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

  const faceButton = page.getByTestId('toolbar-face-rotate-button');
  const faceIcon = faceButton.locator('.face-mat-icon');
  await expect(faceIcon).toHaveAttribute('style', /rotate\(-90deg\)/);
  await faceButton.click();
  await expect(faceIcon).toHaveAttribute('style', /rotate\(0deg\)/);
  await faceButton.click();
  await expect(faceIcon).toHaveAttribute('style', /rotate\(90deg\)/);
  await faceButton.click();
  await expect(faceIcon).toHaveAttribute('style', /rotate\(180deg\)/);
  await faceButton.click();
  await expect(faceIcon).toHaveAttribute('style', /rotate\(-90deg\)/);
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
