/**
 * Результат успешного подбора (architecture.md: очередь loot в GameEventQueues).
 * Фаза 3: инкремент золота; позже — InventoryService.
 */
export type LootGranted = {
  tickId: number;
  entityId: number;
  itemKind?: string;
  pickerEid: number;
};
