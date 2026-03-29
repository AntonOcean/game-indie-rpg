import type { Container, Texture } from "pixi.js";
import type { RenderRegistry } from "./renderRegistry";
import { createPlayerSprite } from "./playerVisual";

/**
 * Единственное место создания графики игрока (вместе с RenderSystem — мутация Pixi).
 */
export function mountPlayerVisual(
  worldRoot: Container,
  registry: RenderRegistry,
  idleTexture: Texture
): number {
  const renderId = registry.allocateId();
  const sprite = createPlayerSprite(idleTexture);
  registry.nodes.set(renderId, sprite);
  worldRoot.addChild(sprite);
  return renderId;
}
