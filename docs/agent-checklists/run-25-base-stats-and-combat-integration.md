# Run 25 — BaseStats ECS, `resolveFinalStats` и интеграция боевого пайплайна

**Фаза плана:** implementation-plan-stats-combat-npcs-shop § 2 «Характеристики», § 2.0 «Единый контракт разрешения удара» — модель данных ECS и интеграция.

## Цель

Ввести **`BaseStats`** как ECS-компонент, **`resolveFinalStats`** как единственный derived-слой «база → финальные числа», и **переключить** боевой пайплайн (игрок + AI) на `resolveCombat` из run-24. Удалить прямые ссылки на `PLAYER.ATTACK_DAMAGE` / `AI.ATTACK_DAMAGE` в логике боя.

## Входные условия

Run-24: модуль `resolveCombat` + типы + `GameRng` + юнит-тесты проходят.

## Ключевые ссылки

- implementation-plan-stats-combat-npcs-shop.md § 2: модель данных ECS, `resolveFinalStats`, guard на сущности без `BaseStats`.
- architecture.md § «Фазы тика»: порядок систем, `AttackIntent → DamageEvent`.
- `apps/client/src/ecs/playerCombat.ts` — текущая точка входа атаки игрока.
- `apps/client/src/constants/gameBalance.ts` — константы `PLAYER` / `AI`.

## Задачи (чек-лист)

### `BaseStats` ECS-компонент

- [ ] Файл: `src/ecs/components/baseStats.ts` (или рядом с остальными компонентами).
- [ ] Компонент (bitECS SoA):
  ```ts
  BaseStats = defineComponent({
    attackPower: Types.f32,
    accuracy: Types.f32,
    dodge: Types.f32,
    attackRange: Types.f32,
    moveSpeed: Types.f32,
  })
  ```
- [ ] Добавить в ECS-мир (если нужна регистрация).

### `resolveFinalStats` — derived-слой

- [ ] Файл: `src/combat/resolveFinalStats.ts`.
- [ ] Сигнатура:
  ```ts
  function resolveFinalStats(eid: number, world: World): CombatStats
  ```
- [ ] Логика MVP: читает `BaseStats` → возвращает `CombatStats`. Модификаторы (баффы, экипировка) — заглушка, `+0` ко всему. Контракт заведён сразу, чтобы потом не рефакторить.
- [ ] **Guard:** если у `eid` нет `BaseStats` → вернуть `DEFAULT_COMBAT_STATS` + `console.warn` в dev.

### Инициализация `BaseStats` при спавне

- [ ] **Игрок** (`playerSpawn.ts`):
  - `addComponent(world, BaseStats, playerEid)`.
  - Значения из `gameBalance.ts`: `PLAYER.ATTACK_DAMAGE` → `attackPower`, `PLAYER.ATTACK_RANGE` → `attackRange`, `PLAYER.MOVE_SPEED` → `moveSpeed`.
  - Новые дефолты `accuracy` и `dodge` (добавить в `PLAYER`): `accuracy: 80`, `dodge: 20` (примерные — баланс подбирается позже).
- [ ] **Враг** (`enemySpawn.ts`):
  - `addComponent(world, BaseStats, enemyEid)`.
  - Значения из `AI` констант: `AI.ATTACK_DAMAGE` → `attackPower`, `AI.ATTACK_RANGE` → `attackRange`, `AI.MOVE_SPEED` → `moveSpeed`.
  - Дефолты `accuracy` / `dodge` для врагов (добавить в `AI`): `accuracy: 60`, `dodge: 10`.

### Рефакторинг `playerCombat.ts`

- [ ] Вместо прямого `PLAYER.ATTACK_DAMAGE` и `distance < PLAYER.ATTACK_RANGE`:
  1. `const attackerStats = resolveFinalStats(playerEid, world)`.
  2. `const defenderStats = resolveFinalStats(targetEid, world)`.
  3. Проверить `hasComponent(world, BaseStats, targetEid)` — без него пропустить атаку.
  4. Расчёт `distance` (как сейчас).
  5. `maxRange` из `BaseStats.attackRange[playerEid]` (или из `attackerStats` — если добавить туда).
  6. `const random = buildCombatRandom(gameRng, gameTime.tickId, playerEid)`.
  7. `const result = resolveCombat({ attacker: attackerStats, defender: defenderStats, distance, maxRange, random })`.
  8. Только если `result.hit && result.damage > 0` → `emitDamage(...)` с `amount: result.damage`.
  9. Анимация атаки — как раньше (независимо от попадания или промаха).
- [ ] Кулдаун — оставить как есть (из `BaseStats` или `gameBalance`).
- [ ] Удалить прямые ссылки `PLAYER.ATTACK_DAMAGE` из логики расчёта урона (константа может остаться как дефолт инициализации в `gameBalance.ts`).

### Рефакторинг AI-атаки

- [ ] AI-атака (в `aiSystem.ts` или аналоге) — **тот же путь**:
  1. `resolveFinalStats` для врага (attacker) и игрока (defender).
  2. Guard: `hasComponent(world, BaseStats, eid)`.
  3. `buildCombatRandom(gameRng, gameTime.tickId, enemyEid)`.
  4. `resolveCombat(...)`.
  5. `emitDamage(...)` только при `result.hit`.
- [ ] Удалить прямые `AI.ATTACK_DAMAGE` из логики урона.

### `attackRange` из `BaseStats` для скорости движения

- [ ] В `playerLocomotion.ts` / системе движения: скорость из `BaseStats.moveSpeed[playerEid]` вместо `PLAYER.MOVE_SPEED` (если ранее хардкод).
- [ ] В AI: скорость из `BaseStats.moveSpeed[enemyEid]` вместо `AI.MOVE_SPEED`.

### Создание `GameRng` в runtime

- [ ] Инстанс `GameRng` создаётся один раз при старте (в `main.ts` или game context).
- [ ] Seed: `Date.now()` для MVP (сохранение seed → run-26).
- [ ] `gameRng` доступен в системах через контекст / параметр.

### `gameBalance.ts` — новые константы

- [ ] Добавить в секцию `PLAYER`:
  - `ACCURACY: 80`
  - `DODGE: 20`
- [ ] Добавить в секцию `AI`:
  - `ACCURACY: 60`
  - `DODGE: 10`
- [ ] Существующие `ATTACK_DAMAGE`, `ATTACK_RANGE`, `MOVE_SPEED` — оставить, они используются для инициализации `BaseStats` при спавне.

## Ограничения

- **Не** добавлять экипировку / баффы — `resolveFinalStats` возвращает чистую базу (контракт готов к расширению).
- **Не** менять `GameEventQueues` / `DamageEvent` / `HealthSystem`.
- **Не** менять `SaveData` (это run-26).
- **Не** менять UI / HUD — статы пока не показываются.
- **Не** разбивать combat на 3 системы (TargetResolution / Calculation / Emitter) — оставить существующий оркестратор.

## Как проверить

1. Игра запускается, бой работает.
2. Урон соответствует `BaseStats.attackPower` (для MVP: те же числа, что были в константах → DPS не изменился).
3. **Промахи происходят:** при `accuracy: 80` и `dodge: 10` → `hitChance ≈ 0.89`, т.е. ~11% промахов. Видно в debug overlay или логах.
4. Быстрый спам-клик не даёт двойной урон (кулдаун + идемпотентность сохранены).
5. AI-атака работает аналогично: урон по игроку с промахами.
6. `console.warn` при попытке атаковать сущность без `BaseStats` (не должно происходить при нормальной игре, но guard есть).
7. Скорость движения игрока и врагов не изменилась (берётся из `BaseStats.moveSpeed`).
8. Юнит-тесты из run-24 по-прежнему проходят.

## Выход для следующего рана

Статы на сущностях; `resolveCombat` + `resolveFinalStats` — единственный путь расчёта урона; готовность к баффам / экипировке через расширение `resolveFinalStats`.
