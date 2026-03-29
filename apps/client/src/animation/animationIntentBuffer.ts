import type { AnimationRequest } from "./animationTypes";
import { animationStatePriority } from "./animationTypes";

export type AnimationIntentBuffer = Map<number, AnimationRequest>;

export function createAnimationIntentBuffer(): AnimationIntentBuffer {
  return new Map();
}

/**
 * Агрегация за тик: оставляем запрос с наибольшим приоритетом состояния.
 * При равном приоритете — сохраняем уже лежащий в буфере (детерминизм).
 */
export function mergeAnimationIntent(
  buffer: AnimationIntentBuffer,
  req: AnimationRequest
): void {
  const prev = buffer.get(req.entity);
  if (!prev) {
    buffer.set(req.entity, req);
    return;
  }
  const pNew = animationStatePriority(req.state);
  const pOld = animationStatePriority(prev.state);
  if (pNew > pOld) {
    buffer.set(req.entity, req);
    return;
  }
  if (pNew === pOld) {
    if (req.force && !prev.force) {
      buffer.set(req.entity, req);
    }
  }
}
