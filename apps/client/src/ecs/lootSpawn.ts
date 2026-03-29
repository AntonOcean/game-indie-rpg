import { addComponent, addEntity, type World } from "bitecs";
import { LOOT } from "../constants/gameBalance";
import { Hitbox, Loot, Position, RenderRef } from "./components";

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
  Hitbox.width[eid] = LOOT.HITBOX_SIZE;
  Hitbox.height[eid] = LOOT.HITBOX_SIZE;
  return eid;
}
