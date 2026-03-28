import { Graphics } from "pixi.js";

const PLAYER_SQUARE_PX = 24;

/**
 * Синий квадрат; геометрия от центра (совпадает с Position как центром сущности).
 */
export function createPlayerGraphics(): Graphics {
  const half = PLAYER_SQUARE_PX / 2;
  const g = new Graphics();
  g.rect(-half, -half, PLAYER_SQUARE_PX, PLAYER_SQUARE_PX).fill({
    color: 0x3366ff,
  });
  return g;
}
