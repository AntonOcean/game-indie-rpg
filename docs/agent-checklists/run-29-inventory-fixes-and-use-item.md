# Run 29 — Исправления инвентаря, `canAddItem` и рефакторинг `tryUseItem`

**Фаза плана:** implementation-plan-stats-combat-npcs-shop § 4 «Использование предметов из инвентаря (зелья)» и § 5 (подготовка: `maxStack`, `canAddItem`).

## Цель

Исправить **`maxStack` vs `STACK_CAP`** в `tryAddItem`. Добавить **`canAddItem`** (dry-run проверка). Вынести логику использования зелья из overlay в **`tryUseItem`** с guards (`CombatState.dead`, shared cooldown). Подготовить инвентарь к атомарной покупке (`tryTrade` → run-30).

## Входные условия

Run-28: диалоговая система, NPC на карте. Инвентарь работает (`inventoryService.ts`, `inventoryOverlay.ts`).

## Ключевые ссылки

- implementation-plan-stats-combat-npcs-shop.md § 4: guard dead, shared cooldown, `tryUseItem`.
- implementation-plan-stats-combat-npcs-shop.md § 5: `maxStack` fix, `canAddItem`.
- `apps/client/src/state/inventoryService.ts`: текущий `tryAddItem`.
- `apps/client/src/ui/inventoryOverlay.ts`: текущая логика Use.
- `apps/client/src/data/itemDefs.ts`: `ITEM_DEFS`, `potion_hp.maxStack = 10`.
- `apps/client/src/constants/gameBalance.ts`: `INVENTORY.STACK_CAP`.

## Задачи (чек-лист)

### Исправление `maxStack` vs `STACK_CAP`

- [ ] В `tryAddItem` (`inventoryService.ts`):
  - Текущее поведение: использует `INVENTORY.STACK_CAP` (99) для **всех** предметов.
  - Баг: `potion_hp` с `maxStack: 10` стакается до 99.
- [ ] Исправление — эффективный лимит стака:
  ```ts
  const def = ITEM_DEFS[itemId];
  const effectiveMax = def?.maxStack
    ? Math.min(def.maxStack, INVENTORY.STACK_CAP)
    : INVENTORY.STACK_CAP;
  ```
- [ ] Использовать `effectiveMax` **вместо** `STACK_CAP` при проверке переполнения стака.
- [ ] Проверить, что `gold` (без per-item maxStack или с `maxStack: 9999`) всё ещё стакается нормально.

### `canAddItem` — dry-run проверка

- [ ] Добавить в `InventoryService`:
  ```ts
  canAddItem(itemId: string, quantity?: number): boolean
  ```
- [ ] **Не дублировать логику**: вынести общую проверку в приватный хелпер:
  ```ts
  _checkAddItem(itemId: string, qty: number): { ok: boolean; reason?: string }
  ```
- [ ] `tryAddItem` вызывает `_checkAddItem` → если `ok` → мутирует; иначе возвращает ошибку.
- [ ] `canAddItem` вызывает `_checkAddItem` → возвращает `ok`.
- [ ] Логика `_checkAddItem`:
  - Проверить `effectiveMax` для `itemId`.
  - Найти существующий стак с `itemId`.
  - Если стак есть и `stack.quantity + qty <= effectiveMax` → `ok`.
  - Если стака нет и есть свободный слот → `ok`.
  - Если стак полон и есть свободный слот → новый стак, `ok`.
  - Иначе → `{ ok: false, reason: "inventory_full" | "stack_cap" }`.

### `tryUseItem` — доменная функция

- [ ] Файл: `src/state/useItem.ts` (или метод в `InventoryService`).
- [ ] Сигнатура:
  ```ts
  function tryUseItem(
    itemId: string,
    playerEid: number,
    world: World,
    gameTime: GameTime
  ): { ok: true } | { ok: false; reason: string }
  ```
- [ ] Порядок проверок (именно в этом порядке):
  1. **`CombatState.dead`** → `{ ok: false, reason: "player_dead" }`.
  2. **Shared cooldown:** `gameTime.now < useItemCooldown` → `{ ok: false, reason: "cooldown" }`.
  3. **`hasItem(itemId)`** → `{ ok: false, reason: "no_item" }`.
  4. **Эффект** по `ITEM_DEFS[itemId]`:
     - `potion_hp`: `Health.current[playerEid] = Math.min(Health.current[playerEid] + HEAL_AMOUNT, Health.max[playerEid])`.
     - Расширяемо: таблица эффектов (для MVP — switch/if по `itemId`).
  5. `removeItem(itemId, 1)`.
  6. `useItemCooldown = gameTime.now + USE_ITEM_COOLDOWN_SEC`.
  7. `markDirty()`.
  8. Эмитить `PlayerEventType.USE_ITEM`.
  9. `return { ok: true }`.

### Shared cooldown

- [ ] Константа в `gameBalance.ts`: `USE_ITEM_COOLDOWN_SEC = 0.3` (300ms).
- [ ] Состояние `useItemCooldown: number` — в `playerState` или отдельном модуле (runtime, не в SaveData).
- [ ] Инициализация: `useItemCooldown = 0` при старте.

### Рефакторинг `inventoryOverlay.ts`

- [ ] Кнопка **Use** → вызов `tryUseItem(itemId, playerEid, world, gameTime)`.
- [ ] **Удалить** прямую запись в `Health.current[playerEid]` из overlay.
- [ ] **Удалить** прямой `removeItem` из overlay (теперь внутри `tryUseItem`).
- [ ] По результату `tryUseItem`:
  - `ok: true` → звук / визуальный фидбек (как раньше), обновить UI.
  - `ok: false` → опционально показать `reason` (toast или скрыть кнопку).
- [ ] Кнопка Use: `disabled` при `reason === "cooldown"` или `"player_dead"`.

### Звук / фидбек

- [ ] Сохранить текущий звук зелья (если есть) при `ok: true`.
- [ ] При `ok: false, reason: "player_dead"` — не воспроизводить звук.

## Ограничения

- **Не** реализовывать `tryTrade` (это run-30).
- **Не** реализовывать хотбар на HUD (опционально позже).
- **Не** менять NPC / диалоговую систему.
- **Не** менять боевой пайплайн.
- **Не** добавлять новые типы предметов — только исправить поведение существующих.

## Как проверить

1. `potion_hp` стакается **до 10** (не до 99). Подобрать 11-е зелье → новый стак или отказ.
2. `gold` стакается нормально (до `STACK_CAP` или `maxStack` золота).
3. `canAddItem("potion_hp", 1)` → `true` при наличии места; `false` при полном инвентаре.
4. Нажать **Use** на зелье → HP лечится, стак уменьшается на 1.
5. Нажать **Use** при полном HP → HP не превышает max (кап как раньше).
6. Нажать **Use** быстро два раза → второй вызов → `reason: "cooldown"`, зелье не списывается.
7. Умереть → открыть инвентарь (если возможно) → Use → `reason: "player_dead"`, зелье не списывается.
8. В коде `inventoryOverlay.ts` **нет** прямых записей в `Health` или `removeItem` — всё через `tryUseItem`.
9. Auto-save срабатывает после использования зелья (markDirty).

## Выход для следующего рана

Инвентарь с правильным `maxStack`; `canAddItem` для dry-run; `tryUseItem` как единая точка входа; готовность к `tryTrade` (run-30).
