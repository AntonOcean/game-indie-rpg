import { AnimState } from "../animation/animationTypes";
import {
  mergeAnimationIntent,
  type AnimationIntentBuffer,
} from "../animation/animationIntentBuffer";

/** Триггер урона по сущности (run-19: AI); пока не вызывается из боя MVP. */
export function enqueueHurtAnimation(
  buffer: AnimationIntentBuffer,
  entity: number
): void {
  mergeAnimationIntent(buffer, { entity, state: AnimState.Hurt });
}
