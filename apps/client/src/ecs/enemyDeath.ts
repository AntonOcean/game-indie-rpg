import { addComponent, hasComponent, query, type World } from "bitecs";
import { Dead, Enemy, Health, Position } from "./components";

/**
 * Смерть врага: после нанесения урона (combat). Добавляет `Dead`, вызывает колбэк
 * для спавна лута в позиции трупа. Мёртвые не обрабатываются повторно.
 *
 * Порядок pipeline: см. `GAME_PIPELINE_ORDER` — `death` сразу после `combat`, до подбора лута.
 */
export function processEnemyDeath(
  world: World,
  spawnLootAt: (worldX: number, worldY: number) => void
): void {
  const entities = query(world, [Enemy, Health, Position]);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    if (hasComponent(world, eid, Dead)) {
      continue;
    }
    if (Health.current[eid] > 0) {
      continue;
    }
    addComponent(world, eid, Dead);
    spawnLootAt(Position.x[eid], Position.y[eid]);
  }
}
