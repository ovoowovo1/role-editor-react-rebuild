import type { PartOption } from '../../types/role';

const RUNTIME_PREVIEW_CAPE_FRAMES = new Set([2, 7, 13, 15, 16, 21, 24]);

export function shouldUseActorPartRuntimePreview(option: PartOption | undefined): boolean {
  if (!option?.actorLibrary || option.frame == null || option.category !== 'cape' || option.isEmpty) return false;
  return RUNTIME_PREVIEW_CAPE_FRAMES.has(option.frame);
}
