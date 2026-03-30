import { addComponent, addEntity, type World } from "bitecs";
import { AI as AICfg, ENEMY } from "../constants/gameBalance";
import type { GameMapMeta } from "../gameMap";
import {
  AI,
  AIState,
  CombatState,
  Enemy,
  Health,
  Hitbox,
  AttackCooldown,
  Position,
  RenderRef,
  StuckDetector,
  Velocity,
} from "./components";
import { addCharacterAnimationFacing } from "./initCharacterVisualAnimation";
import { tileCenterWorldPx } from "./playerSpawn";

/** Предпочтительная клетка врага; при блоке ищется ближайшая проходимая (BFS). */
const ENEMY_SPAWN_PREFERRED_TILE = { tx: 20, ty: 10 } as const;

let enemySpawnIndex = 0;

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

  addComponent(world, eid, CombatState);
  CombatState.state[eid] = 0; // alive

  addComponent(world, eid, Velocity);
  Velocity.vx[eid] = 0;
  Velocity.vy[eid] = 0;

  addComponent(world, eid, AttackCooldown);
  AttackCooldown.untilSec[eid] = 0;

  const spawnIx = enemySpawnIndex++;
  addComponent(world, eid, AI);
  AI.state[eid] = AIState.Idle;
  AI.targetId[eid] = 0;
  AI.aggroRadius[eid] = AICfg.AGGRO_RADIUS;
  AI.attackRange[eid] = AICfg.ATTACK_RANGE;
  AI.nextThinkTime[eid] = 0;
  AI.thinkOffset[eid] = spawnIx % AICfg.THINK_PHASE_N;
  AI.thinkSeed[eid] = spawnIx * 9973 + 1;

  addComponent(world, eid, StuckDetector);
  StuckDetector.lastX[eid] = x;
  StuckDetector.lastY[eid] = y;
  StuckDetector.stuckTime[eid] = 0;

  addCharacterAnimationFacing(world, eid, "orc");

  return eid;
}
