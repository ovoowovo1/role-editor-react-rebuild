import { Rectangle, Texture, type BaseTexture, type Sprite } from 'pixi.js';
import type { GafAtlasFrame } from '../../types/role';

const subTextureCache = new WeakMap<BaseTexture, Map<string, Texture>>();

/**
 * Reuse cropped sub-textures per BaseTexture + frame rectangle so 5,000-layer
 * scenes and frame-by-frame actor playback do not allocate fresh Texture objects.
 */
export function getCachedSubTexture(
  baseTexture: BaseTexture,
  x: number,
  y: number,
  width: number,
  height: number
): Texture {
  let cache = subTextureCache.get(baseTexture);
  if (!cache) {
    cache = new Map();
    subTextureCache.set(baseTexture, cache);
  }
  const key = `${x},${y},${width},${height}`;
  let texture = cache.get(key);
  if (!texture || texture.destroyed) {
    texture = new Texture(baseTexture, new Rectangle(x, y, width, height));
    cache.set(key, texture);
  }
  return texture;
}

/**
 * Applies GAF atlas registration to a sprite: pivot + inner scale, optional
 * runtime overrides that mirror TWLibLib baked bounds when present.
 */
export function applyGafAtlasToSprite(sprite: Sprite, atlas: GafAtlasFrame): void {
  sprite.anchor.set(0, 0);
  sprite.pivot.set(atlas.runtimePivotX ?? atlas.pivotX, atlas.runtimePivotY ?? atlas.pivotY);
  sprite.scale.set(atlas.scale || 1);
  const rw = atlas.runtimeDisplayWidth;
  const rh = atlas.runtimeDisplayHeight;
  if (rw != null && rh != null && rw > 0 && rh > 0) {
    sprite.width = rw;
    sprite.height = rh;
  }
}
