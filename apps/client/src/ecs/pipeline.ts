/**
 * Порядок фаз игрового тика (architecture.md «Фазы тика», post-mvp § порядок).
 *
 * Кадр N (см. GameEventQueues): фаза 2 пишет урон в `current`; в конце N — `swap()`;
 * в кадре N+1 фаза 3 читает `processing`, затем `clearProcessing()`.
 *
 * 0. (начало) consume `RenderEvent[]` с poll() кадра N−1 — mailbox → анимации / смерть / лут
 * 1. GameTime — `advanceGameTime` (dt, now); `tickId`++ только в конце кадра
 * 2. Input → `PlayerIntent`
 * 3. AttackIntent из намерения → `resolveCombatAndEmitDamage` → `emitDamage` (Intent → Events)
 * 4. `runHealthSystem` — чтение `getDamageEvents()` (processing), идемпотентность, `clearProcessing`
 * 5. Death — death-клип + `DeathSequence`; `Dead`/лут после `ANIMATION_COMPLETE` (шаг 0 след. кадра)
 * 6. Loot pickup
 * 7. Intent → скорость игрока; враги — `applyEnemyVelocityFromAI` (состояние с конца прошлого кадра)
 * 8. Movement + collision: игрок + `moveEnemiesWithTileCollisions`
 * 9. `updateStuckDetectorsAfterMovement` → `runAIThinkSystem` → `syncEnemyVelocityAfterAIThink`
 * 10. Locomotion animation intent → Facing → `runAnimationSystem` (dt из GameTime)
 * 11. RenderSync + `RenderAdapter.poll()` → mailbox на следующий кадр
 * 12. Camera, HP bars, debug
 * 13. `queues.swap()`, периодический `processedEvents.cleanup`, `gameTime.tickId++`
 *
 * AI think — после движения (architecture фаза 5); скорость врага выставляется до движения.
 */
export const GAME_PIPELINE_ORDER = [
  "render_events_consume",
  "game_time",
  "input_aggregate",
  "combat_emit_damage",
  "health_apply_damage",
  "death",
  "loot_pickup",
  "enemy_velocity_from_ai",
  "intent_resolve",
  "movement",
  "enemy_movement",
  "stuck_ai_think",
  "locomotion_animation_intent",
  "facing_from_velocity",
  "animation_system",
  "render_sync",
  "render_adapter_mailbox",
  "camera",
  "end_swap_tick",
] as const;
