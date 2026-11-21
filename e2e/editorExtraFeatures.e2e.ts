import { expect, test } from '@playwright/test';
import { expectNoPageErrors, watchPageErrors } from './editorSmoke.helpers';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZckcAAAAASUVORK5CYII=',
  'base64'
);

test('loads the Extra tools module only when its tab is opened', async ({ page }) => {
  const extraModule = /\/(?:src\/components\/extra\/ExtraPanel\.tsx|assets\/ExtraPanel-[^/]+\.js)(?:\?|$)/;
  let extraRequested = false;
  page.on('request', (request) => {
    if (extraModule.test(request.url())) extraRequested = true;
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const extraTab = page.locator('[data-tab-mode="extra"]');
  await expect(extraTab).toBeVisible();
  expect(extraRequested).toBe(false);
  const extraRequest = page.waitForRequest(extraModule);
  await extraTab.click();
  await extraRequest;
  await expect(page.getByTestId('extra-entry-chooser')).toBeVisible();
});

test('separates reference image entry from Image to TWRole conversion', async ({ page }) => {
  const monitor = watchPageErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab-mode="extra"]').click();

  await expect(page.getByTestId('extra-entry-chooser')).toBeVisible();
  await page.getByTestId('extra-entry-reference-image-button').click();
  await page.locator('#extra-panel-reference-image input[type="file"]').setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: ONE_PIXEL_PNG
  });
  await expect(page.getByTestId('extra-add-reference-image-button')).toBeEnabled();
  await page.getByTestId('extra-add-reference-image-button').click();
  await expect(page.locator('[data-testid^="reference-image-row-"]')).toHaveCount(1);

  await page.getByRole('button', { name: '返回額外功能' }).click();
  await page.getByTestId('extra-entry-image-to-twrole-button').click();
  await expect(page.locator('#extra-panel-standard')).toBeVisible();
  await expect(page.getByTestId('extra-add-reference-image-button')).toHaveCount(0);
  expectNoPageErrors(monitor);
});
