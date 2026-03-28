import { Graphics } from "pixi.js";

const LOOT_SQUARE_PX = 20;

/** Жёлтый квадрат «монета»; центр = Position. */
export function createLootGraphics(): Graphics {
  const half = LOOT_SQUARE_PX / 2;
  const g = new Graphics();
  g.rect(-half, -half, LOOT_SQUARE_PX, LOOT_SQUARE_PX).fill({
    color: 0xe6c200,
  });
  return g;
}
