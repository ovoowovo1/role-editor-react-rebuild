import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditToolbar } from './EditToolbar';

function renderToolbar(headGlowAlwaysOn: boolean, facingQuarterTurns = 0): string {
  return renderToStaticMarkup(
    <EditToolbar
      disabled
      faceDisabled
      bodyAnimationLabel="idle"
      bodyAnimationPlaying={false}
      playbackToolVisible={false}
      headGlowAlwaysOn={headGlowAlwaysOn}
      facingQuarterTurns={facingQuarterTurns}
      stageScale={1}
      stageMinScale={0.5}
      stageMaxScale={2}
      onCancelSelection={vi.fn()}
      onFlip={vi.fn()}
      onMirrorCopyHorizontal={vi.fn()}
      onMirrorCopyVertical={vi.fn()}
      onCenterMirrorCopyHorizontal={vi.fn()}
      onCenterMirrorCopyVertical={vi.fn()}
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

  it('renders centre mirror copy buttons without changing the toolbar container', () => {
    const html = renderToolbar(false);
    expect(html).toContain('class="tool-row"');
    expect(html).toContain('data-testid="toolbar-center-mirror-copy-horizontal-button"');
    expect(html).toContain('data-testid="toolbar-center-mirror-copy-vertical-button"');
    expect(html).toMatch(/data-testid="toolbar-center-mirror-copy-horizontal-button"[^>]*disabled/);
    expect(html).toMatch(/data-testid="toolbar-center-mirror-copy-vertical-button"[^>]*disabled/);
    expect(html).toContain('>vertical_align_center</span>');
    expect(html).toContain('>format_align_center</span>');
    expect(html).toContain('水平鏡像複製並移到中心');
    expect(html).toContain('垂直鏡像複製並移到中心');
  });

  it.each([
    [0, '-90deg'],
    [1, '0deg'],
    [2, '90deg'],
    [3, '180deg']
  ])('rotates the face icon for quarter turn %i', (turns, rotation) => {
    const html = renderToolbar(false, turns);
    expect(html).toContain(`style="transform:rotate(${rotation})"`);
  });
});
