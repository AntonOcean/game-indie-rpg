/**
 * Высокоуровневое намерение AI (post-mvp фаза 3, architecture.md).
 * Реализация run-18 кодирует состояние в `AIComponent.state`, без отдельной очереди.
 */
export type AIIntent = {
  type: "chase" | "attack" | "idle";
  targetId?: number;
};
