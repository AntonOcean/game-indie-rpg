/** Резерв подбора: кто держит слот и таймаут анти-спама. */
export const LootReserve = {
  /** eid подбирающего; 0 — нет резерва. */
  reservedBy: [] as number[],
  reserveTimer: [] as number[],
};
