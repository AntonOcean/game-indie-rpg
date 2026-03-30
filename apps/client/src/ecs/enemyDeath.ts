import {
  addComponent,
  hasComponent,
  query,
  type World,
} from "bitecs";
import { AnimState } from "../animation/animationTypes";
import {
  mergeAnimationIntent,
  type AnimationIntentBuffer,
} from "../animation/animationIntentBuffer";
import {
  CombatState,
  CombatStateEnum,
  Dead,
  DeathSequence,
  Enemy,
  Health,
  Position,
} from "./components";

/**
 * HP≤0: один раз ставим death-клип + `DeathSequence`; лут и `Dead` — после
 * `ANIMATION_COMPLETE` в `consumeDeferredRenderEvents` (run-14).
 */
export function processEnemyDeath(
  world: World,
  animationBuffer: AnimationIntentBuffer
): void {
  const entities = query(world, [Enemy, Health, Position]);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (hasComponent(world, eid, Dead)) {
      continue;
    }
    if (Health.current[eid] > 0) {
      continue;
    }

    if (hasComponent(world, eid, CombatState)) {
      CombatState.state[eid] = CombatStateEnum.dead;
    }

    if (hasComponent(world, eid, DeathSequence)) {
      continue;
    }
    addComponent(world, eid, DeathSequence);
    mergeAnimationIntent(animationBuffer, {
      entity: eid,
      state: AnimState.Death,
      force: true,
    });
  }
}
