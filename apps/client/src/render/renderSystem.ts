import { query, type World } from "bitecs";
import type { RenderRegistry } from "./renderRegistry";
import { Position, RenderRef } from "../ecs/components";

/**
 * Синхронизация ECS → реестр Pixi. Единственное место сдвига визуала по Position.
 */
export function runRenderSystem(world: World, registry: RenderRegistry): void {
  const entities = query(world, [Position, RenderRef]);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    const id = RenderRef.renderId[eid];
    const node = registry.nodes.get(id);
    if (!node) continue;
    node.position.set(Position.x[eid], Position.y[eid]);
  }
}
