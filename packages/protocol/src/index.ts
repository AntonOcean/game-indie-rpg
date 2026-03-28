/**
 * Единый контракт событий игрока (architecture.md).
 * Отправка пока заглушка — позже тот же payload уйдёт по WebSocket.
 */

export const PlayerEventType = {
  MOVE: "MOVE",
  ATTACK: "ATTACK",
  USE_ITEM: "USE_ITEM",
} as const;

export type PlayerEventTypeName = (typeof PlayerEventType)[keyof typeof PlayerEventType];

/** Намерение сместиться; сервер в проде проверит скорость, dt, коллизии. */
export type MovePayload = {
  moveTo?: { x: number; y: number } | null;
  moveDirection?: { x: number; y: number } | null;
};

/** Намерение ударить цель по entity id; сервер проверит дистанцию, кулдаун, LOS. */
export type AttackPayload = {
  targetId: number;
};

/** Использование предмета в слоте; сервер проверит наличие и контекст. */
export type UseItemPayload = {
  slotIndex: number;
};

export type PlayerEvent =
  | { type: typeof PlayerEventType.MOVE; payload: MovePayload }
  | { type: typeof PlayerEventType.ATTACK; payload: AttackPayload }
  | { type: typeof PlayerEventType.USE_ITEM; payload: UseItemPayload };

/**
 * Заглушка канала «на сервер»: не блокирует клиент, не требует запущенного сервера.
 * В MVP — отладочный лог; позже заменить на WebSocket / fetch.
 */
export function sendPlayerEvent(event: PlayerEvent): void {
  console.debug("[game-rpg-protocol] sendPlayerEvent (stub)", event);
}
