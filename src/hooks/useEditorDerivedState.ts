import { useMemo } from 'react';
import { filterPartOptionsByCamp } from '../mock/options';
import type { DecorationLayer, RoleDocument } from '../types/role';
import { makeGroupMap } from '../lib/editor/editorGroupMutations';
import { hasGroupableSelectedLayerIds } from '../lib/editor/headLayerMutations';

export function useEditorDerivedState({
  role,
  selectedLayerIds,
  stableSelectedDecorations
}: {
  role: RoleDocument;
  selectedLayerIds: string[];
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
  const canGroupSelected = useMemo(
    () => hasGroupableSelectedLayerIds(role, selectedLayerIds),
    [role, selectedLayerIds]
  );
  const canMergeSelected = stableSelectedDecorations.length > 0;

  return {
    visibleOptionsByTab,
    groupMap,
    canGroupSelected,
    canMergeSelected
  };
}
