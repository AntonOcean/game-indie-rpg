import type { Container } from "pixi.js";
import type { RenderRegistry } from "./renderRegistry";
import { createEnemyGraphics } from "./enemyVisual";

export function mountEnemyVisual(
  worldRoot: Container,
  registry: RenderRegistry
): number {
  const renderId = registry.allocateId();
  const graphics = createEnemyGraphics();
  registry.nodes.set(renderId, graphics);
  worldRoot.addChild(graphics);
  return renderId;
}
