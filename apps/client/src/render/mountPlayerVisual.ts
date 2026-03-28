import type { Container } from "pixi.js";
import type { RenderRegistry } from "./renderRegistry";
import { createPlayerGraphics } from "./playerVisual";

/**
 * Единственное место создания графики игрока (вместе с RenderSystem — мутация Pixi).
 */
export function mountPlayerVisual(
  worldRoot: Container,
  registry: RenderRegistry
): number {
  const renderId = registry.allocateId();
  const graphics = createPlayerGraphics();
  registry.nodes.set(renderId, graphics);
  worldRoot.addChild(graphics);
  return renderId;
}
