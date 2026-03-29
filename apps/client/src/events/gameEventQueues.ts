import type { DamageEvent, DamageEventPayload } from "./damageEvent";
import type { LootGranted } from "./lootGrantedEvent";

/**
 * Double-buffer: пишем только в current, читаем processing после swap в конце прошлого кадра.
 * Не экспонируем массивы наружу (architecture.md § GameEventQueues).
 */
export type GameEventQueues = {
  emitDamage(payload: DamageEventPayload): DamageEvent;
  emitLootGranted(payload: LootGranted): void;
  getDamageEvents(): readonly DamageEvent[];
  getLootGranted(): readonly LootGranted[];
  swap(): void;
  clearProcessing(): void;
};

export function createGameEventQueues(): GameEventQueues {
  let currentDamage: DamageEvent[] = [];
  let processingDamage: DamageEvent[] = [];
  let currentLoot: LootGranted[] = [];
  let processingLoot: LootGranted[] = [];
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

    emitLootGranted(payload: LootGranted): void {
      currentLoot.push(payload);
    },

    getDamageEvents(): readonly DamageEvent[] {
      return processingDamage;
    },

    getLootGranted(): readonly LootGranted[] {
      return processingLoot;
    },

    swap(): void {
      let tmpD = currentDamage;
      currentDamage = processingDamage;
      processingDamage = tmpD;
      currentDamage.length = 0;

      const tmpL = currentLoot;
      currentLoot = processingLoot;
      processingLoot = tmpL;
      currentLoot.length = 0;
    },

    clearProcessing(): void {
      processingDamage.length = 0;
      processingLoot.length = 0;
    },
  };
}
