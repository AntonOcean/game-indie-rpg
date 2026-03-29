import { Graphics } from "pixi.js";
import { PLAYER } from "../constants/gameBalance";

/**
 * Синий квадрат; геометрия от центра (совпадает с Position как центром сущности).
 */
export function createPlayerGraphics(): Graphics {
  const s = PLAYER.VISUAL_SIZE;
  const half = s / 2;
  const g = new Graphics();
  g.rect(-half, -half, s, s).fill({
    color: PLAYER.VISUAL_COLOR,
  });
  return g;
}
