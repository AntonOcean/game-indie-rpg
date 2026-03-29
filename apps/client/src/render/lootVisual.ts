import { Graphics } from "pixi.js";
import { LOOT } from "../constants/gameBalance";

/** Жёлтый квадрат «монета»; центр = Position. */
export function createLootGraphics(): Graphics {
  const s = LOOT.VISUAL_SIZE;
  const half = s / 2;
  const g = new Graphics();
  g.rect(-half, -half, s, s).fill({
    color: LOOT.VISUAL_COLOR,
  });
  return g;
}
