# Run 30 — Магазин: `tryTrade`, shop overlay и покупка зелья

**Фаза плана:** implementation-plan-stats-combat-npcs-shop § 5 «Магазин (NPC-трейдер) и покупка зелья за золото».

## Цель

Реализовать **атомарную покупку** через `tryTrade` в `InventoryService`, **shop overlay** (HTML, по аналогии с инвентарём), связать взаимодействие с NPC-трейдером → магазин. Защита от double-tap и авто-закрытие при исчезновении NPC.

## Входные условия

Run-29: `canAddItem` работает, `maxStack` исправлен, `tryUseItem` вынесен. Run-27/28: NPC-трейдер на карте, `Interactable.kind === SHOP`, диалоговый оверлей.

## Ключевые ссылки

- implementation-plan-stats-combat-npcs-shop.md § 5: `tryTrade`, атомарность, debounce, авто-закрытие.
- `apps/client/src/state/inventoryService.ts`: `tryAddItem`, `canAddItem`, `removeItem`.
- `apps/client/src/data/itemDefs.ts`: `ITEM_DEFS`.
- `apps/client/src/ui/inventoryOverlay.ts` — референс для стиля.
- `apps/client/src/input/interactionResolver.ts`: `InteractionTarget.kind === "npc"`.

## Задачи (чек-лист)

### Данные магазина

- [ ] Файл: `src/data/shopDefs.ts`.
- [ ] Типы:
  ```ts
  type ShopOffer = {
    itemId: string
    priceGold: number
    maxPerPurchase?: number  // опционально, лимит за одну покупку
  }

  type ShopDef = {
    id: number
    name: string
    offers: ShopOffer[]
  }
  ```
- [ ] Данные MVP:
  ```ts
  const SHOP_DEFS: Record<number, ShopDef> = {
    1: {
      id: 1,
      name: "Лавка Торговца",
      offers: [
        { itemId: "potion_hp", priceGold: 10 },
      ],
    },
  }
  ```
- [ ] Компонент `ShopId` (ECS) или поле на NPC для связи с `SHOP_DEFS`:
  ```ts
  ShopId = defineComponent({ shopDefId: Types.ui16 })
  ```
- [ ] При спавне трейдера: `ShopId.shopDefId[eid] = 1`.

### `tryTrade` в `InventoryService`

- [ ] Метод:
  ```ts
  tryTrade(params: {
    cost: { itemId: string; amount: number }
    reward: { itemId: string; amount: number }
  }): { ok: true } | { ok: false; reason: "no_cost" | "no_space" | "invalid_trade" }
  ```
- [ ] Порядок внутри (строго):
  1. **Guard `amount <= 0`:** если `cost.amount <= 0` или `reward.amount <= 0` → `{ ok: false, reason: "invalid_trade" }`.
  2. **Проверка стоимости:** `hasItem(cost.itemId, cost.amount)` → иначе `{ ok: false, reason: "no_cost" }`.
  3. **Проверка места:** `canAddItem(reward.itemId, reward.amount)` → иначе `{ ok: false, reason: "no_space" }`.
  4. **Мутация (только если всё прошло):**
     - `removeItem(cost.itemId, cost.amount)`.
     - `tryAddItem(reward.itemId, reward.amount)`.
  5. **`markDirty()`** — **один раз** в конце, после обеих мутаций.
- [ ] **Запрещено** реализовывать покупку как `removeItem` + `tryAddItem` снаружи `tryTrade`.
- [ ] ❌ `markDirty` **не** между `removeItem` и `tryAddItem`.

### Shop overlay (`shopOverlay.ts`)

- [ ] Файл: `src/ui/shopOverlay.ts`.
- [ ] **HTML-структура** (DOM, аналог инвентаря):
  - Заголовок: название магазина (`ShopDef.name`).
  - Список товаров: для каждого `ShopOffer`:
    - Иконка / название предмета (из `ITEM_DEFS`).
    - Цена: «N gold».
    - Кнопка **«Купить»**.
  - Текущее золото игрока (обновляется при покупке).
  - Кнопка **«Закрыть»**.
- [ ] Стиль: тёмный фон, белый текст, скруглённые углы — по аналогии с инвентарём/диалогом.
- [ ] `pointer-events: auto` — блокирует тапы к canvas.
- [ ] API:
  ```ts
  function openShop(shopDefId: number, traderEid: number): void
  function closeShop(): void
  function isShopOpen(): boolean
  ```

### Покупка

- [ ] Кнопка «Купить» → вызов:
  ```ts
  const result = inventoryService.tryTrade({
    cost: { itemId: "gold", amount: offer.priceGold },
    reward: { itemId: offer.itemId, amount: 1 },
  })
  ```
- [ ] По результату:
  - `ok: true` → обновить UI (золото, стак зелий), звук покупки (если есть).
  - `ok: false, reason: "no_cost"` → показать «Недостаточно золота» (toast или подсветка).
  - `ok: false, reason: "no_space"` → показать «Инвентарь полон».
  - `ok: false, reason: "invalid_trade"` → не должно происходить (баг в данных).

### Debounce кнопки «Купить»

- [ ] Кнопка получает `disabled = true` **сразу** после клика (до вызова `tryTrade`).
- [ ] После получения результата → снять `disabled`, обновить UI.
- [ ] Альтернатива: debounce ~200ms на обработчике.

### Авто-закрытие при исчезновении NPC

- [ ] Shop overlay при открытии запоминает `traderEid`.
- [ ] Проверка каждый тик (или через `requestAnimationFrame` / setInterval ~500ms):
  - `entityExists(traderEid)` && `hasComponent(world, Npc, traderEid)`.
  - Если нет → `closeShop()`.
- [ ] Очистка проверки при `closeShop()`.

### Блокировка игрового ввода

- [ ] При открытом магазине: блокировать игровой ввод (как диалог / инвентарь).
- [ ] Добавить `isShopOpen()` в проверку `canAcceptGameplayInput`.

### Связь NPC → магазин

- [ ] В `inputBindings.ts` / обработчике тапа:
  - При `resolveInteractionAtPoint` → `npc`:
    - Проверить `Interactable.kind[eid]`:
      - `INTERACT_KIND.SHOP` → `openShop(ShopId.shopDefId[eid], eid)`.
      - `INTERACT_KIND.DIALOGUE` → `openDialogue(DialogueId.scriptId[eid])`.
- [ ] Опционально: сначала диалог-приветствие, затем кнопка «Торговать» в диалоге → `openShop(...)`. Но для MVP допустимо сразу открывать магазин.

### Протокол (заготовка)

- [ ] Новый тип `PlayerEventType.TRADE` — эмитить при успешной покупке (no-op для сервера пока).

## Ограничения

- **Не** реализовывать продажу предметов (только покупка).
- **Не** менять `resolveCombat` / боевой пайплайн.
- **Не** менять SaveData (магазин не сохраняется — при перезагрузке ассортимент тот же).
- **Не** добавлять новые типы предметов — только `potion_hp` в магазине.
- **Не** реализовывать ветвления диалогов.

## Как проверить

1. Тап по трейдеру → открывается shop overlay с названием «Лавка Торговца».
2. Виден товар `potion_hp` с ценой «10 gold».
3. Виден текущий запас золота.
4. Нажать «Купить» при достаточном золоте → золото -10, зелье +1 (или стак увеличился).
5. Нажать «Купить» при нехватке золота → сообщение «Недостаточно золота», инвентарь не менялся.
6. Набрать 10 зелий (maxStack) → ещё покупка → «Инвентарь полон» (если нет свободного слота).
7. Два быстрых тапа «Купить» → только одна покупка (debounce / disabled).
8. Закрыть магазин → игра работает нормально.
9. При открытом магазине: тапы не двигают игрока, не атакуют.
10. `markDirty` вызывается → auto-save после покупки.
11. (Тест edge case) Если удалить NPC из мира при открытом магазине → магазин закрывается.

## Выход для следующего рана

Полностью работающий магазин; атомарная покупка; все фичи из implementation-plan-stats-combat-npcs-shop реализованы.
