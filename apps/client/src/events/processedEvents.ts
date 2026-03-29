/**
 * Идемпотентность применения урона: Map<tickId, Set<eventId>> со скользящим окном (architecture.md).
 */
export type ProcessedEvents = {
  markProcessed(tickId: number, eventId: string): void;
  isProcessed(eventId: string): boolean;
  cleanup(currentTickId: number, windowSize?: number): void;
};

export function createProcessedEvents(): ProcessedEvents {
  const byTick = new Map<number, Set<string>>();

  return {
    markProcessed(tickId: number, eventId: string): void {
      let set = byTick.get(tickId);
      if (!set) {
        set = new Set();
        byTick.set(tickId, set);
      }
      set.add(eventId);
    },

    isProcessed(eventId: string): boolean {
      for (const s of byTick.values()) {
        if (s.has(eventId)) {
          return true;
        }
      }
      return false;
    },

    cleanup(currentTickId: number, windowSize = 60): void {
      const minTick = currentTickId - windowSize;
      for (const k of byTick.keys()) {
        if (k < minTick) {
          byTick.delete(k);
        }
      }
    },
  };
}
