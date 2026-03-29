import { Sprite } from "pixi.js";
import type { ItemIconId } from "./itemAtlas";
import { getItemIcon } from "./itemAtlas";

export function createLootSprite(itemId: ItemIconId): Sprite {
  const sprite = new Sprite(getItemIcon(itemId));
  sprite.anchor.set(0.5);
  return sprite;
}
