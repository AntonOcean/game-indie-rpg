# План имплементации: статистика, характеристики, NPC, зелья, магазин

Документ описывает шаги для фич поверх текущего клиента (Pixi + bitECS, `PlayerIntent` → события, `InventoryService`, облачный сейв). Общие принципы слоёв и тика — в [`architecture.md`](./architecture.md) и [`post-mvp-development-plan.md`](./post-mvp-development-plan.md).

## Текущее состояние (отправная точка)

- **Инвентарь:** `playerState.inventory`, мутации только через `createInventoryService` ([`inventoryService.ts`](../apps/client/src/state/inventoryService.ts)).
- **Предметы:** [`itemDefs.ts`](../apps/client/src/data/itemDefs.ts) — у `potion_hp` уже `usable: true`; золото — отдельный стек в инвентаре.
- **Использование зелья:** в [`inventoryOverlay.ts`](../apps/client/src/ui/inventoryOverlay.ts) уже есть кнопка **Use** для `usable` предметов: снимает 1 единицу со стека, лечит HP по `POTION_HP.HEAL_AMOUNT`, шлёт `PlayerEventType.USE_ITEM`. При необходимости можно расширить (см. раздел про зелья).
- **Бой:** урон и дистанции задаются константами `PLAYER` / `AI` в [`gameBalance.ts`](../apps/client/src/constants/gameBalance.ts) внутри [`playerCombat.ts`](../apps/client/src/ecs/playerCombat.ts); скорость игрока — в [`playerLocomotion.ts`](../apps/client/src/ecs/playerLocomotion.ts); скорость врага — в `AI.MOVE_SPEED` и AI-системе.
- **Смерть игрока:** [`playerDeath.ts`](../apps/client/src/ecs/playerDeath.ts) + game over в [`main.ts`](../apps/client/src/main.ts) после `ANIMATION_COMPLETE`; **победа** как отдельное событие пока не выделена (один враг на сцене — условная «победа» = его смерть).
- **Сейв:** [`cloudSave.ts`](../apps/client/src/save/cloudSave.ts) — `SaveData` v1: позиция, HP, инвентарь, дублирующее поле `gold`, `timestamp`. Любые новые поля → **миграция версии** (`SAVE_SCHEMA_VERSION` на клиенте и на сервере в `saveStore`).
- **Трейдер:** ассет указан в `assets/characters/trader/` (например `Trader-Idle.png`). Для рантайма, как у солдата/орка, PNG должны попадать под публичный URL вида `/assets/characters/...` (см. [`characterAssets.ts`](../apps/client/src/constants/characterAssets.ts) и копирование в `public/assets/` при сборке/разработке).

---

## 1. Статистика игрока: победы / смерти

**Цель:** накапливать счётчики (и при желании показывать в HUD или экране статистики).

### Данные

- Расширить **`PlayerState`** ([`playerState.ts`](../apps/client/src/state/playerState.ts)) или вынести в отдельный объект «мета прогресса», но **сохранять вместе с сейвом**:
  - `stats: { wins: number; deaths: number }`, где:
    - `wins` = число убитых врагов (каждый умерший enemy засчитывается как 1 победа),
    - `deaths` = число смертей игрока (сколько раз игрок переходил в `CombatState.dead`).

### Где инкрементировать

- **Смерть:** надёжная точка — после того как зафиксирован переход игрока в `CombatState.dead` / завершена death-последовательность (там же, где сейчас показывается game over в [`main.ts`](../apps/client/src/main.ts) / `consumeDeferredRenderEvents`), **один раз за жизнь/сессию**, с защитой от повторного срабатывания (флаг «уже засчитали смерть»).
- **Победа (как убийство врага):** инкремент `wins` **на каждую смерть одного врага**.
  - надёжная точка — в [`enemyDeath.ts`](../apps/client/src/ecs/enemyDeath.ts) в момент, когда система впервые ставит `DeathSequence` (и это гарантированно один раз, потому что `Dead` уже используется как «не считать повторно»).
  - важно: считать только сущности врагов, которые действительно относятся к «боевым врагам» (не NPC случайно получившие `Enemy`), для этого вводится `CombatGroup` (см. ниже).

### `CombatGroup` — обязательный компонент для различения боевых врагов

**ECS-компонент:**

```ts
/** Группа, к которой принадлежит сущность для условий победы и статистики. */
CombatGroup = { groupId: number } // строка-ключ маппится через enum / lookup
```

**Инварианты:**
- При спавне **каждого** `Enemy` из Tiled или пресета — обязательно `addComponent(world, CombatGroup, eid)` с конкретным `groupId` (например `COMBAT_GROUPS.LEVEL_1_ORCS`). Если `groupId` не задан — **dev-warning** и **не засчитывать** в `wins`.
- NPC **не получают** `CombatGroup` — это второй барьер (помимо отсутствия `Enemy`) от случайного подсчёта.
- `enemyDeath.ts` при инкременте `wins`: проверять `hasComponent(world, CombatGroup, eid)` — без него инкремент пропускается.
- `VictoryCondition.kill_all_in_group` проверяет только сущности с `CombatGroup.groupId === targetGroupId`.

**Маппинг `groupId`:** константы в `gameBalance.ts` или отдельный `combatGroups.ts`:

```ts
const COMBAT_GROUPS = {
  LEVEL_1_ORCS: 1,
  // расширяется по мере добавления уровней / боссов
} as const;
```

`groupId` из Tiled: custom property на объектах enemy layer; при спавне читается и пишется в компонент.

- **Раундная победа (опционально, для экрана “level cleared” / выхода):** не смешивать это со статистикой. Если понадобится отдельный «победный экран/раунд», использовать `VictoryCondition` как единый контракт (и не хардкодить “все `Enemy` мертвы”).

  Минимальный контракт:

  ```ts
  type VictoryCondition =
    | { kind: "kill_all_in_group"; groupId: string } // текущее "как бить всех": но через группу
    | { kind: "kill_boss"; bossEid: number }         // будущие боссы
    | { kind: "trigger_zone"; zoneId: string };      // будущие зоны / выход
  ```

### Сейв и сервер

- Добавить поля в `SaveData`, поднять **`SAVE_SCHEMA_VERSION`**, обновить валидацию `isValidLoadedSave`, серверный `saveStore` и дефолты для старых сейвов (`deaths: 0`, `wins: 0`).
- После изменения статистики вызывать `cloudSave.markDirty()` (как при луте).

### UI (опционально на первом этапе)

- Строка в HUD или блок в game over: «Побед: N, Смертей: M».

---

## 2. Характеристики: сила удара, скорость, уворот, точность

**Цель:** не только константы в `gameBalance`, а **числа на сущность** (игрок и каждый враг могут отличаться). Критично: **слой формул боя — единственный источник правды**, иначе через пару итераций появится расхождение («здесь урон считается иначе, чем там»).

### 2.0 Единый контракт разрешения удара (обязательно)

**Файл-плейсхолдер:** например [`apps/client/src/combat/combatResolution.ts`](../apps/client/src/combat/combatResolution.ts) (имя не важно; важно — **одна** точка входа для «попал / не попал / сколько урона»).

**Типы (контракт — зафиксировать в коде дословно по смыслу):**

```ts
/** Всё, что участвует в формуле попадания и урона по цели. */
type CombatStats = {
  attackPower: number
  /** Шкала «меткости» (не проценты): неотрицательный вес на одной шкале с `dodge`.
   *  Дизайн-контракт: 100 accuracy и 100 dodge => hitChance ~ 0.5 (после clamp).
   */
  accuracy: number
  /** Шкала «уворота» (не проценты): неотрицательный вес на одной шкале с `accuracy`. */
  dodge: number
  // дальше: resist, crit, armor — только сюда же, не в ECS-ветках «if player»
}

/** Пакет случайностей для одного удара; порядок чтения внутри resolveCombat не важен. */
type CombatRandom = {
  hitRoll: number
  dodgeRoll: number
  damageRoll: number
};

type CombatInput = {
  attacker: CombatStats
  defender: CombatStats
  distance: number
  /** Макс. дистанция удара для этой атаки (из статы/оружия атакующего при сборке input). */
  maxRange: number
  random: CombatRandom
}

type CombatResult = {
  hit: boolean
  damage: number
  /**
   * Мягко расширяемый набор флагов, чтобы не добавлять поля верхнего уровня при каждом новом эффекте.
   * UI/VFX могут опираться только на них, не разбирая формулу.
   */
  flags?: {
    crit?: boolean
    dodged?: boolean
    blocked?: boolean
  }
  /** Высокоуровневая причина для отладки / логов / тултипов, не влияющая на механику. */
  reason?: "miss" | "dodged" | "out_of_range"
}

/** Единственная точка расчёта: попал ли удар и сколько урона (0 если не попал). */
function resolveCombat(input: CombatInput): CombatResult
```

Инвариант: **всё** — только через `resolveCombat`. Нельзя обойти её с «таким же» расчётом в другом файле.

### Анти-риски: `resolveCombat` не должен стать «god-function»

`resolveCombat` обязан оставаться тонким оркестратором, а математика — маленькими **чистыми** функциями внутри **того же** модуля. Так формула не будет размазываться по проекту, но и не превратится в гигантский `if/else`.

Рекомендуемая внутренняя структура:

- `inRange(...) -> boolean` или сразу `reason: "out_of_range" | undefined`
- `resolveHit(...) -> { hit: boolean; reason?: "miss" | "dodged" }`
- `resolveDamage(...) -> number` (вызовется только когда `hit === true`)

Принцип: блоки отвечают за *одну* причину/следствие (range, hit-logic, damage-logic), и их можно будет расширять (crit, armor, resist) без переписывания всей функции.

**Правило без исключений:**

- Любое **решение** «наносить урон или нет» и **величина урона** определяются **только** внутри `resolveCombat` и кода, который вызывается **только** из неё (приватные хелперы в том же модуле).
- **`resolveCombatAndEmitDamage`**, сбор **`AttackIntent`** из игрока и AI, юнит-тесты, **будущий** сервер — везде **одна** реализация `resolveCombat`. Запрещено дублировать ветки «промах / уворот / урон» рядом с `emitDamage`.

**Что могут делать оркестраторы (`playerCombat`, AI, пайплайн):**

- Валидации **до** вызова: жив ли атакующий, кулдаун, `Dead`, свой/чужой — как сейчас в [`playerCombat.ts`](../apps/client/src/ecs/playerCombat.ts).
- Собрать числа в **`CombatInput`**: `attacker` / `defender` через **`resolveFinalStats(eid)`**, `distance` и `maxRange` из позиций и финального снимка атакующего (без второй константы «52» в AI-файле в обход derived-слоя).
- Вызвать `const result = resolveCombat(input)`.
- Только если `result.hit && result.damage > 0` — **`emitDamage`** с `amount: result.damage` (не пересчитывать).

**Дистанция:** либо `resolveCombat` в начале возвращает `hit: false`, `damage: 0`, `reason: "out_of_range"` при `distance > maxRange`, либо оркестратор не вызывает `resolveCombat` дальше диапазона — но **порог** `maxRange` всегда из одного маппинга статы атакующего, не хардкод в двух местах.

**Запрещено:**

- Считать урон или промах в **UI** (превью «сколько снесёт» — только вызов **той же** `resolveCombat` на копии статы или на экспозированной «симуляции», без второй формулы).
- Дублировать формулу в **debug overlay**, **AI «прикидке»**, **достижениях** — только вызов общего модуля или заранее сохранённый результат из симуляции.

**RNG:** для боя `resolveCombat` не должен сам дёргать RNG — он получает **готовый пакет `CombatRandom`** в `CombatInput.random`, чтобы порядок внутренних вызовов был неважен и рефактор формулы безопасен. Пакет собирается снаружи из единого `GameRng`, что позволяет тестам подставлять фейковый RNG, а клиенту/серверу делить один seed + контракт шагов (как в [`deterministicRng`](../apps/client/src/util/deterministicRng.ts)).  
Минимальный контракт на уровне игры:

```ts
type GameRng = {
  /** Базовый seed забега / сессии (хранится в одном месте, например в GameTime или отдельном GameContext). */
  seed: number;
  /** Функция, которая по (seed, tickId, entityId, channel, n) даёт воспроизводимую последовательность. */
  nextFloat(context: { tickId: number; entityId?: number; channel: "combat" | "ai" | "loot" }): number;
};
```

Инвариант: любой RNG для **боя** (`resolveCombat`), **AI** и **лута** берётся только из одного `GameRng` (или обёрток над ним) — прямые вызовы `Math.random()` в этих слоях запрещены.

### Модель данных (ECS)

Хранить в ECS **не «финальные» статы боя**, а разложение, которое потом не ломается при баффах / экипировке / эффектах:

- **`BaseStats` (ECS)** — то, что «базово» у сущности: персонаж, тип врага, уровень и т.д. (`attackPower`, `accuracy`, `dodge`, `attackRange`, скорость движения и т.д. — без учёта надетого и баффов).
- **`Modifiers` (ECS и/или система эффектов)** — всё, что **накручивается** сверх базы: экипировка, временные баффы, дебаффы, зоны. Это может быть набор компонентов (`Equipment`, `BuffStacks`, …) или список активных эффектов с числовыми дельтами — детали вторичны, важно разделение слоёв.

**Единый derived-слой (обязателен):**

```ts
function resolveFinalStats(eid: number, world: World): CombatStats
```

- Внутри **только здесь** складывается `base + equipment + buffs + …` в итоговый снимок `CombatStats`, который уходит в `resolveCombat`.
- **`resolveCombat` не читает ECS** — ему достаточно `CombatInput` с уже согласованными числами.

**Guard: сущность без `BaseStats`.**  
Если `resolveFinalStats` вызвана на сущности без `BaseStats` (лут, декорация, битый спавн):
- Возвращать **`DEFAULT_COMBAT_STATS`** (нулевой `attackPower`, `accuracy: 0`, `dodge: 0`) — не крашить.
- В **dev** — `console.warn(`resolveFinalStats called on eid=${eid} without BaseStats`)`.
- Оркестратор (`resolveCombatAndEmitDamage`) **перед** вызовом `resolveFinalStats` должен проверять `hasComponent(world, BaseStats, eid)` для атакующего и цели; при отсутствии — пропуск атаки, не вызов `resolveCombat`.

```ts
const DEFAULT_COMBAT_STATS: CombatStats = {
  attackPower: 0,
  accuracy: 0,
  dodge: 0,
};
```

Оркестратор (`resolveCombatAndEmitDamage` и т.п.):

- для атакующего и цели вызывает `resolveFinalStats(attackerEid)` и `resolveFinalStats(defenderEid)`;

**Запрещено** дублировать правило «база + модификаторы» в UI, AI и `playerCombat` — везде либо `resolveFinalStats`, либо заранее переданный тот же `CombatStats`.

**Вариант упрощения на самом первом шаге:** один компонент `BaseStats` + пустые/заглушечные модификаторы; контракт `resolveFinalStats` всё равно вводится сразу, чтобы не делать больной рефактор при первой экипировке.

Инициализация:

- **Игрок:** при спавне ([`playerSpawn.ts`](../apps/client/src/ecs/playerSpawn.ts)) — дефолты из [`gameBalance.ts`](../apps/client/src/constants/gameBalance.ts).
- **Враг:** при спавне ([`enemySpawn.ts`](../apps/client/src/ecs/enemySpawn.ts)) — пресеты / Tiled.

### Где применять (после введения контракта)

- **Боевой конвейер:** вместо «`resolveCombat` → сразу `emitDamage`» ввести **единый CombatEvent** уровня игры:

  ```ts
  type CombatEvent = {
    tickId: number;
    sourceId: number;
    targetId: number;
    result: CombatResult;
  };

  function emitCombatResult(ev: CombatEvent): void;
  ```

  - оркестратор (`resolveCombatAndEmitDamage` в [`playerCombat.ts`](../apps/client/src/ecs/playerCombat.ts)) делает только:
    1. `resolveFinalStats` для атакующего и цели,
    2. расчёт `distance` / `maxRange`,
    3. подготовку `CombatRandom`,
    4. вызов `resolveCombat`,
    5. `emitCombatResult` (даже если `hit === false`, по желанию — для логов / VFX промаха).
  - отдельная система-потребитель `CombatResultSystem`:
    - читает `CombatEvent[]`,
    - **применяет урон** (генерирует `DamageEvent` / вызывает существующий `emitDamage`),
    - триггерит VFX (крита, блока, промаха),
    - пишет логи / статистику.

- **AI-атака:** тот же путь — один вызов конвейера, без отдельной ветки «у врага своя формула».
- **`resolvePlayerIntentToVelocity` / AI:** только **скорость передвижения** из статы сущности; к **resolveCombat** не относится.

### Баланс и сохранения

- Дефолты `CombatStats` остаются эквивалентны текущим константам `PLAYER` / `AI`.
- Рост статов между сессиями — в `SaveData` при необходимости.

### RNG seed и SaveData

`GameRng.seed` должен **пережить save/load**, иначе при загрузке сейва seed сбросится и воспроизводимость сессии сломается. Решение:

- Добавить `rngSeed: number` в `SaveData` (в рамках той же миграции v1→v2, что и `stats`).
- При **новой игре** — генерировать seed один раз (`Date.now()` или `crypto.getRandomValues`), записать в `GameRng` и в `playerState` / контекст.
- При **загрузке** — восстанавливать seed из сейва, инициализировать `GameRng` с ним.
- `tickId` сбрасывается в 0 при загрузке (не сохраняется — это runtime-счётчик); seed + tickId дают воспроизводимость **внутри** сессии, а не между ними.
- Если детерминизм между сессиями не нужен на текущем этапе — допустимо генерировать **новый** seed при каждом load и документировать это решение, чтобы не ломать контракт при добавлении реплеев позже.

---

## 3. Невраждебные NPC и диалоги

**Цель:** сущности без агро/атаки, с которыми можно взаимодействовать и читать текст.

### ECS

- Компонент **`Npc`** (маркер) или **`Faction` / `Hostile`:** враги с `Enemy` остаются враждебными; NPC без `Enemy`.
- **`Interactable`** (опционально): радиус взаимодействия, `kind: "dialogue" | "shop"`.
- **`DialogueId`** или `dialogueScriptId`: строка-ключ в таблицу контента ([`data/`](../apps/client/src/data/) — новый файл `dialogueDefs.ts` или JSON).

### Ввод

**Два слоя, без смешивания координат:**

1. **Экран (screen / DOM)** — HTML-оверлеи (инвентарь, диалог, HUD-кнопки), `pointer-events`, обычный hit-test по пикселям. Тап **сначала** проверяется здесь: если UI под событием и его нужно обработать, **событие не переводится в мир** и **`resolveInteractionAtPoint` не вызывается**. Резолвер **не знает про UI** и не должен знать.
2. **Мир (world)** — только для «сырого» ввода по canvas / сцене: `screenToWorld` → один резолвер по **worldPos**.

Ввод не должен решать «NPC vs Enemy» разрозненно — особенно на мобиле. После отсечения UI нужен **единый резолвер интеракций в мире** с жёстким приоритетом.

Модуль, например `interactionResolver.ts`, контракт **только мира**:

```ts
type InteractionTarget =
  | { kind: "npc"; eid: number }
  | { kind: "loot"; eid: number }
  | { kind: "enemy"; eid: number }
  | { kind: "none" };

function resolveInteractionAtPoint(worldPos: { x: number; y: number }): InteractionTarget;
```

Внутри `resolveInteractionAtPoint` приоритет **только между сущностями мира**:

1. `npc` — hit-test по NPC (`Npc` / `Interactable`),
2. `loot` — как в системе подбора, по `Loot` / `Hitbox`,
3. `enemy` — последний приоритет, аналог [`enemyHitTest.ts`](../apps/client/src/ecs/enemyHitTest.ts),
4. `none`.

**Corner case: NPC перекрывает врага (хитбоксы пересекаются).**  
На мобиле с толстыми пальцами тап по врагу рядом с NPC откроет диалог вместо атаки. Решение — **distance tiebreaker + combat context**:

- Внутри каждой группы приоритетов (npc, loot, enemy) выбирать **ближайшую** сущность к точке тапа (по `sqDist` к центру, как уже делает `pickEnemyAtWorld`).
- Если `CombatState` игрока === `attacking` или `alive` и есть `Enemy` в `attackRange`: **понизить приоритет NPC** — тап в зоне пересечения NPC+Enemy отдать врагу. Логика: если игрок в активном бою и тапнул в зону врага, он скорее всего хочет атаковать, а не говорить.
- Альтернатива (проще): для NPC использовать **`Interactable.radius`** (взаимодействие) **строго меньше** визуального хитбокса, чтобы зоны NPC и врага не пересекались. Например: `interactionRadius = hitboxSize * 0.6`, а hit-test врагов — по полному `Hitbox`.
- Между двумя NPC рядом — тоже **distance tiebreaker** (ближайший центр к точке тапа), как для врагов.

Полный приоритет для игрока (как правило): **UI (screen) > мировой резолвер** — то есть сначала DOM, потом уже `resolveInteractionAtPoint`; в коде резолвера ветки `ui` **нет**.

В [`bindGameInput`](../apps/client/src/input/inputBindings.ts) / обработчике тапа:

- если тап поймали **HTML** (оверлей открыт, или `target` — подходящий DOM-элемент) — только UI, **выход**;
- иначе: `worldPos = screenToWorld(...)`, затем `resolveInteractionAtPoint(worldPos)`;
- по результату: `npc` → диалог / взаимодействие; `loot` → подбор; `enemy` → атака; `none` → move-to (если это ваша модель движения).

### UI

- Простой оверлей: имя NPC, текст реплики, «Далее» / «Закрыть». Работает в **screen space**: блокирует прохождение тапа к canvas (как инвентарь), `canAcceptGameplayInput` / аналог из [`main.ts`](../apps/client/src/main.ts) — без участия `resolveInteractionAtPoint`.

### Runtime guard: `Npc` + `Enemy` — запрещённая комбинация

Одна сущность **не должна** иметь одновременно `Npc` и `Enemy`. Без явной проверки один баг в спавне или Tiled — и NPC попадает в AI-атаку, засчитывается в `wins`, получает агро.

**Обязательная проверка при спавне** (в `spawnNpc` / `spawnEnemy` или общей фабрике):

```ts
if (hasComponent(world, Npc, eid) && hasComponent(world, Enemy, eid)) {
  console.error(`Entity ${eid} has both Npc and Enemy — removing Enemy`);
  removeComponent(world, Enemy, eid);
}
```

- При `Enemy` + `Npc` на одной сущности — **`Enemy` удаляется**, NPC побеждает (мирный по умолчанию).
- В `collectPlayerAttackIntents`: дополнительный guard — пропускать сущности с `Npc` даже если у них есть `Enemy` (двойная защита).
- В dev-режиме: опционально **система-валидатор** раз в N тиков, которая проверяет все сущности на запрещённые комбинации компонентов и логирует.

### Контент

- 1–2 тестовых диалога в данных; расширение до ветвлений (choices) — отдельная итерация.

### Протокол (по желанию)

- Новый тип события `INTERACT_NPC` / `DIALOGUE_ADVANCE` в `game-rpg-protocol` для будущего сервера.

---

## 4. Использование предметов из инвентаря (зелья)

**Уже сделано:** UI «Use» для `usable` предметов в инвентаре.

### Доработки по необходимости

- **Единая функция домена:** `tryUseItem(itemId)` в сервисе или модуле: проверка `hasItem`, эффект по `ITEM_DEFS` / таблице эффектов (heal, бафф скорости и т.д.), `removeItem`, `markDirty`, событие протокола. Сейчас логика зелья зашита в overlay — вынести уменьшит дублирование, если появится хотбар или быстрый слот.

- **Guard: `CombatState.dead` (обязательно).**  
  Сейчас `inventoryOverlay.ts` при Use пишет напрямую в `Health.current[playerEid]` **без** проверки `CombatState`. Если HP упал до 0, но death sequence ещё не запустилась (тот же тик или интервал между фазами), игрок может выпить зелье и «воскреснуть».

  **Правило:** `tryUseItem` **первым делом** проверяет:
  ```ts
  if (CombatState.state[playerEid] === CombatStateEnum.dead) {
    return { ok: false, reason: "player_dead" };
  }
  ```
  Проверка **до** `hasItem` и **до** `removeItem`. Overlay и хотбар вызывают только `tryUseItem`, не лезут в `Health` напрямую.

- **Shared cooldown для использования предметов.**  
  При наличии нескольких источников use (overlay + хотбар + будущие быстрые слоты) два вызова `tryUseItem` за один тик могут списать 2 зелья. Решение:
  - `useItemCooldown: number` (секунды) в `playerState` или отдельном `UseItemState`.
  - `tryUseItem` проверяет `gameTime.now >= useItemCooldown`; при успехе — `useItemCooldown = gameTime.now + USE_ITEM_COOLDOWN_SEC` (например `0.3`).
  - Константа `USE_ITEM_COOLDOWN_SEC` в `gameBalance.ts`.

- **Ограничения:** нельзя пить зелье при смерти (guard выше); кап лечения до `maxHp` уже есть.
- **Мобильный UX:** опционально горячая кнопка зелья на HUD без открытия полного инвентаря.

---

## 5. Магазин (NPC-трейдер) и покупка зелья за золото

**Цель:** невраждебный NPC с ассетом трейдера (`assets/characters/trader/`, например **Trader-Idle**), UI списка товаров, списание золота из инвентаря, выдача `potion_hp`.

### Визуал

- Добавить загрузку спрайтов трейдера по аналогии с [`loadCharacterAnimationTextures.ts`](../apps/client/src/render/loadCharacterAnimationTextures.ts) и [`characterAssets.ts`](../apps/client/src/constants/characterAssets.ts): минимум **idle**; при отсутствии walk/attack — только idle-цикл как у декоративного NPC.
- `mountNpcVisual` или обобщение существующего mount-плеера с `CharacterVisualKind` для типа `trader`.
- Разместить NPC: координаты из **Tiled object layer** (предпочтительно) или константы рядом с `spawnPlayerEntity` / `loadGameMap`.

### Геймплей

- NPC с флагом **`Shop`** или `interact.kind === "shop"`.
- При взаимодействии открыть **панель магазина** (HTML overlay, стиль как у инвентаря): список `ShopOffer[]` — `{ itemId, priceGold, maxPerPurchase? }`.
- **Исправление `maxStack` vs `STACK_CAP` (обязательно до магазина).**  
  Сейчас `inventoryService.tryAddItem` использует `INVENTORY.STACK_CAP` (99) для **всех** предметов, игнорируя per-item `ITEM_DEFS[itemId].maxStack` (у `potion_hp` = 10). Результат: зелья стакаются до 99 вместо 10.

  **Решение:** в `tryAddItem` эффективный лимит стака:
  ```ts
  const def = ITEM_DEFS[itemId];
  const effectiveMax = def?.maxStack
    ? Math.min(def.maxStack, INVENTORY.STACK_CAP)
    : INVENTORY.STACK_CAP;
  ```
  Использовать `effectiveMax` вместо `STACK_CAP` при проверке переполнения стака. Это же значение должно использоваться в `canAddItem` (см. ниже).

- **`canAddItem` — dry-run проверка без мутации (обязательно для `tryTrade`).**  
  Текущий `tryAddItem` либо добавляет, либо нет — нет способа проверить «влезет ли?» без мутации. Для атомарной `tryTrade` нужна проверка **до** `removeItem(cost)`.

  Добавить в `InventoryService`:
  ```ts
  canAddItem(itemId: string, quantity?: number): boolean
  ```
  Внутри — **та же логика**, что в `tryAddItem` (стак, `effectiveMax`, свободные слоты), но **без мутации** `playerState.inventory`. Чтобы не дублировать: вынести общую проверку в приватный `checkAddItem(itemId, qty): { ok: boolean; reason? }`, вызывать из обоих методов — `canAddItem` возвращает `ok`, `tryAddItem` при `ok` мутирует.

- **Покупка (строго атомарно через сервис):**
  - расширить `InventoryService` методом  
    `tryTrade({ cost, reward }): { ok: true } | { ok: false; reason: "no_cost" | "no_space" | "invalid_trade" }`, где  
    `cost: { itemId: string; amount: number }`, `reward: { itemId: string; amount: number }`;

  - **Guard: `amount <= 0`** — если `cost.amount <= 0` или `reward.amount <= 0`, вернуть `{ ok: false, reason: "invalid_trade" }` без мутации. Нулевая цена (бесплатный товар) при необходимости обрабатывается отдельно: `cost.amount === 0` можно разрешить явным флагом `allowFreeTrade`, но по умолчанию это ошибка (защита от багов в `SHOP_DEFS`).

  - внутри `tryTrade` порядок всегда один и тот же:
    1. guard: `cost.amount > 0 && reward.amount > 0` (или `allowFreeTrade`),
    2. проверить, что `cost` достаточно (`hasItem(cost.itemId, cost.amount)`),
    3. проверить, что `reward` влезет (`canAddItem(reward.itemId, reward.amount)`),
    4. только если **все** условия прошли — сделать `removeItem(cost.itemId, cost.amount)` и **затем** `tryAddItem(reward.itemId, reward.amount)`; в противном случае не менять инвентарь вообще;
  - **`markDirty` — только после обеих мутаций** (не между `removeItem` и `tryAddItem`). Если `markDirty` вызвать после `removeItem`, но до `tryAddItem`, и save сработает в этот момент — золото списано, зелье не выдано. Решение: `markDirty()` вызывается **один раз** в конце `tryTrade` при `ok: true`;
  - снаружи **запрещено** реализовывать покупку как `removeItem("gold")` + `tryAddItem("potion_hp")` по отдельности — только через `tryTrade`.
- UI магазина вызывает только `inventoryService.tryTrade(...)` и по результату показывает успех или сообщение об ошибке.
- Звук UI и `markDirty` для сейва — **только при `ok: true`**.

- **Debounce покупки на мобиле.**  
  Два быстрых тапа на «Купить» могут вызвать два `tryTrade` до обновления UI. Второй вызов корректно вернёт `no_cost` при нехватке золота, но UI может показать две анимации / два звука. Решение:
  - Кнопка «Купить» получает `disabled = true` сразу после первого клика (до вызова `tryTrade`).
  - После получения результата `tryTrade` — снять `disabled`, обновить UI (количество золота, стак зелий).
  - Альтернатива: debounce **~200 ms** на обработчике кнопки (как `attackCooldown`, но для UI).

- **Авто-закрытие магазина при исчезновении NPC.**  
  Если NPC-трейдер удалён из мира (баг, environmental damage в будущем, телепорт уровня), а shop overlay открыт — UI зависает без источника данных. Решение:
  - Shop overlay при открытии запоминает `traderEid`.
  - Каждый тик (или при `refresh`): проверить `entityExists(traderEid)` и `hasComponent(world, Npc, traderEid)`.
  - Если сущность пропала — закрыть overlay, опционально toast «Торговец ушёл».

### Данные

- Таблица `SHOP_DEFS` или поле в NPC: цена зелья, ассортимент на будущее.

### Связь с диалогом

- Опция: первый тап открывает диалог-приветствие, кнопка «Торговать» открывает магазин — без обязательной второй фазы на MVP.

---

## Рекомендуемый порядок работ (зависимости)

| Фаза | Содержание | Зависит от |
|------|------------|------------|
| **A** | **Сначала:** `CombatInput` / `CombatResult` / `resolveCombat` + юнит-тесты на промах/уворот/урон. **Затем:** статы в ECS, маппинг entity→`CombatStats`, `resolveCombatAndEmitDamage` только через результат `resolveCombat`, скорость движения из статы | — |
| **B** | Расширение `SaveData` + статистика wins/deaths + инкременты в точках смерти/победы | — (можно параллельно с A) |
| **C** | NPC + hit-test + диалоговый overlay + 1 тестовый NPC | — |
| **D** | Исправление `maxStack` vs `STACK_CAP` + `canAddItem` + `tryTrade` + ассет трейдера в `public`, спавн, shop UI, покупка зелья | C (взаимодействие), инвентарь/золото уже есть |
| **E** | Рефактор «Use item» в `tryUseItem` с guard `CombatState.dead` + shared cooldown + опционально хотбар | инвентарь |

**A → D:** магазин не обязан ждать боевые статы, но если цены/награды завязаны на баланс, удобнее после A.

---

## Чеклист готовности (кратко)

- [ ] Сейв мигрирует со старых версий; статистика не сбрасывается зря; `rngSeed` сохраняется/восстанавливается.
- [ ] Победа/смерть считаются не более одного раза за корректное игровое событие.
- [ ] Враги при спавне получают `CombatGroup` с `groupId`; `wins` инкрементируется только при наличии `CombatGroup`.
- [ ] **Нет** самостоятельного расчёта «попал/урон» вне `resolveCombat` (grep по кодовой базе: `ATTACK_DAMAGE`, формулы попадания — только в-resolution-слое и баланс-дефолтах).
- [ ] Итоговые боевые числа для боя берутся только через `resolveFinalStats` (base + модификаторы), без дублирования «база + бафф» в UI/AI/бою.
- [ ] `resolveFinalStats` на сущности без `BaseStats` возвращает `DEFAULT_COMBAT_STATS` + dev-warning; оркестратор пропускает атаку.
- [ ] Урон/промахи воспроизводимы при фиксированном seed (RNG в `CombatInput`).
- [ ] NPC не получают `Enemy` — runtime guard при спавне удаляет `Enemy` при наличии `Npc`; `collectPlayerAttackIntents` дополнительно пропускает `Npc`.
- [ ] `resolveInteractionAtPoint`: distance tiebreaker внутри каждой группы; NPC-приоритет понижается в combat context.
- [ ] `tryUseItem` проверяет `CombatState.dead` **до** списания предмета; shared cooldown между overlay и хотбаром.
- [ ] `tryAddItem` / `canAddItem` используют `min(ITEM_DEFS[id].maxStack, STACK_CAP)`, а не только `STACK_CAP`.
- [ ] Покупка не может «съесть» золото без выдачи предмета при полной сумке (атомарность `tryTrade`); `markDirty` только после обеих мутаций.
- [ ] `tryTrade` возвращает `invalid_trade` при `amount <= 0`.
- [ ] Кнопка «Купить» блокируется до завершения `tryTrade` (anti double-tap).
- [ ] Shop overlay закрывается автоматически при исчезновении NPC-трейдера из мира.
- [ ] Трейдер отображается с `/assets/characters/trader/...` после копирования файлов в публичную статику.

---

## Документы для согласования перед кодом

- Точное определение **«победа»** (все враги на карте / босс / зона).
- **Внутренняя** математика внутри `resolveCombat` (как именно из `accuracy`/`dodge` получается вероятность и один или два броска) — фиксируется в **одном** модуле рядом с функцией; контракт входа/выхода выше меняется реже, чем коэффициенты.

  Фиксируем формулу для шанса попадания:

  ```ts
  const MIN_HIT = 0.05;
  const MAX_HIT = 0.95;

  const hitChance = clamp(
    accuracy / (accuracy + dodge),
    MIN_HIT,
    MAX_HIT
  );
  ```

  **Геймдизайн-контракт по единицам:**
  - `accuracy` и `dodge` — это **веса**, а не проценты и не нормализованные значения;
  - они должны быть **в одной шкале** (например, типовой диапазон `0..100`, но абсолютные числа не важны: важна пропорция);
  - пример: `accuracy=100`, `dodge=100` => `hitChance=0.5` => ~50% hit (при условии, что clamp не обрезает).

  Правило применения (чтобы не размазывать):
  - если `accuracy + dodge === 0`, то `hitChance` должно принимать заранее оговорённое значение (например `0.5`) во избежание деления на `0`;
  - `resolveCombat` сравнивает `random.hitRoll` с `hitChance` (и возвращает `flags.dodged`/`reason` там же, где решается факт `hit`).
- Нужны ли **статы врагов из Tiled** в первой итерации или достаточно пресетов в коде.
