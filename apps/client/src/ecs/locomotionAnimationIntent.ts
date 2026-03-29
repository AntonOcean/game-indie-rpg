import { hasComponent, query, type World } from "bitecs";
import { AnimState } from "../animation/animationTypes";
import {
  mergeAnimationIntent,
  type AnimationIntentBuffer,
} from "../animation/animationIntentBuffer";
import { Animation, Dead, Velocity } from "./components";

const SPEED_EPS = 1e-4;

/**
 * По фактической скорости: walk при ненулевой Velocity, иначе idle.
 * Враг без Velocity — всегда idle. Анти-spam: совпадение с текущим клипом не пишем в буфер.
 */
export function enqueueLocomotionAnimationRequests(
  world: World,
  buffer: AnimationIntentBuffer
): void {
  const entities = query(world, [Animation]);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (hasComponent(world, eid, Dead)) {
      continue;
    }

    let desired: number = AnimState.Idle;
    if (hasComponent(world, eid, Velocity)) {
      const sp = Math.hypot(Velocity.vx[eid], Velocity.vy[eid]);
      desired = sp > SPEED_EPS ? AnimState.Walk : AnimState.Idle;
    }

    if (desired === Animation.state[eid]) {
      continue;
    }

    mergeAnimationIntent(buffer, { entity: eid, state: desired });
  }
}
