import { Sprite, type Texture } from "pixi.js";
import { characterSpriteWorldScale } from "../constants/characterAssets";

/** Спрайт орка (первый кадр idle); центр = Position. */
export function createEnemySprite(texture: Texture): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  const s = characterSpriteWorldScale();
  sprite.scale.set(s);
  return sprite;
}
