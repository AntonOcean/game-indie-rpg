# Run 24 — Модуль боевого разрешения (`resolveCombat`)

**Фаза плана:** implementation-plan-stats-combat-npcs-shop § 2 «Характеристики», § 2.0 «Единый контракт разрешения удара».

## Цель

Создать **чистый модуль** с типами `CombatStats`, `CombatInput`, `CombatResult`, `CombatRandom` и единственной функцией `resolveCombat` — **единой точкой расчёта** попадания и урона. Ввести `GameRng` для детерминированного RNG. Покрыть юнит-тестами.

## Входные условия

Run-23: звуковые эффекты, бой работает через `GameEventQueues` / `DamageEvent`. Урон пока фиксированный из констант `PLAYER.ATTACK_DAMAGE` / `AI.ATTACK_DAMAGE`.

## Ключевые ссылки

- implementation-plan-stats-combat-npcs-shop.md § 2.0: типы, контракт, формула.
- architecture.md § «Бой и лут»: `AttackIntent → DamageEvent → Health`.
- architecture.md § «Единственный продьюсер `DamageEvent`»: `emitDamage` только из одной точки.

## Задачи (чек-лист)

### Типы (`src/combat/combatResolution.ts`)

- [ ] **`CombatStats`** — данные одной стороны боя:
  ```ts
  type CombatStats = {
    attackPower: number
    accuracy: number   // вес, не проценты; шкала с dodge
    dodge: number      // вес, не проценты; шкала с accuracy
  }
  ```
- [ ] **`CombatRandom`** — пакет случайностей для одного удара:
  ```ts
  type CombatRandom = {
    hitRoll: number    // [0, 1)
    dodgeRoll: number  // [0, 1) — резерв для будущих расширений
    damageRoll: number // [0, 1) — разброс урона
  }
  ```
- [ ] **`CombatInput`** — вход функции:
  ```ts
  type CombatInput = {
    attacker: CombatStats
    defender: CombatStats
    distance: number
    maxRange: number
    random: CombatRandom
  }
  ```
- [ ] **`CombatResult`** — выход:
  ```ts
  type CombatResult = {
    hit: boolean
    damage: number
    flags?: { crit?: boolean; dodged?: boolean; blocked?: boolean }
    reason?: "miss" | "dodged" | "out_of_range"
  }
  ```

### Функция `resolveCombat`

- [ ] Внутренняя структура — **маленькие чистые хелперы** (приватные, в том же модуле):
  - `inRange(distance, maxRange) → boolean`
  - `resolveHit(attacker, defender, random) → { hit: boolean; reason? }`
  - `resolveDamage(attacker, random) → number`
- [ ] **Формула шанса попадания:**
  ```ts
  const MIN_HIT = 0.05;
  const MAX_HIT = 0.95;
  const hitChance = (accuracy + dodge === 0)
    ? 0.5
    : clamp(accuracy / (accuracy + dodge), MIN_HIT, MAX_HIT);
  ```
  Сравнение: `random.hitRoll < hitChance` → попал.
- [ ] **Формула урона:** MVP — `attackPower` (позже `damageRoll` для разброса ±15%, но пока `damage = attackPower`). Если `hit === false` → `damage = 0`.
- [ ] `resolveCombat` — **не** читает ECS, **не** делает side-effects, **не** вызывает RNG сама.
- [ ] Экспортировать `resolveCombat` и типы; хелперы — **не** экспортировать.

### `DEFAULT_COMBAT_STATS`

- [ ] Константа:
  ```ts
  const DEFAULT_COMBAT_STATS: CombatStats = {
    attackPower: 0,
    accuracy: 0,
    dodge: 0,
  }
  ```
- [ ] Экспортировать для использования как fallback (run-25).

### `GameRng` (`src/util/gameRng.ts`)

- [ ] Тип и фабрика:
  ```ts
  type GameRng = {
    seed: number
    nextFloat(context: {
      tickId: number
      entityId?: number
      channel: "combat" | "ai" | "loot"
    }): number
  }
  function createGameRng(seed: number): GameRng
  ```
- [ ] Реализация: использовать существующий `deterministicRng.ts` если подходит, или простой xorshift/mulberry32. Seed + tickId + entityId + channel → детерминированный float [0, 1).
- [ ] Хелпер для сборки `CombatRandom` из `GameRng`:
  ```ts
  function buildCombatRandom(rng: GameRng, tickId: number, entityId: number): CombatRandom
  ```
- [ ] Запрет `Math.random()` в файлах `combat/` — только `GameRng`.

### Юнит-тесты

- [ ] Файл: `src/combat/__tests__/combatResolution.test.ts` (или `.spec.ts` по конвенции проекта).
- [ ] Тесты:
  - `distance > maxRange` → `hit: false`, `reason: "out_of_range"`, `damage: 0`.
  - `hitRoll` чуть ниже порога → `hit: true`, `damage > 0`.
  - `hitRoll` чуть выше порога → `hit: false`, `reason: "miss"` или `"dodged"`, `damage: 0`.
  - `accuracy=100, dodge=100` → `hitChance ≈ 0.5`.
  - `accuracy=100, dodge=0` → `hitChance` clamped до `MAX_HIT (0.95)`.
  - `accuracy=0, dodge=100` → `hitChance` clamped до `MIN_HIT (0.05)`.
  - `accuracy=0, dodge=0` → `hitChance = 0.5` (edge case деления на 0).
  - `attackPower=10` и `hit=true` → `damage=10`.
- [ ] Все тесты проходят: `npm test` / `npx vitest run`.

### Настройка тестового раннера (если ещё нет)

- [ ] Если в проекте нет vitest / jest — добавить `vitest` как dev-dependency, минимальный конфиг.
- [ ] Добавить script `"test"` в `package.json` если его нет.

## Ограничения

- **Не** трогать существующий `playerCombat.ts` / AI-атаку — интеграция в run-25.
- **Не** добавлять `BaseStats` ECS-компонент — это run-25.
- **Не** менять `gameBalance.ts` — только создать новый модуль рядом.
- **Не** менять `GameEventQueues` / `DamageEvent` — пайплайн не трогаем.

## Как проверить

1. `npm test` — все юнит-тесты `combatResolution.test.ts` зелёные.
2. Модуль **не** импортирует ничего из `pixi.js`, `bitecs`, `ecs/`, `render/`.
3. `resolveCombat` — чистая функция без side-effects (проверка: вызов 2 раза с одинаковым input → одинаковый output).
4. `GameRng` с фиксированным seed даёт воспроизводимую последовательность.
5. Игра запускается без ошибок (новый код не подключён к runtime — только модуль и тесты).

## Выход для следующего рана

Готовый, протестированный модуль `resolveCombat` + `GameRng` — фундамент для интеграции в боевой пайплайн (run-25).
