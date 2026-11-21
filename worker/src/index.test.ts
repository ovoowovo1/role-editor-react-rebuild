import { expect, it, vi } from 'vitest';
import handler from './index';

it('returns an empty list for unknown camps without opening Hyperdrive', async () => {
  const getHyperdrive = vi.fn(() => { throw new Error('Unexpected Hyperdrive access'); });
  const env = { ALLOWED_ORIGINS: 'https://editor.test', get HYPERDRIVE() { return getHyperdrive(); } };
  for (const pathname of ['/color-block-presets', '/api/color-block-presets']) {
    const response = await handler.fetch(new Request(`https://api.test${pathname}?camp=%20unknown%20`, {
      headers: { Origin: 'https://editor.test' }
    }), env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://editor.test');
    await expect(response.json()).resolves.toEqual([]);
  }
  expect(getHyperdrive).not.toHaveBeenCalled();
});
