import type { PartOption, RoleDocument } from '../../types/role';
import { getBodyPartOption, optionById } from '../../mock/options';

/**
 * Probes whether an atlas PNG URL can be loaded (same-origin / public asset).
 * Cached per URL to avoid repeated network work when rebuilding PIXI stage.
 */
const probeCache = new Map<string, Promise<boolean>>();

export function probeAtlasTextureUrl(url: string): Promise<boolean> {
  const existing = probeCache.get(url);
  if (existing) return existing;

  const promise = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
  probeCache.set(url, promise);
  return promise;
}

export async function partitionAtlasTextureUrls(
  urls: string[]
): Promise<{ ok: Set<string>; failed: Set<string> }> {
  const unique = [...new Set(urls.filter(Boolean))];
  const results = await Promise.all(unique.map((u) => probeAtlasTextureUrl(u)));
  const ok = new Set<string>();
  const failed = new Set<string>();
  unique.forEach((u, i) => (results[i] ? ok.add(u) : failed.add(u)));
  return { ok, failed };
}

/** All atlas texture URLs needed to draw the current role in the stage (body parts + decorations). */
export function collectAtlasTextureUrlsForRole(role: RoleDocument): string[] {
  const urls = new Set<string>();
  const add = (opt?: PartOption) => {
    if (opt?.atlas?.texture) urls.add(opt.atlas.texture);
  };
  add(getBodyPartOption('head', role.parts.head));
  add(getBodyPartOption('hand', role.parts.hand));
  add(getBodyPartOption('foot', role.parts.foot));
  add(getBodyPartOption('cape', role.parts.cape));
  for (const deco of role.decorations) {
    add(optionById[deco.assetId]);
  }
  return [...urls];
}
