import { hasComponent, type World } from "bitecs";
import type { GameEventQueues } from "../events/gameEventQueues";
import type { ProcessedEvents } from "../events/processedEvents";
import { Health } from "./components";

/**
 * Фаза 3: Events → State — применение DamageEvent из processing (после swap конца прошлого кадра).
 */
export function runHealthSystem(
  world: World,
  queues: GameEventQueues,
  processed: ProcessedEvents
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
  queues.clearProcessing();
}
