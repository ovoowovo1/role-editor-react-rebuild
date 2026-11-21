import type { Container, Matrix } from 'pixi.js';

// Decoration containers normally live directly under the disguise root. Their
// local transform already maps points into the desired coordinate space.
export function directDisplayTransformInRoot(container: Container, root: Container): Matrix | null {
  if (container.parent !== root) return null;
  container.transform.updateLocalTransform();
  return container.transform.localTransform;
}

export function getDisplayRootPosition(container: Container, root: Container): { x: number; y: number } {
  const direct = directDisplayTransformInRoot(container, root);
  if (direct) return { x: direct.tx, y: direct.ty };
  const global = container.toGlobal({ x: 0, y: 0 });
  const local = root.toLocal(global);
  return { x: local.x, y: local.y };
}

export function reparentPreservingPosition(container: Container, parent: Container): { x: number; y: number } {
  const global = container.toGlobal({ x: 0, y: 0 });
  if (container.parent) {
    container.parent.removeChild(container);
  }
  parent.addChild(container);
  const local = parent.toLocal(global);
  container.position.set(local.x, local.y);
  return { x: local.x, y: local.y };
}
