import generatedDecorationRuntime from '../../generated/gafDecorationRuntimeManifest.json';
import type { GafRuntimeManifest } from '../../types/gafRuntime';

/**
 * Decoration-only runtime for the AutoCreate Worker. Importing the combined
 * runtime JSON here would also duplicate the multi-megabyte actor timelines in
 * the Worker bundle even though AutoCreate never reads them.
 */
export const autoCreateDecorationRuntimeManifest = generatedDecorationRuntime as GafRuntimeManifest;
