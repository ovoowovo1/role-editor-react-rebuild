import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { DecorationLayer, PartOption } from '../../types/role';
import { optionById } from '../../mock/options';
import {
  decorationAtlasFrames,
  decorationRuntimeManifest,
  gafSources
} from '../../mock/gafManifest';
import { clamp } from '../../lib/math';
import { applyGafAtlasToSprite } from '../../lib/runtime/gafAtlasSprite';
import { createGafClip } from '../../lib/runtime/gafMovieClip';
import { isMissingDecoAssetId } from '../../lib/serialization/roleSerialization';
import {
  displayTransformPatchForDecoration,
  type DisplayTransformPatch
} from '../../lib/stage/characterStageHelpers';
import type { DisguiseDecoOptions } from './types';

const ALPHA_MASK_DECO_CODES: Set<string> = new Set();

function makeOptionSprite(option: PartOption | undefined, failedTextures: Set<string>): Sprite | null {
  if (!option?.atlas) {
    return Sprite.from(option?.icon ?? optionById[Object.keys(optionById)[0]].icon);
  }
  if (failedTextures.has(option.atlas.texture)) {
    return null;
  }
  const atlasTexture = Texture.from(option.atlas.texture);
  const texture = new Texture(
    atlasTexture.baseTexture,
    new Rectangle(option.atlas.x, option.atlas.y, option.atlas.width, option.atlas.height)
  );
  return new Sprite(texture);
}

function makeMissingDecoGraphic(size = 28): Graphics {
  const half = size / 2;
  const graphic = new Graphics();
  graphic.beginFill(0xff66aa, 0.18);
  graphic.lineStyle({ width: 1.5, color: 0xff66aa, alpha: 0.9 });
  graphic.drawRect(-half, -half, size, size);
  graphic.endFill();
  graphic.lineStyle({ width: 1, color: 0xff66aa, alpha: 0.9 });
  graphic.moveTo(-half, -half);
  graphic.lineTo(half, half);
  graphic.moveTo(half, -half);
  graphic.lineTo(-half, half);
  return graphic;
}

function applySpriteRegistration(
  sprite: Sprite,
  option: PartOption | undefined,
  fallbackSize: number,
  failedTextures: Set<string>
) {
  if (option?.atlas && !failedTextures.has(option.atlas.texture)) {
    applyGafAtlasToSprite(sprite, option.atlas);
    return;
  }
  sprite.anchor.set(0.5);
  sprite.width = fallbackSize;
  sprite.height = fallbackSize;
}

export function createDecorationVisual(deco: DecorationLayer, failedTextures: Set<string>): Container | null {
  const option = optionById[deco.assetId];
  const missing = !option || isMissingDecoAssetId(deco.assetId);
  const wrapper = new Container();
  wrapper.position.set(deco.x, deco.y);
  wrapper.rotation = (deco.rotation * Math.PI) / 180;
  wrapper.scale.set(deco.scaleX, deco.scaleY);
  wrapper.alpha = clamp(deco.opacity, 0, 1);
  wrapper.visible = deco.visible !== false;
  wrapper.eventMode = 'none';

  if (missing) {
    wrapper.addChild(makeMissingDecoGraphic(28));
  } else if (decorationRuntimeManifest) {
    const linkage = option.code || deco.code;
    const fallback = option.atlas ? [option.atlas] : decorationAtlasFrames[linkage] ? [decorationAtlasFrames[linkage]] : [];
    const clip = createGafClip(
      failedTextures,
      linkage,
      decorationRuntimeManifest,
      gafSources.decorationsTexture,
      fallback,
      { alphaMask: ALPHA_MASK_DECO_CODES.has(linkage), timelineScale: decorationRuntimeManifest.timelineScale }
    );
    wrapper.addChild(clip);
  } else {
    const sprite = makeOptionSprite(option, failedTextures);
    if (!sprite) return null;
    applySpriteRegistration(sprite, option, 64, failedTextures);
    wrapper.addChild(sprite);
  }

  return wrapper;
}

export function createDisguiseEntryDisplay(
  deco: DecorationLayer,
  failedTextures: Set<string>,
  disguiseRoot: Container,
  decoOptions: DisguiseDecoOptions
): Container | null {
  const wrapper = createDecorationVisual(deco, failedTextures);
  if (!wrapper) return null;
  wrapper.eventMode = 'static';
  wrapper.cursor = 'pointer';

  wrapper.on('pointerdown', (event) => {
    decoOptions.onPointerDown(deco.id, event, disguiseRoot);
  });
  return wrapper;
}

export function applyDisplayTransform(wrapper: Container, patch: DisplayTransformPatch): void {
  wrapper.position.set(patch.x, patch.y);
  wrapper.rotation = patch.rotationRadians;
  wrapper.scale.set(patch.scaleX, patch.scaleY);
  wrapper.alpha = patch.alpha;
  wrapper.visible = patch.visible;
}

export function applyDecorationDisplayTransform(wrapper: Container, deco: DecorationLayer): void {
  applyDisplayTransform(wrapper, displayTransformPatchForDecoration(deco));
}
