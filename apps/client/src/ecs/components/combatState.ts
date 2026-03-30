/**
 * Канон для боевой логики (run-19).
 * Важно: это НЕ Animation.state, а состояние для FSM логики.
 */
export const CombatState = {
  /**
   * alive=0, dead=1, attacking=2, stunned=3
   * (пока stunned — заглушка, как в чеклисте).
   */
  state: [] as number[],
} as const;

export const CombatStateEnum = {
  alive: 0,
  dead: 1,
  attacking: 2,
  stunned: 3,
} as const;

