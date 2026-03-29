import type { Container, Texture } from "pixi.js";
import type { RenderRegistry } from "./renderRegistry";
import { createEnemySprite } from "./enemyVisual";

export function mountEnemyVisual(
  worldRoot: Container,
  registry: RenderRegistry,
  idleTexture: Texture
): number {
  const renderId = registry.allocateId();
  const sprite = createEnemySprite(idleTexture);
  registry.nodes.set(renderId, sprite);
  worldRoot.addChild(sprite);
  return renderId;
}
