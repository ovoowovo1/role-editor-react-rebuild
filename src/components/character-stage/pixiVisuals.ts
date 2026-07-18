import { Container } from 'pixi.js';
import type { DecorationLayer } from '../../types/role';
import { createDecorationVisual } from '../../lib/stage/decorationVisual';
import {
  displayTransformPatchForDecoration,
  type DisplayTransformPatch
} from '../../lib/stage/characterStageHelpers';
import type { DisguiseDecoOptions } from './types';

export { createDecorationVisual };

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
    decoOptions.onPointerDown(
      deco.id,
      { x: event.global.x, y: event.global.y },
      disguiseRoot
    );
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
