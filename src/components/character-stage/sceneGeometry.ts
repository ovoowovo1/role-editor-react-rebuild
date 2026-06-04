import type { Container } from 'pixi.js';

export function getDisplayRootPosition(container: Container, root: Container): { x: number; y: number } {
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
