import { Graphics } from "pixi.js";
import { ENEMY } from "../constants/gameBalance";

/** Красный квадрат; центр = Position (как у игрока). */
export function createEnemyGraphics(): Graphics {
  const s = ENEMY.VISUAL_SIZE;
  const half = s / 2;
  const g = new Graphics();
  g.rect(-half, -half, s, s).fill({
    color: ENEMY.VISUAL_COLOR,
  });
  return g;
}
