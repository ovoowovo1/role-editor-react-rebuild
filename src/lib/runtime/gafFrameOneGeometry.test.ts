import { describe, expect, it } from 'vitest';
import { resolveGafFrameOneDisplayList } from './gafFrameDisplayList';
import { resolveGafFrameOneGeometry } from './gafFrameOneGeometry';
import { decorationRuntimeManifest } from './gafRuntimeManifest';

const manifest = decorationRuntimeManifest!;
const defaultScale = manifest.timelineScale ?? 1;
const complexTimeline = manifest.timelinesByLinkage.third_xmas_deco_05;

describe('generated GAF frame-one geometry cache', () => {
  it('shares exactly the same painter-order geometry for every generated decoration timeline', () => {
    for (const timelineId of Object.keys(manifest.timelinesById)) {
      const original = resolveGafFrameOneDisplayList(manifest, timelineId, { timelineScale: defaultScale });
      const geometry = resolveGafFrameOneGeometry(manifest, timelineId, defaultScale);
      expect(geometry).toEqual(original.map(({ elementId, alpha, matrix }) => ({ elementId, alpha, matrix })));
      expect(resolveGafFrameOneGeometry(manifest, timelineId, defaultScale)).toBe(geometry);
    }
  });

  it('keeps cached results immutable without freezing pure or custom results', () => {
    const geometry = resolveGafFrameOneGeometry(manifest, complexTimeline, defaultScale);
    expect(geometry).toHaveLength(3);
    expect(Object.isFrozen(geometry)).toBe(true);
    expect(Object.isFrozen(geometry[0])).toBe(true);
    expect(Object.isFrozen(geometry[0].matrix)).toBe(true);
    expect(Object.isFrozen(resolveGafFrameOneDisplayList(manifest, complexTimeline))).toBe(false);

    const elementId = geometry[0].elementId;
    const custom = { ...manifest, elements: { ...manifest.elements, [elementId]: { ...manifest.elements[elementId] } } };
    const before = resolveGafFrameOneGeometry(custom, complexTimeline, defaultScale);
    custom.elements[elementId].pivotX += 20;
    const after = resolveGafFrameOneGeometry(custom, complexTimeline, defaultScale);
    expect(after).not.toBe(before);
    expect(after[0].matrix).not.toEqual(before[0].matrix);
    expect(resolveGafFrameOneGeometry(manifest, complexTimeline, defaultScale)).toBe(geometry);
  });

  it('does not mix or retain explicit alternate scale geometries', () => {
    const translated = manifest.timelinesByLinkage.third_deco_05;
    const normal = resolveGafFrameOneGeometry(manifest, translated, defaultScale);
    const override = resolveGafFrameOneGeometry(manifest, translated, defaultScale + 1);
    expect(override[0].matrix).not.toEqual(normal[0].matrix);
    expect(override[0].matrix).toEqual(resolveGafFrameOneDisplayList(
      manifest, translated, { timelineScale: defaultScale + 1 }
    )[0].matrix);
    expect(resolveGafFrameOneGeometry(manifest, translated, defaultScale + 1)).not.toBe(override);
  });
});
