import { expect, test } from '@playwright/test';
import type {} from '../src/batchRender';
import type { FullRoleRenderDebugOptions } from '../src/lib/stage/fullRoleRenderer';
import { expectNoPageErrors, makeEditorSmokeRole, watchPageErrors } from './editorSmoke.helpers';

test('batch ablations match separate renders without leaking state between modes or roles', async ({ page }) => {
  const monitor = watchPageErrors(page);
  await page.goto('/batch-render', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-twrole-batch-renderer', 'ready');

  const firstRole = makeEditorSmokeRole(2, { grouped: true });
  const secondRole = makeEditorSmokeRole(1);
  // The second request changes position, opacity and decoration membership, so
  // stale static preparation would change the decoded transparent output.
  secondRole.name = 'Different request';
  secondRole.decorations[0] = { ...secondRole.decorations[0], x: 19, y: 8, opacity: 0.55 };

  const requests = [
    {
      payload: firstRole,
      background: 'transparent',
      modes: ['only_decorations', 'without_head', 'full'] as const
    },
    {
      payload: firstRole,
      background: '#386caa',
      modes: ['without_decorations', 'full', 'only_decorations'] as const
    },
    {
      payload: secondRole,
      background: 'transparent',
      // Also check when the full comparison image is internal, not requested.
      modes: ['only_decorations', 'without_head'] as const
    }
  ];
  const dimensions = { width: 128, height: 96 };
  const actual = await page.evaluate(async ({ requests, dimensions }) => {
    const renderer = window.__TWROLE_RENDER_TO_DATA_URL__;
    if (!renderer?.ready) throw new Error('Batch renderer is not ready.');

    const debugByMode: Record<string, FullRoleRenderDebugOptions> = {
      full: {},
      without_head: { hideParts: ['head'], hideHeadLayer: true },
      without_decorations: { hideDecorations: true },
      only_decorations: { onlyDecorations: true }
    };
    async function pixels(source: string): Promise<Uint8ClampedArray> {
      const image = new Image();
      image.src = source.startsWith('data:') ? source : `data:image/png;base64,${source}`;
      await image.decode();
      if (image.naturalWidth !== dimensions.width || image.naturalHeight !== dimensions.height) {
        throw new Error(`Unexpected output size: ${image.naturalWidth}×${image.naturalHeight}`);
      }
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not read rendered PNG pixels.');
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    const differentChannels = (left: Uint8ClampedArray, right: Uint8ClampedArray) =>
      left.reduce((sum, value, index) => sum + Number(value !== right[index]), 0);

    const compared = [];
    const onlyDecorations: Uint8ClampedArray[] = [];
    for (const { payload, background, modes } of requests) {
      const options = { ...dimensions, background };
      const ablations = await renderer.renderAblation({ ...options, payload, modes: [...modes] });
      const results = [];
      for (const mode of modes) {
        const oneOff = await renderer.render(payload, { ...options, debug: debugByMode[mode] });
        const fromBatch = await pixels(ablations.renders[mode]);
        const fromOneOff = await pixels(oneOff.dataUrl);
        if (mode === 'only_decorations') onlyDecorations.push(fromBatch);
        const zeroAlpha = fromBatch.reduce((count, value, index) =>
          count + Number(index % 4 === 3 && value === 0), 0);
        const nonOpaque = fromBatch.reduce((count, value, index) =>
          count + Number(index % 4 === 3 && value !== 255), 0);
        results.push({ mode, mismatchedChannels: differentChannels(fromBatch, fromOneOff), zeroAlpha, nonOpaque });
      }
      compared.push({ modes: Object.keys(ablations.renders), results });
    }
    return { compared, changedRoleChannels: differentChannels(onlyDecorations[0], onlyDecorations[2]) };
  }, { requests, dimensions });

  for (const [index, { modes, background }] of requests.entries()) {
    expect(actual.compared[index].modes).toEqual([...modes]);
    for (const { mode, mismatchedChannels, zeroAlpha, nonOpaque } of actual.compared[index].results) {
      expect(mismatchedChannels, `request ${index}, mode ${mode}`).toBe(0);
      if (background !== 'transparent') expect(nonOpaque).toBe(0);
      if (background === 'transparent' && mode === 'only_decorations') {
        expect(zeroAlpha).toBeGreaterThan(0);
        expect(zeroAlpha).toBeLessThan(dimensions.width * dimensions.height);
      }
    }
  }
  expect(actual.changedRoleChannels).toBeGreaterThan(0);
  expectNoPageErrors(monitor);
});
