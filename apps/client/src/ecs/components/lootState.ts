/** Числовой enum для bitECS (run-17). */
export const LootStateEnum = {
  Idle: 0,
  Reserved: 1,
  Picked: 2,
  Despawning: 3,
} as const;

export const LootState = {
  state: [] as number[],
};

export function lootStateLabel(state: number): string {
  switch (state) {
    case LootStateEnum.Idle:
      return "idle";
    case LootStateEnum.Reserved:
      return "reserved";
    case LootStateEnum.Picked:
      return "picked";
    case LootStateEnum.Despawning:
      return "despawning";
    default:
      return `?${state}`;
  }
}
