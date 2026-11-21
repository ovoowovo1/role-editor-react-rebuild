import { expect, test, type Page } from '@playwright/test';
import type {} from '../src/batchRender';
import { expectNoPageErrors, makeEditorSmokeRole, watchPageErrors } from './editorSmoke.helpers';

function isWeaponAtlas(raw: string): boolean {
  return /\/assets\/gaf\/twassests\.png$/.test(new URL(raw).pathname);
}

function isWeaponData(raw: string): boolean {
  const url = new URL(raw);
  // Vite dev's ?url&no-inline module returns only a URL string. Count only
  // requests for the JSON bytes (plain source in dev, hashed asset in builds).
  return /\/gafWeaponRuntimeManifest(?:-[\w-]+)?\.json$/.test(url.pathname) &&
    !url.searchParams.has('url') && !url.searchParams.has('import');
}

function trackWeaponRequests(page: Page) {
  const counts = { atlas: 0, data: 0 };
  page.on('request', (request) => {
    if (isWeaponAtlas(request.url())) counts.atlas++;
    if (isWeaponData(request.url())) counts.data++;
  });
  return counts;
}

function waitForWeaponResponses(page: Page) {
  return Promise.all([
    page.waitForResponse((response) => isWeaponAtlas(response.url())),
    page.waitForResponse((response) => isWeaponData(response.url()))
  ]);
}

test('editor defers weapon PNG and runtime data until an animation needs them', async ({ page }) => {
  const monitor = watchPageErrors(page);
  const weapon = trackWeaponRequests(page);
  const actorResponse = page.waitForResponse(/\/assets\/gaf\/twactor\.png(?:\?|$)/);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.pixi-host canvas')).toBeVisible();
  expect((await actorResponse).ok()).toBe(true);

  const open = page.getByTestId('toolbar-weapon-animation-button');
  await open.click();
  await expect(page.getByRole('option', { name: /^IDLE_KONGFU_TYPE/ })).toHaveAttribute('aria-selected', 'true');
  expect(weapon).toEqual({ atlas: 0, data: 0 });

  // Handgun resolves against the actor runtime and atlas.
  await page.getByRole('option', { name: /^IDLE_HANDGUN_TYPE/ }).click();
  await open.click();
  await expect(page.getByRole('option', { name: /^IDLE_HANDGUN_TYPE/ })).toHaveAttribute('aria-selected', 'true');
  expect(weapon).toEqual({ atlas: 0, data: 0 });

  const responses = waitForWeaponResponses(page);
  await page.getByRole('option', { name: /^IDLE_BOW_TYPE\s/ }).click();
  expect((await responses).map((response) => response.ok())).toEqual([true, true]);
  await open.click();
  await expect(page.getByRole('option', { name: /^IDLE_BOW_TYPE\s/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('option', { name: /^IDLE_KONGFU_TYPE/ }).click();
  await open.click();
  await page.getByRole('option', { name: /^IDLE_BOW_TYPE\s/ }).click();
  expect(weapon).toEqual({ atlas: 1, data: 1 });
  expectNoPageErrors(monitor);
});

test('batch renderer boot and actor renders do not fetch optional weapon data', async ({ page }) => {
  const monitor = watchPageErrors(page);
  const weapon = trackWeaponRequests(page);
  await page.goto('/batch-render', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-twrole-batch-renderer', 'ready');
  expect(weapon).toEqual({ atlas: 0, data: 0 });

  const role = makeEditorSmokeRole(1);
  const render = (label: string) => page.evaluate(async ({ payload, label }) => {
    const renderer = window.__TWROLE_RENDER_TO_DATA_URL__;
    if (!renderer?.ready) throw new Error('Batch renderer is not ready.');
    const result = await renderer.render(payload, { imageSize: 128, bodyAnimationLabel: label });
    return result.dataUrl.slice(0, 22);
  }, { payload: role, label });

  expect(await render('IDLE_KONGFU_TYPE')).toBe('data:image/png;base64,');
  expect(await render('IDLE_HANDGUN_TYPE')).toBe('data:image/png;base64,');
  expect(weapon).toEqual({ atlas: 0, data: 0 });

  const responses = waitForWeaponResponses(page);
  expect(await render('IDLE_BOW_TYPE')).toBe('data:image/png;base64,');
  expect((await responses).map((response) => response.ok())).toEqual([true, true]);
  expect(await render('IDLE_BOW_TYPE')).toBe('data:image/png;base64,');
  expect(weapon).toEqual({ atlas: 1, data: 1 });
  expectNoPageErrors(monitor);
});
