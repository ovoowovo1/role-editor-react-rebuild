import { expect, test } from '@playwright/test';
import {
  downloadJsonExport,
  expectNoPageErrors,
  findDecoEntry,
  importRoleFile,
  makeEditorSmokeRole,
  readLegacyPayload,
  watchPageErrors,
  writeRoleFixture
} from './editorSmoke.helpers';

test('selects, shift-multi-selects, marquee-selects, and drags decos directly on the center stage', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const sourceRole = makeEditorSmokeRole(2);
  sourceRole.decorations[0].x = 0;
  sourceRole.decorations[0].y = 0;
  sourceRole.decorations[0].rotation = 0;
  sourceRole.decorations[1].x = 80;
  sourceRole.decorations[1].y = 0;
  sourceRole.decorations[1].rotation = 0;
  sourceRole.positionRange = 120;

  const fixture = await writeRoleFixture(testInfo, 'stage-direct-select', sourceRole);
  await importRoleFile(page, fixture, 2);

  const canvas = page.locator('.pixi-host canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Expected stage canvas to be visible.');

  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;
  const row1 = page.getByTestId('layer-row-e2e-deco-1');
  const row2 = page.getByTestId('layer-row-e2e-deco-2');

  // 1. Direct click-and-drag on an unselected deco in the center canvas.
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 20, centerY + 10, { steps: 4 });
  await page.mouse.up();

  await expect(row1).toHaveClass(/selected/);
  await expect(row2).not.toHaveClass(/selected/);

  const singleMovedPath = await downloadJsonExport(page, testInfo, 'stage-single-moved.json');
  const singleMovedPayload = await readLegacyPayload(singleMovedPath);
  const movedDeco1 = findDecoEntry(singleMovedPayload, sourceRole.decorations[0].code);
  const untouchedDeco2 = findDecoEntry(singleMovedPayload, sourceRole.decorations[1].code);
  expect(movedDeco1.x).toBeGreaterThan(5);
  expect(untouchedDeco2.x).toBeCloseTo(80, 2);

  // 2. Shift+click the second deco on the center canvas to multi-select, then drag both.
  await page.keyboard.down('Shift');
  await page.mouse.click(centerX + 80, centerY);
  await page.keyboard.up('Shift');

  await expect(row1).toHaveClass(/selected/);
  await expect(row2).toHaveClass(/selected/);

  await page.mouse.move(centerX + 80, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 95, centerY + 15, { steps: 4 });
  await page.mouse.up();

  const multiMovedPath = await downloadJsonExport(page, testInfo, 'stage-multi-moved.json');
  const multiMovedPayload = await readLegacyPayload(multiMovedPath);
  const multiDeco1 = findDecoEntry(multiMovedPayload, sourceRole.decorations[0].code);
  const multiDeco2 = findDecoEntry(multiMovedPayload, sourceRole.decorations[1].code);
  expect(multiDeco1.x).toBeGreaterThan(movedDeco1.x + 2);
  expect(multiDeco2.x).toBeGreaterThan(82);

  // 3. Clear selection, then marquee-drag a box on empty stage space to select both.
  await canvas.click({ position: { x: 8, y: 8 } });
  await expect(row1).not.toHaveClass(/selected/);
  await expect(row2).not.toHaveClass(/selected/);

  await page.mouse.move(centerX - 60, centerY - 60);
  await page.mouse.down();
  await page.mouse.move(centerX + 140, centerY + 60, { steps: 4 });
  await page.mouse.up();

  await expect(row1).toHaveClass(/selected/);
  await expect(row2).toHaveClass(/selected/);
  expectNoPageErrors(monitor);
});

test('supports 5,500 decos with multiple groups and F-key cycling scroll in right panel', async ({ page }, testInfo) => {
  const monitor = watchPageErrors(page);
  const baseRole = makeEditorSmokeRole(2);
  const templateA = baseRole.decorations[0];
  const templateB = baseRole.decorations[1];
  const decorations = Array.from({ length: 5500 }, (_, index) => {
    const base = index % 2 === 0 ? templateA : templateB;
    const isFirst = index === 0;
    const isTarget2 = index === 5399;
    return {
      ...base,
      id: `e2e-deco-${index + 1}`,
      name: `Layer ${index + 1}`,
      x: isFirst ? 0 : isTarget2 ? 90 : 400,
      y: isFirst || isTarget2 ? 0 : 400,
      rotation: 0
    };
  });

  const largeRole = {
    ...baseRole,
    positionRange: 500,
    headLayerIndex: decorations.length,
    decorations,
    groups: [
      {
        id: 'group-top',
        name: 'Top Group',
        itemIds: ['e2e-deco-1', 'e2e-deco-2'],
        members: [
          { type: 'layer' as const, id: 'e2e-deco-1' },
          { type: 'layer' as const, id: 'e2e-deco-2' }
        ],
        visible: true,
        collapsed: false
      },
      {
        id: 'group-bottom',
        name: 'Bottom Group',
        itemIds: ['e2e-deco-5400', 'e2e-deco-5401'],
        members: [
          { type: 'layer' as const, id: 'e2e-deco-5400' },
          { type: 'layer' as const, id: 'e2e-deco-5401' }
        ],
        visible: true,
        collapsed: true
      }
    ]
  };

  const fixture = await writeRoleFixture(testInfo, 'stage-5500-groups', largeRole);
  await importRoleFile(page, fixture);
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toBeVisible();
  // Wait for deferred stage sync on 5,500-deco import to populate decoDisplays.
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));

  const canvas = page.locator('.pixi-host canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Expected stage canvas to be visible.');

  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;

  // Select e2e-deco-1 (at 0,0) then Shift+click e2e-deco-5400 (at 90,0) directly on canvas.
  await page.mouse.click(centerX, centerY);
  await page.keyboard.down('Shift');
  await page.mouse.click(centerX + 90, centerY);
  await page.keyboard.up('Shift');

  // Scroll the right panel to the middle so neither target is visible.
  const layerScroll = page.getByTestId('layer-list-scroll');
  await layerScroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight / 2;
  });
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toHaveCount(0);
  await expect(page.getByTestId('layer-row-e2e-deco-5400')).toHaveCount(0);

  // First F press: scrolls to the first selected item (e2e-deco-1 in group-top).
  await page.keyboard.press('f');
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toBeVisible();
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toHaveClass(/selected/);

  // Second F press: auto-expands collapsed group-bottom and scrolls to e2e-deco-5400.
  await page.keyboard.press('f');
  await expect(page.getByTestId('layer-row-e2e-deco-5400')).toBeVisible();
  await expect(page.getByTestId('layer-row-e2e-deco-5400')).toHaveClass(/selected/);

  // Third F press: cycles back to e2e-deco-1.
  await page.keyboard.press('f');
  await expect(page.getByTestId('layer-row-e2e-deco-1')).toBeVisible();

  expectNoPageErrors(monitor);
});
