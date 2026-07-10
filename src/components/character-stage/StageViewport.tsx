import { memo, type MutableRefObject } from 'react';

interface Size {
  width: number;
  height: number;
}

interface StageViewportProps {
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  stageBgRef: MutableRefObject<HTMLDivElement | null>;
  surfaceSize: Size;
  viewportSize: Size;
  stageScale: number;
}

export const StageViewport = memo(function StageViewport({
  viewportRef,
  hostRef,
  stageBgRef,
  surfaceSize,
  viewportSize,
  stageScale
}: StageViewportProps) {
  return (
    <section className="stage-panel">
      <div ref={viewportRef} className="stage-viewport">
        <div
          className="stage-scroll-surface"
          style={{
            width: `${surfaceSize.width}px`,
            height: `${surfaceSize.height}px`
          }}
        >
          <div
            ref={stageBgRef}
            className="stage-bg"
            aria-hidden="true"
            style={{
              transform: `translate(-50%, -50%) rotate(90deg) scale(${stageScale})`
            }}
          >
            <div className="piece" />
            <div className="piece piece-two" />
          </div>
          <div
            ref={hostRef}
            className="pixi-host"
            style={{
              width: `${viewportSize.width}px`,
              height: `${viewportSize.height}px`
            }}
          />
        </div>
      </div>
    </section>
  );
});
