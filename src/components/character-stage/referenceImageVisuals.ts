import { Container, Sprite, Texture } from 'pixi.js';
import type { ReferenceImageLayer } from '../../types/referenceImage';
import type { ReferenceImageOptions, ReferenceImageDisplayRecord } from './types';
import type { StagePointerPosition } from './types';

function imageTransformKey(image: ReferenceImageLayer): string {
  return [image.x, image.y, image.scale, image.opacity, image.visible].join('\u0000');
}

export function createReferenceImageDisplay(
  image: ReferenceImageLayer,
  root: Container,
  options: ReferenceImageOptions,
  interactionEnabled: boolean
): ReferenceImageDisplayRecord {
  const container = new Container();
  const sprite = new Sprite(Texture.from(image.src));
  sprite.anchor.set(0.5);
  container.addChild(sprite);
  container.eventMode = interactionEnabled ? 'static' : 'none';
  container.cursor = interactionEnabled ? 'pointer' : 'default';
  container.on('pointerdown', (event: { global: StagePointerPosition }) => {
    options.onPointerDown(image.id, { x: event.global.x, y: event.global.y }, root);
  });
  return { container, sprite, displayKey: image.src, appliedImage: undefined };
}

export function applyReferenceImageDisplayTransform(
  record: ReferenceImageDisplayRecord,
  image: ReferenceImageLayer
): void {
  record.container.position.set(image.x, image.y);
  // The texture's natural dimensions provide the image size; changing Sprite
  // width before an object URL finishes loading would bake in a wrong scale.
  record.sprite.scale.set(1);
  record.container.scale.set(image.scale);
  record.container.alpha = image.opacity;
  record.container.visible = image.visible;
  record.appliedImage = image;
}

export function syncReferenceImageDisplayRecords(
  root: Container,
  images: readonly ReferenceImageLayer[],
  records: Map<string, ReferenceImageDisplayRecord>,
  options: ReferenceImageOptions,
  interactionEnabled: boolean,
  reorder = true
): void {
  const byId = new Map(images.map((image) => [image.id, image]));
  for (const [id, record] of records) {
    const image = byId.get(id);
    if (!image || record.displayKey !== image.src) {
      record.container.parent?.removeChild(record.container);
      if (!record.container.destroyed) record.container.destroy({ children: true });
      records.delete(id);
    }
  }

  for (const image of images) {
    let record = records.get(image.id);
    if (!record) {
      record = createReferenceImageDisplay(image, root, options, interactionEnabled);
      records.set(image.id, record);
    }
    record.container.eventMode = interactionEnabled ? 'static' : 'none';
    record.container.cursor = interactionEnabled ? 'pointer' : 'default';
    const key = imageTransformKey(image);
    if (record.appliedImage !== image && (!record.appliedImage || imageTransformKey(record.appliedImage) !== key)) {
      applyReferenceImageDisplayTransform(record, image);
    }
  }

  if (reorder) {
    const ordered = images
      .map((image) => records.get(image.id)?.container)
      .filter((container): container is Container => Boolean(container));
    if (root.children.length !== ordered.length || root.children.some((child, index) => child !== ordered[index])) {
      root.removeChildren();
      root.addChild(...ordered);
    }
  }
}
