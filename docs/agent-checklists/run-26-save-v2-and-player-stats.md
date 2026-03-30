# Run 26 — SaveData v2, статистика побед/смертей и `CombatGroup`

**Фаза плана:** implementation-plan-stats-combat-npcs-shop § 1 «Статистика игрока: победы / смерти», § 2 (RNG seed в SaveData).

## Цель

Расширить `SaveData` до **v2** с полями `stats` (wins, deaths) и `rngSeed`. Ввести **`CombatGroup`** для различения боевых врагов. Инкрементировать счётчики в правильных точках, с защитой от повторного срабатывания.

## Входные условия

Run-25: `BaseStats` в ECS, `resolveFinalStats`, `GameRng` создаётся при старте.

## Ключевые ссылки

- implementation-plan-stats-combat-npcs-shop.md § 1: данные, точки инкремента, `CombatGroup`, `VictoryCondition`.
- `apps/client/src/save/cloudSave.ts`: текущий `SaveData` v1.
- `apps/client/src/state/playerState.ts`: `PlayerState`.
- `apps/client/src/ecs/enemyDeath.ts`: точка смерти врага.
- `apps/client/src/ecs/playerDeath.ts` + `main.ts`: точка смерти игрока.

## Задачи (чек-лист)

### Расширение `PlayerState`

- [ ] Добавить поле `stats` в `PlayerState` (`playerState.ts`):
  ```ts
  stats: { wins: number; deaths: number }
  ```
- [ ] Дефолт при инициализации: `{ wins: 0, deaths: 0 }`.

### `CombatGroup` ECS-компонент

- [ ] Файл: `src/ecs/components/combatGroup.ts` (или рядом с другими компонентами).
- [ ] Компонент:
  ```ts
  CombatGroup = defineComponent({ groupId: Types.ui8 })
  ```
- [ ] Константы `COMBAT_GROUPS` (в `gameBalance.ts` или отдельный файл):
  ```ts
  const COMBAT_GROUPS = {
    LEVEL_1_ORCS: 1,
  } as const
  ```
- [ ] При спавне **каждого** `Enemy` (`enemySpawn.ts`):
  - `addComponent(world, CombatGroup, eid)`.
  - `CombatGroup.groupId[eid] = COMBAT_GROUPS.LEVEL_1_ORCS` (или из Tiled custom property если есть).
  - Если `groupId` не задан → `console.warn` в dev.

### Инкремент `wins` (смерть врага)

- [ ] В `enemyDeath.ts`, в момент установки `DeathSequence` (один раз на смерть):
  - Проверить `hasComponent(world, CombatGroup, eid)` — без него **не** инкрементировать.
  - `playerState.stats.wins += 1`.
  - `cloudSave.markDirty()`.

### Инкремент `deaths` (смерть игрока)

- [ ] В `playerDeath.ts` или `main.ts` (точка game over):
  - Инкремент **один раз** за смерть. Ввести флаг `deathCounted: boolean` в контексте жизни/сессии.
  - Проверить, что `CombatState === dead` (не повторный вызов).
  - `playerState.stats.deaths += 1`.
  - `cloudSave.markDirty()`.
  - Сбросить флаг при респавне / новой игре.

### Миграция `SaveData` → v2

- [ ] Поднять `SAVE_SCHEMA_VERSION` (клиент + сервер `saveStore`):
  - v1 → v2.
- [ ] Новые поля в `SaveData`:
  ```ts
  stats: { wins: number; deaths: number }
  rngSeed: number
  ```
- [ ] **Миграция при загрузке** (`isValidLoadedSave` / `migrateSave`):
  - Если `version === 1` (или отсутствует `stats`):
    - `stats = { wins: 0, deaths: 0 }`.
    - `rngSeed = Date.now()` (генерировать новый seed при миграции).
    - `version = 2`.
  - Если `version === 2` → использовать как есть.
- [ ] Обновить **серверный** `saveStore` (`apps/server/`):
  - Добавить `stats` и `rngSeed` в валидацию.
  - Дефолты для старых сейвов при загрузке на сервере.

### `rngSeed` в save/load цикле

- [ ] При **новой игре** (нет сейва): `rngSeed = Date.now()` → записать в `playerState` / game context → инициализировать `GameRng`.
- [ ] При **загрузке сейва**: `rngSeed` из `SaveData` → инициализировать `GameRng` тем же seed.
- [ ] При **сохранении**: текущий seed → `SaveData.rngSeed`.
- [ ] `tickId` **не** сохраняется (runtime-счётчик, сбрасывается в 0 при загрузке).

### Сборка `SaveData`

- [ ] Обновить функцию сборки `SaveData` (в `cloudSave.ts` или аналоге):
  - Добавить `stats: playerState.stats`.
  - Добавить `rngSeed`.
- [ ] Обновить функцию восстановления из `SaveData`:
  - Записать `stats` в `playerState.stats`.
  - Записать `rngSeed` → `GameRng`.

### UI (минимально, опционально)

- [ ] В экране Game Over: показать строку «Побед: N, Смертей: M».
- [ ] Если HUD уже есть — добавить счётчик побед (необязательно на этом этапе).

## Ограничения

- **Не** реализовывать `VictoryCondition` / экран «level cleared» — только подсчёт.
- **Не** менять боевой пайплайн (run-24/25 уже настроил).
- **Не** добавлять NPC / магазин.
- Поле `gold` в `SaveData` — оставить как есть (дублирующее; cleanup позже).

## Как проверить

1. Новая игра → убить врага → `stats.wins === 1`. Убить ещё → `wins === 2`.
2. Умереть → `stats.deaths === 1`. Повторная смерть (если есть респавн) → `deaths === 2`.
3. Сохранить → закрыть → загрузить → `stats` восстановлены.
4. Старый сейв v1 (без `stats`) → загрузка работает, `stats = { wins: 0, deaths: 0 }`.
5. `rngSeed` сохраняется и восстанавливается; `GameRng` инициализируется с тем же seed.
6. Враги при спавне имеют `CombatGroup`; в dev-логе нет warn о `groupId`.
7. Game Over экран (если реализован) показывает статистику.

## Выход для следующего рана

Персистентная статистика; миграция сейвов; `CombatGroup` на врагах; `rngSeed` в save/load.
