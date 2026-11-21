import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { md5Hex } from './md5';

function expectedMd5(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

it.each([
  ['', 'd41d8cd98f00b204e9800998ecf8427e'],
  ['a', '0cc175b9c0f1b6a831c399e269772661'],
  ['abc', '900150983cd24fb0d6963f7d28e17f72'],
  ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
  ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
  ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'd174ab98d277d9f5a5611c2c9f419d9f'],
  ['1234567890'.repeat(8), '57edf4a22be3c955ac49da2e2107b67a']
])('matches the RFC test vector for %s', (value, digest) => {
  expect(md5Hex(value)).toBe(digest);
});

it('matches UTF-8 byte padding boundaries for ASCII and multibyte input', () => {
  for (const bytes of [54, 55, 56, 57, 63, 64, 65, 118, 119, 120, 121, 127, 128, 129]) {
    for (const terminal of ['', 'é', '粵', '🧩', '🇭🇰', '\ud800', '\udc00']) {
      const value = 'a'.repeat(bytes - Buffer.byteLength(terminal)) + terminal;
      expect(Buffer.byteLength(value)).toBe(bytes);
      expect(md5Hex(value), `at ${bytes} bytes with ${JSON.stringify(terminal)}`).toBe(expectedMd5(value));
    }
  }
  expect(md5Hex('\ud800X\udc00')).toBe(md5Hex('\ufffdX\ufffd'));
});

it('keeps long data URLs and Unicode sequences byte-exact', () => {
  const cases = [
    '🇭🇰 粵語 é e\u0301 👩🏽‍💻 \u0000 \ud800X\udc00'.repeat(319),
    'data:image/png;base64,' + Buffer.from(Uint8Array.from({ length: 256 * 1024 }, (_, i) => i % 241)).toString('base64')
  ];
  for (const value of cases) expect(md5Hex(value)).toBe(expectedMd5(value));
});
