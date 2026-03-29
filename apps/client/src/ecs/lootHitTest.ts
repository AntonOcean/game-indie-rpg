import { query, type World } from "bitecs";
import { Hitbox, Loot, LootState, LootStateEnum, Position } from "./components";

/** Ближайший к точке лут в `idle` (экранный тап → intent резерва). */
export function pickLootEntityAtWorld(
  world: World,
  worldX: number,
  worldY: number
): number {
  const q = query(world, [Loot, LootState, Position, Hitbox]);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < q.length; i++) {
    const eid = q[i]!;
    if (LootState.state[eid] !== LootStateEnum.Idle) {
      continue;
    }
    const cx = Position.x[eid];
    const cy = Position.y[eid];
    const hw = Hitbox.width[eid] / 2;
    const hh = Hitbox.height[eid] / 2;
    if (
      worldX < cx - hw ||
      worldX > cx + hw ||
      worldY < cy - hh ||
      worldY > cy + hh
    ) {
      continue;
    }
    const d = Math.hypot(worldX - cx, worldY - cy);
    if (d < bestD) {
      bestD = d;
      best = eid;
    }
  }
  return best;
}
