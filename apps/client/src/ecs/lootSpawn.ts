import { addComponent, addEntity, type World } from "bitecs";
import { Hitbox, Loot, Position, RenderRef } from "./components";
import { PLAYER_HITBOX_PX } from "./playerSpawn";

/** Хитбокс лута совпадает с масштабом игрока (MVP). */
const LOOT_HITBOX_PX = PLAYER_HITBOX_PX;

export function spawnLootEntity(
  world: World,
  renderId: number,
  worldX: number,
  worldY: number
): number {
  const eid = addEntity(world);
  addComponent(world, eid, Loot);
  addComponent(world, eid, Position);
  Position.x[eid] = worldX;
  Position.y[eid] = worldY;
  addComponent(world, eid, RenderRef);
  RenderRef.renderId[eid] = renderId;
  addComponent(world, eid, Hitbox);
  Hitbox.width[eid] = LOOT_HITBOX_PX;
  Hitbox.height[eid] = LOOT_HITBOX_PX;
  return eid;
}
