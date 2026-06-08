import { expect, test } from '@playwright/test';
import { expectNoPageErrors, watchPageErrors } from './editorSmoke.helpers';
import type { ColorBlockPreset } from '../src/mock/colorBlocks';

const colorBlockPresets: ColorBlockPreset[] = Array.from({ length: 6 }, (_, index) => ({
  id: `layout-color-${index + 1}`,
  camp: 'royal',
  name: `Layout Color ${index + 1}`,
  label: `Layout Color ${index + 1}`,
  color: index % 2 ? '#101010' : '#f7f7f7',
  deco: []
}));

test('color block choices wrap into the next row without large vertical gaps', async ({ page }) => {
  const monitor = watchPageErrors(page);
  await page.route('**/api/color-block-presets**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(colorBlockPresets)
    });
  });

  await page.setViewportSize({ width: 1000, height: 760 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('tab-color-block-button').click();
  await page.locator('.choice-list').evaluate((element) => {
    const panel = element as HTMLElement;
    panel.style.width = '430px';
    panel.style.minWidth = '430px';
    panel.style.maxWidth = '430px';
  });
  await expect(page.locator('.color-block-choice')).toHaveCount(colorBlockPresets.length);

  const boxes = await page.locator('.color-block-choice').evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    })
  );
  const firstRowTop = boxes[0].top;
  const nextRowTop = Math.min(...boxes.slice(1).map((box) => box.top).filter((top) => top > firstRowTop + 1));

  expect(nextRowTop - firstRowTop).toBeGreaterThanOrEqual(boxes[0].height);
  expect(nextRowTop - firstRowTop).toBeLessThanOrEqual(boxes[0].height + 16);
  expectNoPageErrors(monitor);
});
