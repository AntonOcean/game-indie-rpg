import { hasComponent, query, type World } from "bitecs";
import { Dead, Enemy, Hitbox, Position } from "./components";

function pointInEntityHitbox(wx: number, wy: number, eid: number): boolean {
  const hw = Hitbox.width[eid] / 2;
  const hh = Hitbox.height[eid] / 2;
  const cx = Position.x[eid];
  const cy = Position.y[eid];
  return (
    wx >= cx - hw &&
    wx <= cx + hw &&
    wy >= cy - hh &&
    wy <= cy + hh
  );
}

/**
 * Возвращает eid врага под точкой мира или -1.
 * При нескольких пересечениях — ближайший к точке клика (по квадрату расстояния).
 */
export function pickEnemyAtWorld(
  world: World,
  wx: number,
  wy: number
): number {
  const entities = query(world, [Enemy, Position, Hitbox]);
  let best = -1;
  let bestD2 = Infinity;
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    if (hasComponent(world, eid, Dead)) {
      continue;
    }
    if (!pointInEntityHitbox(wx, wy, eid)) {
      continue;
    }
    const dx = Position.x[eid] - wx;
    const dy = Position.y[eid] - wy;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = eid;
    }
  }
  return best;
}
