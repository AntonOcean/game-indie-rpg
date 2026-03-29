/** Состояние мозгов врага (run-18). */
export const AIState = {
  Idle: 0,
  Chase: 1,
  Attack: 2,
} as const;

/**
 * AI: агро, преследование, фазированный think (architecture § фаза 5).
 * aggroRadius / attackRange копируются из констант при спавне.
 */
export const AI = {
  state: [] as number[],
  targetId: [] as number[],
  aggroRadius: [] as number[],
  attackRange: [] as number[],
  nextThinkTime: [] as number[],
  thinkOffset: [] as number[],
  /** Стабильный seed для deterministicRng (spawnIndex и т.п.). */
  thinkSeed: [] as number[],
};
