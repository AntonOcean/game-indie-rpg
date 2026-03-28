/**
 * Фиксированный порядок игровых систем (расширяется в следующих фазах).
 *
 * Текущий ран: на Ticker вызывается только этап render_sync.
 *
 * 1. input_aggregate — сырой ввод → PlayerIntent
 * 2. intent_resolve — движение / атака / idle
 * 3. movement — смещение Position
 * 4. collision — откат по тайлам
 * 5. combat — урон, кулдауны
 * 6. loot — спавн/подбор
 * 7. render_sync — RenderSystem: ECS → реестр Pixi
 * 8. camera — worldRoot / clamp (фаза 4)
 */
export const GAME_PIPELINE_ORDER = [
  "input_aggregate",
  "intent_resolve",
  "movement",
  "collision",
  "combat",
  "loot",
  "render_sync",
  "camera",
] as const;
