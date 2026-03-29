import type { Container } from "pixi.js";
import type { ItemIconId } from "./itemAtlas";
import type { RenderRegistry } from "./renderRegistry";
import { createLootSprite } from "./lootVisual";

/** Создаёт спрайт лута в мире и регистрирует его; центр в мировых пикселях. */
export function createLootVisualAt(
  worldRoot: Container,
  registry: RenderRegistry,
  worldX: number,
  worldY: number,
  itemId: ItemIconId
): number {
  const renderId = registry.allocateId();
  const sprite = createLootSprite(itemId);
  registry.nodes.set(renderId, sprite);
  worldRoot.addChild(sprite);
  sprite.position.set(worldX, worldY);
  return renderId;
}
