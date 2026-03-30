import { hasComponent, type World } from "bitecs";
import type { DamageEvent } from "../events/damageEvent";
import type { GameEventQueues } from "../events/gameEventQueues";
import type { ProcessedEvents } from "../events/processedEvents";
import { AnimState } from "../animation/animationTypes";
import {
  mergeAnimationIntent,
  type AnimationIntentBuffer,
} from "../animation/animationIntentBuffer";
import { CombatState, CombatStateEnum, Health } from "./components";

export type Phase3LootHooks = {
  /** Один успешный grant = одна единица лута (MVP: золото). */
  onLootGranted?: (quantity: number) => void;
  /** После успешного применения урона (идемпотентно, не дубликат eventId). */
  onDamageApplied?: (ev: DamageEvent) => void;
};

/**
 * Фаза 3: Events → State — DamageEvent и LootGranted из processing (после swap конца прошлого кадра).
 */
export function runHealthSystem(
  world: World,
  queues: GameEventQueues,
  processed: ProcessedEvents,
  phase3Hooks?: Phase3LootHooks,
  animationBuffer?: AnimationIntentBuffer,
  playerEid?: number
): void {
  const events = queues.getDamageEvents();
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    if (processed.isProcessed(ev.eventId)) {
      continue;
    }
    if (!hasComponent(world, ev.targetId, Health)) {
      continue;
    }
    const targetHp = Health.current[ev.targetId];
    const nextHp = targetHp - ev.amount;
    Health.current[ev.targetId] = nextHp;
    processed.markProcessed(ev.tickId, ev.eventId);
    phase3Hooks?.onDamageApplied?.(ev);

    if (
      playerEid !== undefined &&
      ev.targetId === playerEid &&
      animationBuffer &&
      nextHp > 0
    ) {
      const playerCombatDead =
        hasComponent(world, playerEid, CombatState) &&
        CombatState.state[playerEid] === CombatStateEnum.dead;
      if (!playerCombatDead) {
        mergeAnimationIntent(animationBuffer, {
          entity: playerEid,
          state: AnimState.Hurt,
        });
      }
    }
  }

  const lootEv = queues.getLootGranted();
  if (lootEv.length > 0 && phase3Hooks?.onLootGranted) {
    phase3Hooks.onLootGranted(lootEv.length);
  }

  queues.clearProcessing();
}
