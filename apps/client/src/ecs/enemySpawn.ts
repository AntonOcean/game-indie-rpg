import { addComponent, addEntity, type World } from "bitecs";
import { ENEMY } from "../constants/gameBalance";
import type { GameMapMeta } from "../gameMap";
import { Enemy, Health, Hitbox, Position, RenderRef } from "./components";
import { tileCenterWorldPx } from "./playerSpawn";

/** Предпочтительная клетка врага; при блоке ищется ближайшая проходимая (BFS). */
const ENEMY_SPAWN_PREFERRED_TILE = { tx: 20, ty: 10 } as const;

export function pickWalkableSpawnTile(
  meta: GameMapMeta,
  preferredTx: number,
  preferredTy: number
): { tx: number; ty: number } {
  const seen = new Set<string>();
  const q: Array<{ tx: number; ty: number }> = [
    { tx: preferredTx, ty: preferredTy },
  ];
  while (q.length > 0) {
    const { tx, ty } = q.shift()!;
    if (tx < 0 || ty < 0 || tx >= meta.mapWidth || ty >= meta.mapHeight) {
      continue;
    }
    const k = `${tx},${ty}`;
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    const i = ty * meta.mapWidth + tx;
    if (meta.collisionData[i] === 0) {
      return { tx, ty };
    }
    q.push(
      { tx: tx + 1, ty },
      { tx: tx - 1, ty },
      { tx, ty: ty + 1 },
      { tx, ty: ty - 1 }
    );
  }
  throw new Error("game-rpg: no walkable tile for enemy spawn");
}

export function spawnEnemyEntity(
  world: World,
  renderId: number,
  meta: GameMapMeta
): number {
  const { tx, ty } = pickWalkableSpawnTile(
    meta,
    ENEMY_SPAWN_PREFERRED_TILE.tx,
    ENEMY_SPAWN_PREFERRED_TILE.ty
  );
  const { x, y } = tileCenterWorldPx(tx, ty, meta);

  const eid = addEntity(world);
  addComponent(world, eid, Enemy);
  addComponent(world, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;

  addComponent(world, eid, RenderRef);
  RenderRef.renderId[eid] = renderId;

  addComponent(world, eid, Hitbox);
  Hitbox.width[eid] = ENEMY.HITBOX_SIZE;
  Hitbox.height[eid] = ENEMY.HITBOX_SIZE;

  addComponent(world, eid, Health);
  Health.current[eid] = ENEMY.HP;
  Health.max[eid] = ENEMY.HP;

  return eid;
}
