import { expect, test } from '@playwright/test';
import {
  downloadJsonExport,
  expectNoPageErrors,
  findDecoEntry,
  importRoleFile,
  makeEditorSmokeRole,
  readLegacyPayload,
  setNumberInput,
  watchPageErrors,
  writeRoleFixture
} from './editorSmoke.helpers';

test('transform controls update selected deco export values', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const sourceRole = makeEditorSmokeRole(1);
  const fixture = await writeRoleFixture(testInfo, 'transform-source', sourceRole);
  const code = sourceRole.decorations[0].code;

  await importRoleFile(page, fixture, 1);
  await page.getByTestId('layer-row-e2e-deco-1').click();

  await setNumberInput(page, 'transform-pos-x-number', 12.5);
  await setNumberInput(page, 'transform-pos-y-number', -7.5);
  await setNumberInput(page, 'transform-scale-number', 1.25);
  await setNumberInput(page, 'transform-rotate-number', 30);

  const exportPath = await downloadJsonExport(page, testInfo, 'transform-export.json');
  const entry = findDecoEntry(await readLegacyPayload(exportPath), code);
  expect(entry.x).toBeCloseTo(12.5, 4);
  expect(entry.y).toBeCloseTo(-7.5, 4);
  expect(entry.sx).toBeCloseTo(1.25, 4);
  expect(entry.sy).toBeCloseTo(1.25, 4);
  expect(entry.r).toBeCloseTo(Math.PI / 6, 4);
  expectNoPageErrors(monitor);
});

test('keyboard nudge supports undo and redo', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const sourceRole = makeEditorSmokeRole(1);
  const fixture = await writeRoleFixture(testInfo, 'keyboard-source', sourceRole);
  const code = sourceRole.decorations[0].code;
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

  await importRoleFile(page, fixture, 1);
  await page.getByTestId('layer-row-e2e-deco-1').click();
  await page.keyboard.press('ArrowRight');

  const movedPath = await downloadJsonExport(page, testInfo, 'keyboard-moved.json');
  expect(findDecoEntry(await readLegacyPayload(movedPath), code).x).toBeCloseTo(1, 4);

  await page.keyboard.press(`${modifier}+Z`);
  const undonePath = await downloadJsonExport(page, testInfo, 'keyboard-undone.json');
  expect(findDecoEntry(await readLegacyPayload(undonePath), code).x).toBeCloseTo(0, 4);

  await page.keyboard.press(`${modifier}+Y`);
  const redonePath = await downloadJsonExport(page, testInfo, 'keyboard-redone.json');
  expect(findDecoEntry(await readLegacyPayload(redonePath), code).x).toBeCloseTo(1, 4);
  expectNoPageErrors(monitor);
});

test('stage multi-drag commits one undoable translation for the selected layers', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const sourceRole = makeEditorSmokeRole(2);
  const fixture = await writeRoleFixture(testInfo, 'stage-drag-source', sourceRole);
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

  await importRoleFile(page, fixture, 2);
  await page.getByTestId('layer-row-e2e-deco-1').click();
  await page.getByTestId('layer-row-e2e-deco-2').click({ modifiers: ['ControlOrMeta'] });

  const canvas = page.locator('.pixi-host canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Expected stage canvas to be visible.');

  const startX = canvasBox.x + canvasBox.width / 2;
  const startY = canvasBox.y + canvasBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 24, startY + 12, { steps: 4 });
  await page.mouse.up();

  const movedPath = await downloadJsonExport(page, testInfo, 'stage-drag-moved.json');
  const movedPayload = await readLegacyPayload(movedPath);
  for (const sourceDeco of sourceRole.decorations) {
    const moved = findDecoEntry(movedPayload, sourceDeco.code);
    expect(moved.x).toBeCloseTo(sourceDeco.x + 24, 3);
    expect(moved.y).toBeCloseTo(sourceDeco.y + 12, 3);
  }

  await page.getByTestId('undo-button').click();
  const undonePath = await downloadJsonExport(page, testInfo, 'stage-drag-undone.json');
  const undonePayload = await readLegacyPayload(undonePath);
  for (const sourceDeco of sourceRole.decorations) {
    const undone = findDecoEntry(undonePayload, sourceDeco.code);
    expect(undone.x).toBeCloseTo(sourceDeco.x, 3);
    expect(undone.y).toBeCloseTo(sourceDeco.y, 3);
  }
  expectNoPageErrors(monitor);
});
