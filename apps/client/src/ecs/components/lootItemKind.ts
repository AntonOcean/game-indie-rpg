/** 0 = gold (единственный тип до run-20). */
export const LootItemKindEnum = {
  Gold: 0,
  PotionHp: 1,
} as const;

export const LootItemKind = {
  kind: [] as number[],
};
