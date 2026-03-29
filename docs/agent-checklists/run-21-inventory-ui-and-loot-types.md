# Run 21 — UI инвентаря и множественные типы лута

**Фаза плана:** post-mvp-development-plan § «Фаза 4» (вторая часть).

## Цель

С врага падают **разные типы** предметов (gold, potion, etc.). Кнопка инвентаря в HUD, оверлей со списком предметов. Использование предмета (зелье → +HP).

## Входные условия

Run-20: `playerState`, `InventoryService`, лут подбирается через `tryAddItem`.

## Item Atlas (из run-17)

Утилита `src/render/itemAtlas.ts` уже создана в run-17. Координаты иконок `[row, col]` в `assets/icons/items.png` (32×32, 16 колонок):

| itemId | row | col | Описание |
|--------|-----|-----|----------|
| `gold` | 17 | 3 | Золотые монеты |
| `potion_hp` | 9 | 0 | Красное зелье |

Добавить новый предмет = одна строка в `ITEM_ICONS` внутри `itemAtlas.ts`.

## Задачи (чек-лист)

### Множественные типы лута
- [ ] **Таблица предметов** (`src/data/itemDefs.ts`):
  ```ts
  type ItemDef = { id: string; name: string; iconId: ItemIconId; stackable: boolean; maxStack: number; usable: boolean }
  ```
  - `gold`: iconId=`'gold'`, stackable, maxStack=999, usable=false.
  - `potion_hp`: iconId=`'potion_hp'`, stackable, maxStack=10, usable=true, effect=heal.
- [ ] Добавить `potion_hp` в `ITEM_ICONS` в `itemAtlas.ts` (если не добавлен в run-17, где был только gold).
- [ ] **ECS-компонент `LootItem`** на сущности лута:
  - `itemId` (числовой enum или строковый тег через дополнительный массив).
- [ ] **Loot table** (`src/data/lootTable.ts`):
  - При смерти врага — вызов `rollLoot(enemyType)` → массив `{ itemId, quantity }`.
  - Простая логика: 100% gold (1–3), 30% potion (1).
  - Использовать deterministicRng (из run-18) для бросков.
- [ ] **Визуал разных типов лута** (через `itemAtlas`):
  - При спавне лута: `createLootSprite(itemId)` — иконка берётся из `getItemIcon(itemId)`.
  - Gold — иконка монет `[17, 3]`; Potion — иконка зелья `[9, 0]`.
- [ ] При спавне лута: создать N сущностей (по одной на каждый предмет из `rollLoot`), с небольшим разбросом позиции.
- [ ] `LootSystem`: при подбирании — `tryAddItem(lootEntity.itemId, lootEntity.quantity)`.

### UI инвентаря
- [ ] **Кнопка «Inventory»** в HUD (HTML overlay или Pixi UI):
  - Позиция: правый верхний угол или нижняя панель.
  - Тап → показать overlay.
- [ ] **Overlay инвентаря** (`src/ui/inventoryOverlay.ts`):
  - Список предметов: `[icon] Name x Quantity`.
  - **Иконки** в UI — из того же `getItemIcon(itemDef.iconId)`:
    ```ts
    const icon = new Sprite(getItemIcon(item.iconId));
    icon.width = 32; icon.height = 32;
    slotContainer.addChild(icon);
    ```
  - Читает `inventoryService.getInventory()` + `ITEM_DEFS[itemId]` для имени и iconId.
  - Кнопка «Use» рядом с usable предметами.
  - Кнопка «Close» → скрыть overlay.
- [ ] **Пауза ввода** при открытом инвентаре:
  - Игнорировать движение/атаку, пока overlay активен.
  - Или: overlay полупрозрачный, игра на паузе (проще для MVP).
- [ ] **touch-action** на overlay: не мешать жестам Telegram.

### Use Item
- [ ] Нажатие «Use» на зелье:
  - `inventoryService.removeItem('potion_hp', 1)`.
  - Применить эффект: `Health[playerEid] += POTION_HP.HEAL_AMOUNT` (из констант).
  - Не лечить выше `maxHP`.
  - Эмитить `USE_ITEM` в протокол (no-op, как ATTACK).
- [ ] **Константы** в `gameBalance.ts`:
  - `POTION_HP.HEAL_AMOUNT` (например 30).
- [ ] Обновить HP бар после использования.

### Протокол
- [ ] Добавить `USE_ITEM` в `sendPlayerEvent` (или обновить типы в `packages/protocol`):
  - `{ type: 'USE_ITEM'; itemId: string; slot?: number }`.
- [ ] По-прежнему no-op (console.debug).

## Ограничения

- UI инвентаря — **простейший** (список, не drag-and-drop, не сетка слотов).
- Не реализовывать экипировку / оружие.
- Два типа предметов достаточно для MVP (gold + potion).

## Как проверить

1. Убить врага → падают разные предметы (gold, potion с вероятностью).
2. Подобрать → появляется в инвентаре.
3. Открыть инвентарь → список предметов с количеством.
4. Нажать «Use» на зелье → HP увеличивается (не выше max), зелье убирается.
5. Gold не usable — кнопки «Use» нет.
6. Закрыть инвентарь → игра продолжается.
7. `USE_ITEM` отправляется в протокол.
8. Нет регрессий в бое, AI, лут-стейт-машине.

## Выход для следующего рана

Полная цепочка лута: враг → дроп → подбор → инвентарь → использование. Готово к сейву.
