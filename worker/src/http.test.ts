import { describe, expect, it } from 'vitest';
import { getAllowedOrigins, getCorsHeaders, jsonResponse } from './http';

describe('worker HTTP helpers', () => {
  it('parses configured allowed origins with trimming', () => {
    expect(getAllowedOrigins({ ALLOWED_ORIGINS: ' https://a.test,https://b.test ,, ' })).toEqual([
      'https://a.test',
      'https://b.test'
    ]);
  });

  it('returns CORS headers only for allowed origins', () => {
    const env = { ALLOWED_ORIGINS: 'https://allowed.test' };

    expect(getCorsHeaders(new Request('https://worker.test/api', {
      headers: { Origin: 'https://allowed.test' }
    }), env)).toMatchObject({
      'Access-Control-Allow-Origin': 'https://allowed.test',
      Vary: 'Origin'
    });
    expect(getCorsHeaders(new Request('https://worker.test/api', {
      headers: { Origin: 'https://blocked.test' }
    }), env)).toBeNull();
  });

  it('merges JSON response headers with CORS headers', async () => {
    const response = jsonResponse(
      new Request('https://worker.test/api', { headers: { Origin: 'https://allowed.test' } }),
      { ALLOWED_ORIGINS: 'https://allowed.test' },
      { ok: true },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );

    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.test');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
