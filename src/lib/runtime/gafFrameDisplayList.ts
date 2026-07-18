import type {
  GafElementSerialized,
  GafFrameInstanceSerialized,
  GafMatrixSerialized,
  GafRuntimeManifest,
  GafTimelineSerialized
} from '../../types/gafRuntime';

const IDENTITY_MATRIX: GafMatrixSerialized = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const TYPE_TEXTURE = 'texture';
const TYPE_TIMELINE = 'timeline';

export interface GafTextureDisplayItem {
  kind: 'texture';
  /** Painter order in the returned, already-flattened display list. */
  order: number;
  /** The z-index at each timeline level, from the root to this texture. */
  zIndexPath: number[];
  /** Object ids at each timeline level, from the root to this texture. */
  objectIdPath: string[];
  timelineId: string;
  objectId: string;
  elementId: string;
  atlasID: string;
  elementAtlasID: string;
  region: GafElementSerialized['region'];
  /** Cumulative alpha across every containing timeline instance. */
  alpha: number;
  maskId: string | null;
  colorTransform: number[] | null;
  /**
   * Atlas-region pixel to root-timeline affine transform.
   *
   * Pixi can apply this matrix directly to a zero-anchor sprite. Canvas can
   * pass the six fields to `setTransform` before drawing the atlas region at
   * local (0, 0).
   */
  matrix: GafMatrixSerialized;
}

export interface ResolveGafFrameOneDisplayListOptions {
  /** Overrides the scale serialized with the manifest. */
  timelineScale?: number;
  /** Protects consumers from malformed manifests with excessively deep nesting. */
  maxDepth?: number;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

/** Returns the affine transform which applies `right`, followed by `left`. */
export function multiplyGafMatrices(left: GafMatrixSerialized, right: GafMatrixSerialized): GafMatrixSerialized {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    tx: left.a * right.tx + left.c * right.ty + left.tx,
    ty: left.b * right.tx + left.d * right.ty + left.ty
  };
}

function copyMatrix(matrix: GafMatrixSerialized): GafMatrixSerialized {
  return {
    a: finiteOr(matrix.a, 1),
    b: finiteOr(matrix.b, 0),
    c: finiteOr(matrix.c, 0),
    d: finiteOr(matrix.d, 1),
    tx: finiteOr(matrix.tx, 0),
    ty: finiteOr(matrix.ty, 0)
  };
}

function textureInstanceMatrix(instance: GafFrameInstanceSerialized, timelineScale: number): GafMatrixSerialized {
  const matrix = copyMatrix(instance.matrix);
  matrix.tx *= timelineScale;
  matrix.ty *= timelineScale;
  return matrix;
}

function elementPivotMatrix(element: GafElementSerialized): GafMatrixSerialized {
  const scaleX = Number.isFinite(element.scaleX) && Math.abs(element.scaleX) > 1e-8 ? element.scaleX : 1;
  const scaleY = Number.isFinite(element.scaleY) && Math.abs(element.scaleY) > 1e-8 ? element.scaleY : 1;
  return {
    a: 1 / scaleX,
    b: 0,
    c: 0,
    d: 1 / scaleY,
    tx: -finiteOr(element.pivotX, 0) / scaleX,
    ty: -finiteOr(element.pivotY, 0) / scaleY
  };
}

function resolveTimeline(manifest: GafRuntimeManifest, linkageOrId: string): GafTimelineSerialized | null {
  const linkedId = manifest.timelinesByLinkage[linkageOrId];
  if (linkedId != null && linkedId !== '') return manifest.timelinesById[linkedId] ?? null;
  return manifest.timelinesById[linkageOrId] ?? null;
}

function sortedFrameOneInstances(timeline: GafTimelineSerialized): GafFrameInstanceSerialized[] {
  return (timeline.frames['1'] ?? [])
    .map((instance, sourceOrder) => ({ instance, sourceOrder }))
    .sort((left, right) => left.instance.zIndex - right.instance.zIndex || left.sourceOrder - right.sourceOrder)
    .map(({ instance }) => instance);
}

/**
 * Resolves a GAF timeline's first frame into renderer-neutral texture draws.
 *
 * Mask objects and unresolved regions are omitted, matching the existing GAF
 * preview behavior. Nested timelines are expanded in-place so the array order
 * is also the painter order. The serialized `timelineScale` applies to leaf
 * texture translations, as it does in `GafMovieClip`; nested container matrices
 * remain ordinary parent transforms.
 */
export function resolveGafFrameOneDisplayList(
  manifest: GafRuntimeManifest,
  linkageOrId: string,
  options: ResolveGafFrameOneDisplayListOptions = {}
): GafTextureDisplayItem[] {
  const rootTimeline = resolveTimeline(manifest, linkageOrId);
  if (!rootTimeline) return [];

  const requestedScale = options.timelineScale ?? manifest.timelineScale ?? 1;
  const timelineScale = Number.isFinite(requestedScale) ? requestedScale : 1;
  const requestedMaxDepth = options.maxDepth ?? 64;
  const maxDepth = Number.isFinite(requestedMaxDepth) ? Math.max(0, Math.floor(requestedMaxDepth)) : 64;
  const result: GafTextureDisplayItem[] = [];
  const activeTimelineIds = new Set<string>();

  const visit = (
    timeline: GafTimelineSerialized,
    parentMatrix: GafMatrixSerialized,
    parentAlpha: number,
    zIndexPath: readonly number[],
    objectIdPath: readonly string[],
    depth: number
  ): void => {
    if (depth > maxDepth || activeTimelineIds.has(timeline.id)) return;
    activeTimelineIds.add(timeline.id);

    for (const instance of sortedFrameOneInstances(timeline)) {
      const animationObject = timeline.animationObjects[instance.objectId];
      if (!animationObject || animationObject.mask) continue;

      const nextZIndexPath = [...zIndexPath, instance.zIndex];
      const nextObjectIdPath = [...objectIdPath, instance.objectId];
      const alpha = parentAlpha * clamp01(instance.alpha);

      if (animationObject.type === TYPE_TEXTURE) {
        const element = manifest.elements[animationObject.regionId];
        if (!element) continue;
        const localMatrix = multiplyGafMatrices(
          textureInstanceMatrix(instance, timelineScale),
          elementPivotMatrix(element)
        );
        result.push({
          kind: 'texture',
          order: result.length,
          zIndexPath: nextZIndexPath,
          objectIdPath: nextObjectIdPath,
          timelineId: timeline.id,
          objectId: instance.objectId,
          elementId: animationObject.regionId,
          atlasID: element.atlasID,
          elementAtlasID: element.elementAtlasID,
          region: { ...element.region },
          alpha,
          maskId: instance.maskId,
          colorTransform: instance.colorTransform ? [...instance.colorTransform] : null,
          matrix: multiplyGafMatrices(parentMatrix, localMatrix)
        });
        continue;
      }

      if (animationObject.type === TYPE_TIMELINE) {
        const childTimeline = manifest.timelinesById[animationObject.regionId];
        if (!childTimeline) continue;
        visit(
          childTimeline,
          multiplyGafMatrices(parentMatrix, copyMatrix(instance.matrix)),
          alpha,
          nextZIndexPath,
          nextObjectIdPath,
          depth + 1
        );
      }
    }

    activeTimelineIds.delete(timeline.id);
  };

  visit(rootTimeline, IDENTITY_MATRIX, 1, [], [], 0);
  return result;
}
