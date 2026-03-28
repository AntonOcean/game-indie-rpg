import { Graphics } from "pixi.js";

const ENEMY_SQUARE_PX = 24;

/** Красный квадрат; центр = Position (как у игрока). */
export function createEnemyGraphics(): Graphics {
  const half = ENEMY_SQUARE_PX / 2;
  const g = new Graphics();
  g.rect(-half, -half, ENEMY_SQUARE_PX, ENEMY_SQUARE_PX).fill({
    color: 0xcc3333,
  });
  return g;
}
