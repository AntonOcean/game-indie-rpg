import { addComponent, hasComponent, type World } from "bitecs";
import { AnimState } from "../animation/animationTypes";
import {
  mergeAnimationIntent,
  type AnimationIntentBuffer,
} from "../animation/animationIntentBuffer";
import { CombatState, CombatStateEnum, DeathSequence, Health } from "./components";

/**
 * Player death (run-19):
 * - если `Health <= 0` → выставить `CombatState.state = dead`
 * - запустить death-clips через `DeathSequence` (как у врагов)
 */
export function processPlayerDeath(
  world: World,
  playerEid: number,
  animationBuffer: AnimationIntentBuffer
): boolean {
  if (!hasComponent(world, playerEid, Health)) {
    return false;
  }
  if (Health.current[playerEid] > 0) {
    return false;
  }

  if (hasComponent(world, playerEid, CombatState)) {
    if (CombatState.state[playerEid] === CombatStateEnum.dead) {
      return false;
    }
    CombatState.state[playerEid] = CombatStateEnum.dead;
  }

  if (!hasComponent(world, playerEid, DeathSequence)) {
    addComponent(world, playerEid, DeathSequence);
    mergeAnimationIntent(animationBuffer, {
      entity: playerEid,
      state: AnimState.Death,
      force: true,
    });
    return true;
  }
  return false;
}

