import { useMemo } from 'react';
import { filterPartOptionsByCamp } from '../mock/options';
import type { DecorationLayer, RoleDocument } from '../types/role';
import { groupMembershipSignature, makeGroupMap } from '../lib/editor/editorGroupMutations';
import { hasGroupableSelectedLayerIds } from '../lib/editor/headLayerMutations';
import { HEAD_LAYER_ID } from '../constants/layers';

export function useEditorDerivedState({
  role,
  selectedLayerIds,
  selectedDecorationIds,
  stableSelectedDecorations
}: {
  role: RoleDocument;
  selectedLayerIds: string[];
  selectedDecorationIds: string[];
  stableSelectedDecorations: DecorationLayer[];
}) {
  const visibleOptionsByTab = useMemo(
    () => ({
      deco: filterPartOptionsByCamp('deco', role.camp),
      head: filterPartOptionsByCamp('head', role.camp),
      hand: filterPartOptionsByCamp('hand', role.camp),
      foot: filterPartOptionsByCamp('foot', role.camp),
      cape: filterPartOptionsByCamp('cape', role.camp)
    }),
    [role.camp]
  );
  const groupMap = useMemo(() => makeGroupMap(role.groups ?? []), [role.groups]);
  // Group arrays are cloned during transform updates, so key this selector by
  // group membership content instead of the array identity.
  const groupMembershipKey = useMemo(
    () => groupMembershipSignature(role.groups ?? []),
    [role.groups]
  );
  // The selected decoration array is also recreated when the role changes;
  // its content is the only part relevant to groupability.
  const selectedDecorationKey = useMemo(
    () => JSON.stringify(selectedDecorationIds),
    [selectedDecorationIds]
  );
  const groupabilityInputs = useMemo(
    () => ({ groups: role.groups ?? [], selectedDecorationIds }),
    [groupMembershipKey, selectedDecorationKey]
  );
  const headLayerSelected = selectedLayerIds.includes(HEAD_LAYER_ID);
  const canGroupSelected = useMemo(
    () => hasGroupableSelectedLayerIds(
      groupabilityInputs.groups,
      groupabilityInputs.selectedDecorationIds,
      headLayerSelected
    ),
    [groupabilityInputs, headLayerSelected]
  );
  const canMergeSelected = stableSelectedDecorations.length > 0;

  return {
    visibleOptionsByTab,
    groupMap,
    canGroupSelected,
    canMergeSelected
  };
}
