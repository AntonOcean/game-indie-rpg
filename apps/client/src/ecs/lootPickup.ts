import {
  addComponent,
  entityExists,
  hasComponent,
  query,
  removeEntity,
  type World,
} from "bitecs";
import { ITEMS, LOOT } from "../constants/gameBalance";
import type { GameEventQueues } from "../events/gameEventQueues";
import type { InventoryService } from "../state/inventoryService";
import type { GameTime } from "./gameTime";
import {
  DespawnTimer,
  Hitbox,
  Loot,
  LootItemKind,
  LootItemKindEnum,
  LootItemQty,
  LootReserve,
  LootState,
  LootStateEnum,
  Player,
  Position,
  RenderRef,
} from "./components";

function distanceCenters(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  return Math.hypot(ax - bx, ay - by);
}

function lootItemKindString(kind: number): string | undefined {
  if (kind === LootItemKindEnum.Gold) {
    return ITEMS.GOLD;
  }
  if (kind === LootItemKindEnum.PotionHp) {
    return ITEMS.POTION_HP;
  }
  return undefined;
}

/**
 * FSM лута: idle → reserved → despawning → remove (run-17).
 * Радиус подбора, reserved/таймаут, LootGranted в current (применение золота — фаза 3).
 */
export function runLootSystem(
  world: World,
  playerEid: number,
  gameTime: GameTime,
  queues: GameEventQueues,
  inventoryService: InventoryService,
  outDestroyRenderIds: number[]
): boolean {
  if (!hasComponent(world, playerEid, Player)) {
    return false;
  }
  let granted = false;
  const px = Position.x[playerEid];
  const py = Position.y[playerEid];
  const dt = gameTime.dt;

  const despawnQs = query(world, [
    Loot,
    LootState,
    DespawnTimer,
    Position,
    RenderRef,
  ]);
  for (let i = 0; i < despawnQs.length; i++) {
    const leid = despawnQs[i]!;
    if (LootState.state[leid] !== LootStateEnum.Despawning) {
      continue;
    }
    DespawnTimer.timer[leid] -= dt;
    if (DespawnTimer.timer[leid] <= 0) {
      outDestroyRenderIds.push(RenderRef.renderId[leid]);
      removeEntity(world, leid);
    }
  }

  const activeLoot = query(world, [
    Loot,
    LootState,
    LootReserve,
    LootItemKind,
    LootItemQty,
    Position,
    Hitbox,
    RenderRef,
  ]);

  for (let i = 0; i < activeLoot.length; i++) {
    const leid = activeLoot[i]!;
    const st = LootState.state[leid];
    if (st === LootStateEnum.Despawning) {
      continue;
    }

    const lx = Position.x[leid];
    const ly = Position.y[leid];
    const dist = distanceCenters(px, py, lx, ly);
    const inRadius = dist < LOOT.PICKUP_RADIUS;

    if (st === LootStateEnum.Reserved) {
      const by = LootReserve.reservedBy[leid];
      if (by === 0 || !entityExists(world, by)) {
        LootState.state[leid] = LootStateEnum.Idle;
        LootReserve.reservedBy[leid] = 0;
        LootReserve.reserveTimer[leid] = 0;
        continue;
      }
      if (LootReserve.reserveTimer[leid] <= 0) {
        LootState.state[leid] = LootStateEnum.Idle;
        LootReserve.reservedBy[leid] = 0;
        LootReserve.reserveTimer[leid] = 0;
        continue;
      }
      if (inRadius) {
        const kind = LootItemKind.kind[leid] ?? LootItemKindEnum.Gold;
        const itemKind = lootItemKindString(kind);
        if (!itemKind) {
          LootState.state[leid] = LootStateEnum.Idle;
          LootReserve.reservedBy[leid] = 0;
          LootReserve.reserveTimer[leid] = 0;
          continue;
        }

        const qty = LootItemQty.quantity[leid] ?? 1;
        const r = inventoryService.tryAddItem(itemKind, qty);
        if (!r.ok) {
          LootState.state[leid] = LootStateEnum.Idle;
          LootReserve.reservedBy[leid] = 0;
          LootReserve.reserveTimer[leid] = 0;
          continue;
        }

        queues.emitLootGranted({
          tickId: gameTime.tickId,
          entityId: leid,
          itemKind,
          pickerEid: by,
        });
        granted = true;
        LootState.state[leid] = LootStateEnum.Despawning;
        LootReserve.reservedBy[leid] = 0;
        LootReserve.reserveTimer[leid] = 0;
        addComponent(world, leid, DespawnTimer);
        DespawnTimer.timer[leid] = LOOT.DESPAWN_TIME;
        continue;
      }
      LootReserve.reserveTimer[leid] -= dt;
      continue;
    }

    if (st === LootStateEnum.Idle && inRadius) {
      LootState.state[leid] = LootStateEnum.Reserved;
      LootReserve.reservedBy[leid] = playerEid;
      LootReserve.reserveTimer[leid] = LOOT.RESERVE_TIMEOUT;
    }
  }
  return granted;
}
