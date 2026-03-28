import { hasComponent, query, type World } from "bitecs";
import type { RenderRegistry } from "./renderRegistry";
import { Dead, Enemy, Position, RenderRef } from "../ecs/components";

/**
 * Синхронизация ECS → реестр Pixi: уничтожение узлов удалённых сущностей, скрытие
 * мёртвых врагов, позиции по `Position` (architecture.md — адаптер рендера).
 */
export function runRenderSystem(
  world: World,
  registry: RenderRegistry,
  pendingDestroyRenderIds: number[]
): void {
  for (let i = 0; i < pendingDestroyRenderIds.length; i++) {
    const id = pendingDestroyRenderIds[i];
    const node = registry.nodes.get(id);
    if (node) {
      node.destroy();
      registry.nodes.delete(id);
    }
  }
  pendingDestroyRenderIds.length = 0;

  const deadEnemies = query(world, [Enemy, Dead, RenderRef]);
  for (let i = 0; i < deadEnemies.length; i++) {
    const eid = deadEnemies[i];
    const node = registry.nodes.get(RenderRef.renderId[eid]);
    if (node) {
      node.visible = false;
    }
  }

  const entities = query(world, [Position, RenderRef]);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    const id = RenderRef.renderId[eid];
    const node = registry.nodes.get(id);
    if (!node) continue;
    if (hasComponent(world, eid, Enemy) && hasComponent(world, eid, Dead)) {
      continue;
    }
    node.visible = true;
    node.position.set(Position.x[eid], Position.y[eid]);
  }
}
