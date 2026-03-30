import { addComponent, addEntity, type World } from "bitecs";
import { LOOT } from "../constants/gameBalance";
import {
  Hitbox,
  Loot,
  LootItemKind,
  LootItemKindEnum,
  LootItemQty,
  LootReserve,
  LootState,
  LootStateEnum,
  Position,
  RenderRef,
} from "./components";

export function spawnLootEntity(
  world: World,
  renderId: number,
  worldX: number,
  worldY: number,
  kind: (typeof LootItemKindEnum)[keyof typeof LootItemKindEnum],
  quantity: number
): number {
  const eid = addEntity(world);
  addComponent(world, eid, Loot);
  addComponent(world, eid, LootState);
  LootState.state[eid] = LootStateEnum.Idle;
  addComponent(world, eid, LootReserve);
  LootReserve.reservedBy[eid] = 0;
  LootReserve.reserveTimer[eid] = 0;
  addComponent(world, eid, LootItemKind);
  LootItemKind.kind[eid] = kind;
  addComponent(world, eid, LootItemQty);
  LootItemQty.quantity[eid] = Math.max(1, Math.floor(quantity));

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
