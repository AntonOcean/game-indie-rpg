# Run 20 — playerState и InventoryService

**Фаза плана:** post-mvp-development-plan § «Фаза 4» (первая часть — основа инвентаря).

## Цель

Ввести **`playerState`** как единственный источник истины для инвентаря. Создать **`InventoryService`** с атомарным `tryAddItem`. Подключить подбор лута к сервису вместо прямого счётчика.

## Входные условия

Run-19: полный боевой цикл, LootGranted events, death с обеих сторон.

## Ключевые ссылки из architecture.md

- **ECS = мир** (позиции, HP, сущности); **`playerState` = инвентарь** (+ мета).
- `playerState` **не хранит данные мира** (не позицию, не HP).
- **`InventoryService.tryAddItem(...) → { ok, reason? }`** — единственная точка мутации сумки.
- `LootSystem` **предлагает**, `InventoryService` **решает**.
- **`AddItemRejectReason`:** `inventory_full`, `stack_cap`, `unique_owned`.

## Задачи (чек-лист)

### playerState
- [ ] **`src/state/playerState.ts`:**
  ```ts
  type ItemStack = { itemId: string; quantity: number }
  type PlayerState = { inventory: ItemStack[] }
  ```
- [ ] Единственный экземпляр `playerState` — создаётся при старте, не в ECS.
- [ ] **Не** добавлять в playerState позицию, HP или данные мира.

### InventoryService
- [ ] **`src/state/inventoryService.ts`:**
  - `tryAddItem(itemId: string, quantity?: number) → { ok: boolean; reason?: AddItemRejectReason }`.
  - `removeItem(itemId: string, quantity?: number) → boolean`.
  - `hasItem(itemId: string, minQuantity?: number) → boolean`.
  - `getInventory() → readonly ItemStack[]`.
- [ ] **AddItemRejectReason** enum: `inventory_full`, `stack_cap`.
- [ ] **Логика tryAddItem:**
  - Найти существующий стак с `itemId`.
  - Если есть и `quantity + existing <= STACK_CAP` → увеличить.
  - Если нет и `inventory.length < MAX_SLOTS` → создать стак.
  - Иначе → `{ ok: false, reason: 'inventory_full' | 'stack_cap' }`.
  - При `ok: false` — **сумка не меняется**.
- [ ] **Константы** в `gameBalance.ts`:
  - `INVENTORY.MAX_SLOTS` (например 20).
  - `INVENTORY.STACK_CAP` (например 99).
  - `ITEMS.GOLD` = `'gold'` (itemId).

### Подключение к лут-системе
- [ ] В `LootSystem` (run-17): при переходе `reserved → picked`:
  - Вызвать `inventoryService.tryAddItem(itemKind, 1)`.
  - Если `ok` → emit `LootGranted`, `LootState = picked → despawning`.
  - Если `!ok` → `LootState = idle`, `reservedBy = 0`. Опционально: лог `reason`.
- [ ] Удалить старый прямой инкремент `goldCount` из кода.

### HUD
- [ ] Обновить отображение золота в HUD:
  - Читать из `inventoryService.getInventory()` → найти стак `'gold'` → показать `quantity`.
  - Или: `inventoryService.hasItem('gold')` + подсчёт.
- [ ] HUD — **read-only** по отношению к `playerState`.

## Ограничения

- Пока **один тип лута** (gold) — множественные типы в run-21.
- Не реализовывать UI инвентаря (кнопка, оверлей) — run-21.
- Не реализовывать `USE_ITEM` — run-21.

## Как проверить

1. Подбор лута → `tryAddItem('gold', 1)` → `ok: true` → HUD обновляется.
2. `inventoryService.getInventory()` возвращает корректный массив.
3. При заполненном инвентаре (MAX_SLOTS × STACK_CAP gold) → `ok: false`, лут остаётся в мире.
4. Старый `goldCount` удалён; единственный источник — `playerState.inventory`.
5. `LootGranted` event эмитится в `GameEventQueues`.
6. Нет регрессий в бое, AI, анимациях.

## Выход для следующего рана

`playerState` + `InventoryService` — основа для множественных типов лута и UI инвентаря.
