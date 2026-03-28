/**
 * Время performance.now(), до которого нельзя нанести следующий урон.
 * 0 — кулдаун не активен (можно атаковать).
 */
export const AttackCooldown = {
  untilMs: [] as number[],
};
