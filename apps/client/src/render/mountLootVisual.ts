import type { Container } from "pixi.js";
import type { RenderRegistry } from "./renderRegistry";
import { createLootGraphics } from "./lootVisual";

/** Создаёт узел лута в мире и регистрирует его; центр в мировых пикселях. */
export function createLootVisualAt(
  worldRoot: Container,
  registry: RenderRegistry,
  worldX: number,
  worldY: number
): number {
  const renderId = registry.allocateId();
  const graphics = createLootGraphics();
  registry.nodes.set(renderId, graphics);
  worldRoot.addChild(graphics);
  graphics.position.set(worldX, worldY);
  return renderId;
}
