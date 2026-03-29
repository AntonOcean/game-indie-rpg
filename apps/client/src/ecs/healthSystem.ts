import { hasComponent, type World } from "bitecs";
import type { GameEventQueues } from "../events/gameEventQueues";
import type { ProcessedEvents } from "../events/processedEvents";
import { Health } from "./components";

export type Phase3LootHooks = {
  /** Один успешный grant = одна единица лута (MVP: золото). */
  onLootGranted?: (quantity: number) => void;
};

/**
 * Фаза 3: Events → State — DamageEvent и LootGranted из processing (после swap конца прошлого кадра).
 */
export function runHealthSystem(
  world: World,
  queues: GameEventQueues,
  processed: ProcessedEvents,
  lootHooks?: Phase3LootHooks
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
    Health.current[ev.targetId] -= ev.amount;
    processed.markProcessed(ev.tickId, ev.eventId);
  }

  const lootEv = queues.getLootGranted();
  if (lootEv.length > 0 && lootHooks?.onLootGranted) {
    lootHooks.onLootGranted(lootEv.length);
  }

  queues.clearProcessing();
}
