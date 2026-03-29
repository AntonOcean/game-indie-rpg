import { hasComponent, query, type World } from "bitecs";
import { AI, AIState } from "./components/ai";
import {
  Animation,
  Dead,
  Enemy,
  Facing,
  Hitbox,
  Position,
  StuckDetector,
  Velocity,
} from "./components";
import { AI as AICfg } from "../constants/gameBalance";
import { deterministicRng } from "../util/deterministicRng";
import type { GameMapMeta } from "../gameMap";
import type { GameTime } from "./gameTime";
import { moveEntityWithTileCollisions } from "./playerLocomotion";
import { AnimState, FacingDir } from "../animation/animationTypes";
import {
  mergeAnimationIntent,
  type AnimationIntentBuffer,
} from "../animation/animationIntentBuffer";

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

function setFacingToward(
  eid: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void {
  if (Facing.locked[eid]) {
    return;
  }
  const dx = toX - fromX;
  if (Math.abs(dx) < 1e-4) {
    return;
  }
  Facing.direction[eid] = dx < 0 ? FacingDir.Left : FacingDir.Right;
}

/**
 * До движения: скорость врага из `AI.state`, заданного в конце прошлого кадра.
 * Stuck: перпендикуляр к направлению на цель на один «такт» скорости.
 */
export function applyEnemyVelocityFromAI(
  world: World,
  playerEid: number,
  gameTime: GameTime
): void {
  if (!hasComponent(world, playerEid, Position)) {
    return;
  }
  if (hasComponent(world, playerEid, Dead)) {
    const stopped = query(world, [Enemy, Velocity]);
    for (let i = 0; i < stopped.length; i++) {
      const eid = stopped[i]!;
      if (hasComponent(world, eid, Dead)) {
        continue;
      }
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
    }
    return;
  }
  const px = Position.x[playerEid];
  const py = Position.y[playerEid];

  const ents = query(world, [Enemy, AI, Position, Velocity, Hitbox, StuckDetector]);
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]!;
    if (hasComponent(world, eid, Dead)) {
      continue;
    }

    const state = AI.state[eid];
    if (state === AIState.Idle || state === AIState.Attack) {
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
      if (state === AIState.Attack && AI.targetId[eid] !== 0) {
        const tid = AI.targetId[eid];
        if (hasComponent(world, tid, Position)) {
          setFacingToward(
            eid,
            Position.x[eid],
            Position.y[eid],
            Position.x[tid],
            Position.y[tid]
          );
        }
      }
      continue;
    }

    const tid = AI.targetId[eid];
    if (tid === 0 || !hasComponent(world, tid, Position)) {
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
      continue;
    }

    const ex = Position.x[eid];
    const ey = Position.y[eid];
    const tx = Position.x[tid];
    const ty = Position.y[tid];
    let dx = tx - ex;
    let dy = ty - ey;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) {
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
      continue;
    }
    dx /= len;
    dy /= len;

    if (StuckDetector.stuckTime[eid] >= AICfg.STUCK_TIME_THRESHOLD) {
      const sign = deterministicRng(AI.thinkSeed[eid], gameTime.tickId + 777) < 0.5 ? 1 : -1;
      const pxv = -dy * sign;
      const pyv = dx * sign;
      Velocity.vx[eid] = pxv * AICfg.MOVE_SPEED;
      Velocity.vy[eid] = pyv * AICfg.MOVE_SPEED;
      StuckDetector.stuckTime[eid] = 0;
      StuckDetector.lastX[eid] = ex;
      StuckDetector.lastY[eid] = ey;
    } else {
      Velocity.vx[eid] = dx * AICfg.MOVE_SPEED;
      Velocity.vy[eid] = dy * AICfg.MOVE_SPEED;
    }

    setFacingToward(eid, ex, ey, tx, ty);
  }
}

/** После коллизий: накопление stuck только в chase. */
export function updateStuckDetectorsAfterMovement(
  world: World,
  gameTime: GameTime
): void {
  const ents = query(world, [Enemy, AI, Position, StuckDetector]);
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]!;
    if (hasComponent(world, eid, Dead)) {
      continue;
    }

    const x = Position.x[eid];
    const y = Position.y[eid];

    if (AI.state[eid] !== AIState.Chase) {
      StuckDetector.stuckTime[eid] = 0;
      StuckDetector.lastX[eid] = x;
      StuckDetector.lastY[eid] = y;
      continue;
    }

    const d = Math.hypot(
      x - StuckDetector.lastX[eid],
      y - StuckDetector.lastY[eid]
    );
    if (d < AICfg.STUCK_MOVE_EPS) {
      StuckDetector.stuckTime[eid] += gameTime.dt;
    } else {
      StuckDetector.lastX[eid] = x;
      StuckDetector.lastY[eid] = y;
      StuckDetector.stuckTime[eid] = 0;
    }
  }
}

/**
 * После движения: фазированный think, дистанции, анимация (idle/walk через velocity + запас под attack в run-19).
 */
export function runAIThinkSystem(
  world: World,
  playerEid: number,
  gameTime: GameTime,
  animationIntentBuffer: AnimationIntentBuffer
): void {
  if (!hasComponent(world, playerEid, Position)) {
    return;
  }
  if (hasComponent(world, playerEid, Dead)) {
    return;
  }


  const px = Position.x[playerEid];
  const py = Position.y[playerEid];

  const ents = query(world, [Enemy, AI, Position, Animation]);
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]!;
    if (hasComponent(world, eid, Dead)) {
      continue;
    }

    const phaseOk = gameTime.tickId % AICfg.THINK_PHASE_N === AI.thinkOffset[eid];
    const timeOk = gameTime.now >= AI.nextThinkTime[eid];
    if (!phaseOk || !timeOk) {
      continue;
    }

    const ex = Position.x[eid];
    const ey = Position.y[eid];
    const rAgg = AI.aggroRadius[eid];
    const rAtk = AI.attackRange[eid];
    const d2 = distSq(ex, ey, px, py);
    const agg2 = rAgg * rAgg;
    const atk2 = rAtk * rAtk;

    if (d2 > agg2) {
      AI.state[eid] = AIState.Idle;
      AI.targetId[eid] = 0;
    } else if (d2 > atk2) {
      AI.state[eid] = AIState.Chase;
      AI.targetId[eid] = playerEid;
    } else {
      AI.state[eid] = AIState.Attack;
      AI.targetId[eid] = playerEid;
    }

    const span = AICfg.THINK_INTERVAL_MAX - AICfg.THINK_INTERVAL_MIN;
    const jitter =
      AICfg.THINK_INTERVAL_MIN +
      deterministicRng(AI.thinkSeed[eid], gameTime.tickId) * span;
    AI.nextThinkTime[eid] = gameTime.now + jitter;

    const st = AI.state[eid];
    if (st === AIState.Chase) {
      mergeAnimationIntent(animationIntentBuffer, {
        entity: eid,
        state: AnimState.Walk,
      });
    } else if (st === AIState.Idle) {
      mergeAnimationIntent(animationIntentBuffer, {
        entity: eid,
        state: AnimState.Idle,
      });
    } else {
      mergeAnimationIntent(animationIntentBuffer, {
        entity: eid,
        state: AnimState.Idle,
      });
    }

  }
}

/**
 * После think: для idle/attack обнулить Velocity, чтобы locomotion и клип совпали с решением AI в этом же кадре.
 */
export function syncEnemyVelocityAfterAIThink(world: World): void {
  const ents = query(world, [Enemy, AI, Velocity]);
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]!;
    if (hasComponent(world, eid, Dead)) {
      continue;
    }
    const st = AI.state[eid];
    if (st === AIState.Idle || st === AIState.Attack) {
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
    }
  }
}

/** Перемещение всех врагов с коллизией тайлов (после игрока — порядок не важен). */
export function moveEnemiesWithTileCollisions(
  world: World,
  meta: GameMapMeta,
  dtSec: number
): void {
  const ents = query(world, [Enemy, Position, Velocity, Hitbox]);
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]!;
    if (hasComponent(world, eid, Dead)) {
      continue;
    }
    moveEntityWithTileCollisions(eid, meta, dtSec);
  }
}
