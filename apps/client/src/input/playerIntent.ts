/**
 * Намерение игрока на один игровой кадр (architecture.md: Input → Intent).
 * Сырые события не трогают Position напрямую — только заполняют эту структуру.
 */
export type PlayerIntent = {
  /** Десктоп: идти к точке в мире (пиксели Tiled). */
  moveTo: { x: number; y: number } | null;
  /**
   * Нормализованное направление (длина ~1) или ноль при отсутствии движения.
   * Мобила: удержание — пока палец на экране (см. inputBindings).
   */
  moveDirection: { x: number; y: number } | null;
  /** Run-08: eid цели; здесь всегда null. */
  attackTarget: number | null;
};

export function emptyPlayerIntent(): PlayerIntent {
  return {
    moveTo: null,
    moveDirection: null,
    attackTarget: null,
  };
}
