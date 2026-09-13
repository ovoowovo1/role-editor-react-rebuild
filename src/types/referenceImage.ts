/** A runtime-only image layer. It is intentionally not part of RoleDocument. */
export interface ReferenceImageLayer {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
}

export const REFERENCE_IMAGE_LAYER_PREFIX = 'reference-image:';

export function referenceImageLayerToken(id: string): string {
  return `${REFERENCE_IMAGE_LAYER_PREFIX}${id}`;
}

export function referenceImageIdFromLayerToken(token: string): string | null {
  return token.startsWith(REFERENCE_IMAGE_LAYER_PREFIX)
    ? token.slice(REFERENCE_IMAGE_LAYER_PREFIX.length)
    : null;
}

export interface ReferenceImageTransformPatch {
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  visible?: boolean;
}
