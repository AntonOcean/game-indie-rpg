import type { DamageEvent, DamageEventPayload } from "./damageEvent";

/**
 * Double-buffer урона: пишем только в current, читаем processing после swap в конце прошлого кадра.
 * Не экспонируем массивы наружу (architecture.md § GameEventQueues).
 */
export type GameEventQueues = {
  emitDamage(payload: DamageEventPayload): DamageEvent;
  getDamageEvents(): readonly DamageEvent[];
  swap(): void;
  clearProcessing(): void;
};

export function createGameEventQueues(): GameEventQueues {
  let currentDamage: DamageEvent[] = [];
  let processingDamage: DamageEvent[] = [];
  let lastEmitTickId = -1;
  let monotonicSeq = 0;

  return {
    emitDamage(payload: DamageEventPayload): DamageEvent {
      const t = payload.tickId;
      if (t !== lastEmitTickId) {
        lastEmitTickId = t;
        monotonicSeq = 0;
      }
      const eventId = `${t}-${monotonicSeq++}`;
      const e: DamageEvent = { ...payload, eventId };
      currentDamage.push(e);
      return e;
    },

    getDamageEvents(): readonly DamageEvent[] {
      return processingDamage;
    },

    swap(): void {
      const tmp = currentDamage;
      currentDamage = processingDamage;
      processingDamage = tmp;
      currentDamage.length = 0;
    },

    clearProcessing(): void {
      processingDamage.length = 0;
    },
  };
}
