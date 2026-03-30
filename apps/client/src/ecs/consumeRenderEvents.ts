import {
  addComponent,
  hasComponent,
  removeComponent,
  type World,
} from "bitecs";
import { LOOT } from "../constants/gameBalance";
import { AnimState } from "../animation/animationTypes";
import {
  mergeAnimationIntent,
  type AnimationIntentBuffer,
} from "../animation/animationIntentBuffer";
import type { RenderEvent } from "../render/renderEvent";
import {
  Animation,
  Dead,
  DeathSequence,
  Enemy,
  Health,
  LootReserve,
  LootState,
  LootStateEnum,
  Position,
  Velocity,
} from "./components";
import { pickLootEntityAtWorld } from "./lootHitTest";

const SPEED_EPS = 1e-4;

function distance2(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/**
 * События с poll() конца кадра N обрабатываются в начале кадра N+1 (architecture.md).
 */
export function consumeDeferredRenderEvents(
  world: World,
  events: RenderEvent[],
  animationBuffer: AnimationIntentBuffer,
  spawnLootAt: (worldX: number, worldY: number) => void,
  playerEid: number,
  canAcceptGameplayInput: () => boolean,
  onPlayerDeathAnimationComplete?: () => void
): void {
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    if (ev.type === "POINTER_TAP") {
      if (!canAcceptGameplayInput()) {
        continue;
      }
      const leid = pickLootEntityAtWorld(world, ev.worldX, ev.worldY);
      if (leid >= 0) {
        const lx = Position.x[leid];
        const ly = Position.y[leid];
        const px = Position.x[playerEid];
        const py = Position.y[playerEid];
        if (distance2(lx, ly, px, py) < LOOT.PICKUP_RADIUS) {
          LootState.state[leid] = LootStateEnum.Reserved;
          LootReserve.reservedBy[leid] = playerEid;
          LootReserve.reserveTimer[leid] = LOOT.RESERVE_TIMEOUT;
        }
      }
      continue;
    }

    if (ev.type !== "ANIMATION_COMPLETE") {
      continue;
    }
    const eid = ev.entity;
    if (!hasComponent(world, eid, Animation)) {
      continue;
    }

    const st = Animation.state[eid];

    if (st === AnimState.Death) {
      if (ev.entity === playerEid) {
        onPlayerDeathAnimationComplete?.();
      }
      if (
        hasComponent(world, eid, Enemy) &&
        hasComponent(world, eid, DeathSequence) &&
        hasComponent(world, eid, Health) &&
        Health.current[eid] <= 0
      ) {
        removeComponent(world, eid, DeathSequence);
        addComponent(world, eid, Dead);
        spawnLootAt(Position.x[eid], Position.y[eid]);
      }
      continue;
    }

    if (st === AnimState.Attack || st === AnimState.Hurt) {
      let desired = AnimState.Idle;
      if (hasComponent(world, eid, Velocity)) {
        const sp = Math.hypot(Velocity.vx[eid], Velocity.vy[eid]);
        if (sp > SPEED_EPS) {
          desired = AnimState.Walk;
        }
      }
      mergeAnimationIntent(animationBuffer, {
        entity: eid,
        state: desired,
        force: true,
      });
    }
  }
}
