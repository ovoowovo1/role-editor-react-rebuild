import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { computeRenderMetrics, compositeScore, contributionFromAblations, imageDeltaMagnitude } from './lib/stage/renderMetrics';

const { render, capture, createCapture } = vi.hoisted(() => ({
  render: vi.fn(), capture: vi.fn(), createCapture: vi.fn()
}));
vi.mock('pixi.js', () => ({ Assets: { load: vi.fn(async () => undefined) } }));
vi.mock('./lib/stage/fullRoleRenderer', () => ({ renderFullRoleToDataUrl: render, captureFullRoleForBatch: capture, createBatchRoleCapture: createCapture }));
vi.mock('./mock/gafManifest', () => ({ defaultGafAssetManifest: {}, gafSources: {} }));

beforeEach(() => {
  createCapture.mockImplementation((payload: unknown) =>
    (options: unknown, mode: unknown) => capture(payload, options, mode)
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  render.mockReset();
  capture.mockReset();
  createCapture.mockReset();
});

it('reuses the full render for scoring without changing the per-part or overall metrics', async () => {
  const image = (red: number) => ({ width: 1, height: 1, data: Uint8ClampedArray.of(red, 0, 0, 255) });
  const target = image(200);
  const candidate = image(180);
  const ablated = { head: image(20), hand: image(55), foot: image(75), cape: image(100), deco: image(150) };
  capture.mockImplementation(async (_payload, options) => {
    const hidden = options.debug?.hideParts?.[0] as 'head' | 'hand' | 'foot' | 'cape' | undefined;
    return { imageData: options.debug?.hideDecorations ? ablated.deco : hidden ? ablated[hidden] : candidate };
  });
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', {
    body: { style: {}, dataset: {} },
    createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => target }) })
  });
  vi.stubGlobal('Image', class {
    naturalWidth = 1;
    naturalHeight = 1;
    async decode() { return undefined; }
  });
  await import('./batchRender');

  const metrics = ['fake_part_score', 'full_role_rgba_mse_alpha_weighted'] as const;
  const expected = computeRenderMetrics(target, candidate, [...metrics], contributionFromAblations({
    head: imageDeltaMagnitude(candidate, ablated.head),
    hand: imageDeltaMagnitude(candidate, ablated.hand),
    foot: imageDeltaMagnitude(candidate, ablated.foot),
    cape: imageDeltaMagnitude(candidate, ablated.cape),
    deco: imageDeltaMagnitude(candidate, ablated.deco)
  }));
  const api = window.__TWROLE_RENDER_TO_DATA_URL__!;
  const response = await api.scoreRole({ targetPngBase64: 'test', candidate: {}, metrics: [...metrics] });
  expect(response).toMatchObject({ ok: true, metrics: expected, score: compositeScore(expected, 1, 1) });
  expect(createCapture).toHaveBeenCalledExactlyOnceWith({});
  expect(capture).toHaveBeenCalledTimes(6);
  expect(capture.mock.calls.filter(([, options]) => !options.debug)).toHaveLength(1);
  expect(capture.mock.calls.map(([, , mode]) => mode)).toEqual(Array(6).fill('pixels'));
  expect(render).not.toHaveBeenCalled();
});

it('encodes only the requested ablation PNGs, with unchanged contribution metrics', async () => {
  const image = (red: number) => ({ width: 1, height: 1, data: Uint8ClampedArray.of(red, 0, 0, 255) });
  const full = image(180);
  const ablated = { head: image(20), hand: image(55), foot: image(75), cape: image(100), deco: image(150) };
  capture.mockImplementation(async (_payload, options, mode) => {
    const hidden = options.debug?.hideParts?.[0] as 'head' | 'hand' | 'foot' | 'cape' | undefined;
    return {
      imageData: options.debug?.hideDecorations ? ablated.deco : hidden ? ablated[hidden] : full,
      dataUrl: mode === 'both' ? `data:image/png;base64,${hidden ?? 'full'}` : '',
      width: 1,
      height: 1
    };
  });
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', { body: { style: {}, dataset: {} } });
  await import('./batchRender');

  const api = window.__TWROLE_RENDER_TO_DATA_URL__!;
  await expect(api.renderAblation({ payload: {}, modes: ['without_head', 'full'], width: 1, height: 1 }))
    .resolves.toEqual({
      ok: true,
      renders: { without_head: 'head', full: 'full' },
      partContribution: contributionFromAblations({
        head: imageDeltaMagnitude(full, ablated.head),
        hand: imageDeltaMagnitude(full, ablated.hand),
        foot: imageDeltaMagnitude(full, ablated.foot),
        cape: imageDeltaMagnitude(full, ablated.cape),
        deco: imageDeltaMagnitude(full, ablated.deco)
      })
    });
  expect(createCapture).toHaveBeenCalledExactlyOnceWith({});
  expect(capture.mock.calls.map(([, , mode]) => mode))
    .toEqual(['both', 'both', 'pixels', 'pixels', 'pixels', 'pixels']);
});

it('preserves batch PNG output, dimensions, failure isolation, and input order without pixel readback', async () => {
  capture.mockImplementation(async (payload) => {
    if (payload === 'bad') throw new Error('failed item');
    return {
      dataUrl: `data:image/png;base64,${payload}`,
      width: 64, height: 32, warnings: [], missingTextureCount: 0
    };
  });
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', { body: { style: {}, dataset: {} } });
  await import('./batchRender');

  const api = window.__TWROLE_RENDER_TO_DATA_URL__!;
  expect(await api.renderRoleBatch({
    items: [{ id: 'a', payload: 'first' }, { id: 'b', payload: 'bad' }, { id: 'c', payload: 'last' }],
    width: 64, height: 32
  })).toMatchObject({
    ok: false,
    items: [
      { id: 'a', ok: true, pngBase64: 'first', width: 64, height: 32 },
      { id: 'b', ok: false, error: 'failed item' },
      { id: 'c', ok: true, pngBase64: 'last', width: 64, height: 32 }
    ]
  });
  expect(createCapture).not.toHaveBeenCalled();
  expect(capture.mock.calls.map(([, , mode]) => mode)).toEqual(['png', 'png', 'png']);
  expect(api.render).toBe(render);
});
