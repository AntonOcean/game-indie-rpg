/**
 * Фиксированный порядок игровых систем (implementation-plan, фазы 5–6).
 *
 * 1. input_aggregate — сырой ввод → PlayerIntent
 * 2. intent_resolve — скорость игрока из намерения
 * 3. movement — смещение Position
 * 4. collision — откат по тайлам
 * 5. combat — урон по цели, кулдаун (живые враги без `Dead`)
 * 6. death — `Health <= 0` → death-клип + `DeathSequence`; лут/`Dead` после `ANIMATION_COMPLETE` (начало след. кадра)
 * 7. loot_pickup — пересечение AABB игрока и лута → удаление сущности, id узла в очередь на destroy
 * 8. locomotion_animation_intent — idle/walk в AnimationIntentBuffer
 * 9. facing_from_velocity — Facing по Velocity (если не locked)
 * 10. animation_system — FSM клипов, time += dt, очистка буфера
 * 11. render_sync — destroy, мёртвые враги, позиции, кадры анимации, зеркало; push ANIMATION_COMPLETE
 * 12. render_adapter_poll — события в mailbox на следующий кадр
 * 13. camera — worldRoot / clamp
 */
export const GAME_PIPELINE_ORDER = [
  "input_aggregate",
  "intent_resolve",
  "movement",
  "collision",
  "combat",
  "death",
  "loot_pickup",
  "locomotion_animation_intent",
  "facing_from_velocity",
  "animation_system",
  "render_sync",
  "render_adapter_mailbox",
  "camera",
] as const;
