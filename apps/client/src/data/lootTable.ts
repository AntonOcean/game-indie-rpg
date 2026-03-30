import { deterministicRng } from "../util/deterministicRng";

export type LootDrop = {
  itemId: "gold" | "potion_hp";
  quantity: number;
};

export function rollLoot(
  enemyType: "orc",
  seed: number,
  tickId: number
): LootDrop[] {
  void enemyType;

  const drops: LootDrop[] = [];

  // 100%: gold 1–3
  const rGold = deterministicRng(seed ^ 0x13579bdf, tickId);
  const goldQty = 1 + Math.floor(rGold * 3);
  drops.push({ itemId: "gold", quantity: goldQty });

  // 30%: 1 potion
  const rPotion = deterministicRng(seed ^ 0x2468ace0, tickId);
  if (rPotion < 0.3) {
    drops.push({ itemId: "potion_hp", quantity: 1 });
  }

  return drops;
}

