import { useCallback, useState } from 'react';
import { DEFAULT_ACTOR_BODY_ANIMATION_LABEL } from '../../lib/runtime/actorBodyAnimation';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { PartTab } from '../../types/role';
import type { TopBarMode } from '../TabBar';

export function useEditorShellUiState(initialTopBarMode: TopBarMode, onPartTabChange: (tab: PartTab) => void) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [insertSettingsOpen, setInsertSettingsOpen] = useState(false);
  const [weaponAnimationOpen, setWeaponAnimationOpen] = useState(false);
  const [bodyAnimationLabel, setBodyAnimationLabel] = useState(DEFAULT_ACTOR_BODY_ANIMATION_LABEL);
  const [bodyAnimationPlaying, setBodyAnimationPlaying] = useState(false);
  const [bodyAnimationRestartKey, setBodyAnimationRestartKey] = useState(0);
  const [facingQuarterTurns, setFacingQuarterTurns] = useState(0);
  const [topBarMode, setTopBarMode] = useState<TopBarMode>(initialTopBarMode);
  const [brushFillActive, setBrushFillActive] = useState(false);
  const [brushFillBrushSize, setBrushFillBrushSize] = useState(18);
  const [brushFillMask, setBrushFillMask] = useState<BrushFillMask>({ points: [] });

  const handleTopBarChange = useCallback(
    (mode: TopBarMode) => {
      setTopBarMode(mode);
      if (mode !== 'extra') setBrushFillActive(false);
      if (mode !== 'colorBlock' && mode !== 'extra') {
        onPartTabChange(mode);
      }
    },
    [onPartTabChange]
  );

  const clearBrushFillMask = useCallback(() => setBrushFillMask({ points: [] }), []);
  const rotateFacing = useCallback(() => setFacingQuarterTurns((turns) => (turns + 1) % 4), []);
  const restartBodyAnimation = useCallback(() => {
    setBodyAnimationRestartKey((key) => key + 1);
    setBodyAnimationPlaying(false);
  }, []);

  return {
    shortcutsOpen,
    setShortcutsOpen,
    insertSettingsOpen,
    setInsertSettingsOpen,
    weaponAnimationOpen,
    setWeaponAnimationOpen,
    bodyAnimationLabel,
    setBodyAnimationLabel,
    bodyAnimationPlaying,
    setBodyAnimationPlaying,
    bodyAnimationRestartKey,
    setBodyAnimationRestartKey,
    facingQuarterTurns,
    topBarMode,
    brushFillActive,
    setBrushFillActive,
    brushFillBrushSize,
    setBrushFillBrushSize,
    brushFillMask,
    setBrushFillMask,
    handleTopBarChange,
    clearBrushFillMask,
    rotateFacing,
    restartBodyAnimation
  };
}
