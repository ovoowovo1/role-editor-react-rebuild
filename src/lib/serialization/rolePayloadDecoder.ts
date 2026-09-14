import { ungzip } from 'pako';
import { TWROLE_HEADER } from './roleSerializationLegacy';

function tryParseJsonText(bytes: Uint8Array): unknown | null {
  const text = new TextDecoder().decode(bytes).trim();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function tryDecodeBase64(text: string): Uint8Array | null {
  try {
    const binary = atob(text.trim());
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export function decodeRolePayload(bytes: Uint8Array): unknown {
  if (bytes.length > 2 && bytes[0] === TWROLE_HEADER[0] && bytes[1] === TWROLE_HEADER[1]) {
    const text = ungzip(bytes.slice(2), { to: 'string' }) as string;
    const payload = JSON.parse(text) as unknown;
    if (payload) return payload;
  }

  const json = tryParseJsonText(bytes);
  if (json) return json;

  try {
    const text = ungzip(bytes, { to: 'string' }) as string;
    const payload = JSON.parse(text) as unknown;
    if (payload) return payload;
  } catch {
    const text = new TextDecoder().decode(bytes).trim();
    const decoded = tryDecodeBase64(text);
    if (decoded) {
      try {
        const jsonText = ungzip(decoded, { to: 'string' }) as string;
        const payload = JSON.parse(jsonText) as unknown;
        if (payload) return payload;
      } catch {
        // Fall through to the stable unsupported-format error below.
      }
    }
  }

  throw new Error('Unsupported role file. Expected JSON, .twrole header+gzip, raw gzip JSON, or base64 gzip JSON.');
}
