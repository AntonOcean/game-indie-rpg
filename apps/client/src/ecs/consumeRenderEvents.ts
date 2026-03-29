import {
  addComponent,
  hasComponent,
  removeComponent,
  type World,
} from "bitecs";
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
  Position,
  Velocity,
} from "./components";

const SPEED_EPS = 1e-4;

/**
 * События с poll() конца кадра N обрабатываются в начале кадра N+1 (architecture.md).
 */
export function consumeDeferredRenderEvents(
  world: World,
  events: RenderEvent[],
  animationBuffer: AnimationIntentBuffer,
  spawnLootAt: (worldX: number, worldY: number) => void
): void {
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    if (ev.type !== "ANIMATION_COMPLETE") {
      continue;
    }
    const eid = ev.entity;
    if (!hasComponent(world, eid, Animation)) {
      continue;
    }

    const st = Animation.state[eid];

    if (st === AnimState.Death) {
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
