import { describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type express from 'express';
import {
  createRendererApp,
  createTaskQueue,
  type EvaluateMethod,
  type RendererClient
} from './serverCore';

interface RendererCall {
  method: EvaluateMethod;
  payload: unknown;
}

function fakeRenderer(calls: RendererCall[] = []): RendererClient {
  return {
    async call(method, payload) {
      calls.push({ method, payload });
      if (method === 'getRendererInfo') {
        return {
          ok: true,
          renderer: 'fake',
          version: 'test',
          pixiReady: true,
          assetsReady: true,
          assetManifestHash: 'hash',
          canvasSize: { width: 128, height: 128 },
          renderMode: 'test'
        };
      }
      return { ok: true, method, payload };
    }
  };
}

async function withServer<T>(app: express.Express, run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function postJson(baseUrl: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('renderer server core', () => {
  it('rejects invalid render endpoint bodies before calling the renderer', async () => {
    const calls: RendererCall[] = [];
    const app = createRendererApp({ renderer: fakeRenderer(calls), commit: 'test' });

    await withServer(app, async (baseUrl) => {
      const cases = [
        ['/render-role', {}, 'payload is required.'],
        ['/render-role-batch', {}, 'items must be an array.'],
        ['/score-role', { candidate: {}, metrics: [] }, 'targetPngBase64 is required.'],
        ['/render-ablation', { payload: {} }, 'modes must be an array.']
      ] as const;

      for (const [path, body, expectedError] of cases) {
        const response = await postJson(baseUrl, path, body);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ ok: false, error: expectedError });
      }
    });

    expect(calls).toEqual([]);
  });

  it('normalizes valid render endpoint payload defaults', async () => {
    const calls: RendererCall[] = [];
    const app = createRendererApp({ renderer: fakeRenderer(calls), commit: 'test' });

    await withServer(app, async (baseUrl) => {
      await expect((await postJson(baseUrl, '/render-role', { payload: { id: 'role' }, width: '64' })).json())
        .resolves.toMatchObject({ ok: true, method: 'renderRole' });
      await expect((await postJson(baseUrl, '/render-role-batch', { items: [], height: '32' })).json())
        .resolves.toMatchObject({ ok: true, method: 'renderRoleBatch' });
      await expect((await postJson(baseUrl, '/score-role', {
        targetPngBase64: 'abc',
        candidate: { id: 'role' },
        metrics: []
      })).json()).resolves.toMatchObject({ ok: true, method: 'scoreRole' });
      await expect((await postJson(baseUrl, '/render-ablation', {
        payload: { id: 'role' },
        modes: ['base'],
        width: 12,
        height: 'bad',
        background: '#fff'
      })).json()).resolves.toMatchObject({ ok: true, method: 'renderAblation' });
    });

    expect(calls).toEqual([
      {
        method: 'renderRole',
        payload: { payload: { id: 'role' }, width: 64, height: 64, background: 'transparent' }
      },
      {
        method: 'renderRoleBatch',
        payload: { items: [], width: 128, height: 32, background: 'transparent' }
      },
      {
        method: 'scoreRole',
        payload: { targetPngBase64: 'abc', candidate: { id: 'role' }, metrics: [], background: 'transparent' }
      },
      {
        method: 'renderAblation',
        payload: { payload: { id: 'role' }, modes: ['base'], width: 12, height: 12, background: '#fff' }
      }
    ]);
  });

  it('continues queued tasks after a task fails', async () => {
    const queue = createTaskQueue();
    const failed = queue.enqueue({ run: async () => { throw new Error('first failed'); } });
    const passed = queue.enqueue({ run: async () => 'second passed' });

    await expect(failed).rejects.toThrow('first failed');
    await expect(passed).resolves.toBe('second passed');
  });
});
