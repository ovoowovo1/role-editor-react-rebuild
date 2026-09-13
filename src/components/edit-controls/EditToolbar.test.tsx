import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditToolbar } from './EditToolbar';

function renderToolbar(headGlowAlwaysOn: boolean): string {
  return renderToStaticMarkup(
    <EditToolbar
      disabled
      faceDisabled
      bodyAnimationLabel="idle"
      bodyAnimationPlaying={false}
      playbackToolVisible={false}
      headGlowAlwaysOn={headGlowAlwaysOn}
      stageScale={1}
      stageMinScale={0.5}
      stageMaxScale={2}
      onCancelSelection={vi.fn()}
      onFlip={vi.fn()}
      onMirrorCopyHorizontal={vi.fn()}
      onMirrorCopyVertical={vi.fn()}
      onFaceRotate={vi.fn()}
      onOpenWeaponAnimation={vi.fn()}
      onStartWeaponAnimation={vi.fn()}
      onStopWeaponAnimation={vi.fn()}
      onRestartWeaponAnimation={vi.fn()}
      onTogglePlaybackTool={vi.fn()}
      onToggleHeadGlowAlwaysOn={vi.fn()}
      onStageScaleChange={vi.fn()}
    />
  );
}

describe('EditToolbar head glow toggle', () => {
  it('renders an enabled toggle independently of selection state', () => {
    const html = renderToolbar(false);
    expect(html).toContain('data-testid="toolbar-head-glow-toggle-button"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toMatch(/data-testid="toolbar-head-glow-toggle-button"[^>]*disabled/);
  });

  it('reflects the active always-on state', () => {
    const html = renderToolbar(true);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('關閉頭部長亮綠邊');
  });
});
