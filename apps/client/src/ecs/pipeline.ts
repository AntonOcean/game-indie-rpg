/**
 * Фиксированный порядок игровых систем (implementation-plan, фазы 5–6).
 *
 * 1. input_aggregate — сырой ввод → PlayerIntent
 * 2. intent_resolve — скорость игрока из намерения
 * 3. movement — смещение Position
 * 4. collision — откат по тайлам
 * 5. combat — урон по цели, кулдаун (живые враги без `Dead`)
 * 6. death — `Health <= 0` → `Dead`, колбэк спавна лута в позиции врага
 * 7. loot_pickup — пересечение AABB игрока и лута → удаление сущности, id узла в очередь на destroy
 * 8. render_sync — destroy очереди, скрытие мёртвых врагов, синхрон позиций
 * 9. camera — worldRoot / clamp
 */
export const GAME_PIPELINE_ORDER = [
  "input_aggregate",
  "intent_resolve",
  "movement",
  "collision",
  "combat",
  "death",
  "loot_pickup",
  "render_sync",
  "camera",
] as const;
