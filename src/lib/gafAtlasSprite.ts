import type { Sprite } from 'pixi.js';
import type { GafAtlasFrame } from '../types/role';

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
