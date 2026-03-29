import { Sprite, type Texture } from "pixi.js";
import { characterSpriteWorldScale } from "../constants/characterAssets";

/**
 * Спрайт солдата (первый кадр idle); anchor в центре — как Position и AABB хитбокса.
 */
export function createPlayerSprite(texture: Texture): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  const s = characterSpriteWorldScale();
  sprite.scale.set(s);
  return sprite;
}
