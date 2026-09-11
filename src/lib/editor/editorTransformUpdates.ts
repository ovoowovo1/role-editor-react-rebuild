import type { DecorationLayer, RoleDocument } from '../../types/role';
import { touch } from './editorRoleUtils';

/** Only for pure transform commands; structural/mutating commands use updateRole. */
export function applyTransformUpdate(
  current: RoleDocument,
  updater: (role: RoleDocument) => RoleDocument
): RoleDocument {
  const next = updater(current);
  return next === current ? current : touch(next);
}

/** Map x/y/scaleX/scaleY/rotation only; other layer fields must not be edited here.
 * Retain unchanged values, including when clamping turns an edit into a no-op.
 */
export function mapDecorationTransforms(
  role: RoleDocument,
  transform: (layer: DecorationLayer) => DecorationLayer
): RoleDocument {
  let decorations: DecorationLayer[] | undefined;
  for (let index = 0; index < role.decorations.length; index++) {
    const before = role.decorations[index];
    const after = transform(before);
    if (before === after || (
      before.x === after.x && before.y === after.y &&
      before.scaleX === after.scaleX && before.scaleY === after.scaleY &&
      before.rotation === after.rotation
    )) continue;
    decorations ??= role.decorations.slice();
    decorations[index] = after;
  }
  return decorations ? { ...role, decorations } : role;
}
