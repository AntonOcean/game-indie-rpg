# Run 17 — Loot State Machine и предсказуемый подбор

**Фаза плана:** post-mvp-development-plan § «Фаза 2».

## Цель

Заменить мгновенный AABB-подбор на **state machine лута** с `reserved` / `picked` / `despawning`, добавить **радиус подбора** и **визуальный feedback** (fade). Устранить случайные подборы на мобиле.

## Входные условия

Run-16: GameEventQueues и DamageEvent pipeline работают; бой через события.

## Ключевые ссылки

- architecture.md: `LootState`, `reservedBy`, `tryAddItem`, `LootGranted`.
- post-mvp: фаза 2, правила переходов, анти-залипание.

## Иконки предметов (Item Atlas)

Спрайт-лист иконок: `assets/icons/items.png` (сетка **32×32**, 16 колонок).
Координаты `[row, col]` (верхний левый угол = `[0, 0]`):

| itemId | row | col | Описание |
|--------|-----|-----|----------|
| `gold` | 17 | 3 | Золотые монеты |
| `potion_hp` | 9 | 0 | Красное зелье |

Нарезка — **программная**, без JSON-метаданных. Утилита `src/render/itemAtlas.ts`:

```ts
import { Texture, Rectangle, Assets } from 'pixi.js';

const TILE = 32;

const ITEM_ICONS = {
  gold:      { row: 17, col: 3 },
  potion_hp: { row: 9,  col: 0 },
} as const;

export type ItemIconId = keyof typeof ITEM_ICONS;

let baseTexture: Texture | null = null;
const cache = new Map<ItemIconId, Texture>();

export async function loadItemAtlas(): Promise<void> {
  baseTexture = await Assets.load('/assets/icons/items.png');
}

export function getItemIcon(id: ItemIconId): Texture {
  const cached = cache.get(id);
  if (cached) return cached;
  if (!baseTexture) throw new Error('Item atlas not loaded');
  const def = ITEM_ICONS[id];
  const frame = new Rectangle(def.col * TILE, def.row * TILE, TILE, TILE);
  const tex = new Texture({ source: baseTexture.source, frame });
  cache.set(id, tex);
  return tex;
}
```

Новый предмет — одна строка в `ITEM_ICONS`.

## Задачи (чек-лист)

### LootState
- [ ] **Компонент `LootState`** в ECS (числовой enum):
  - `idle = 0`, `reserved = 1`, `picked = 2`, `despawning = 3`.
- [ ] **Компонент `LootReserve`**:
  - `reservedBy` (eid подбирающего; 0 = нет).
  - `reserveTimer` (секунды, обратный отсчёт).
- [ ] **Компонент `DespawnTimer`**:
  - `timer` (секунды, обратный отсчёт для fade/удаления).
- [ ] **Константы** в `gameBalance.ts`:
  - `LOOT.PICKUP_RADIUS` (px, меньше текущего AABB overlap).
  - `LOOT.RESERVE_TIMEOUT` (~0.2 с).
  - `LOOT.PICKUP_FEEDBACK_SEC` (0.2–0.3 с, время VFX fade).
  - `LOOT.DESPAWN_TIME` (0.3 с — полный цикл despawning).

### LootSystem (переписать `lootPickup.ts`)
- [ ] **Каждый тик** для сущностей `Loot`:
  1. Если `LootState === reserved` и `!entityExists(reservedBy)` → `idle`, `reservedBy = 0`.
  2. Если `LootState === reserved` и `reserveTimer <= 0` → `idle`, `reservedBy = 0`.
  3. `reserveTimer -= dt` при `reserved`.
- [ ] **Intent подбора** (тап по луту или вход в радиус):
  - Проверка: `LootState === idle`.
  - Проверка: расстояние центр-центр < `LOOT.PICKUP_RADIUS`.
  - Если ОК: `LootState = reserved`, `reservedBy = playerEid`, `reserveTimer = LOOT.RESERVE_TIMEOUT`.
- [ ] **Попытка подбора** (при `reserved` и условия мира ОК):
  - Пока нет `InventoryService` (run-20): прямой инкремент счётчика (как сейчас), но через **`LootGranted`** event.
  - `LootState = picked` → сразу `LootState = despawning`, `DespawnTimer = LOOT.DESPAWN_TIME`.
- [ ] **`LootGranted`** event в `GameEventQueues`:
  - Добавить в queues: `emitLootGranted(...)`.
  - Тип: `{ tickId, entityId, itemKind?, pickerEid }`.
  - Consumer (фаза 3): обработка инвентаря (пока просто счётчик золота).
- [ ] **Допустимые переходы** (жёстко):
  - `idle → reserved → picked → despawning → removeEntity`.
  - `reserved → idle` (timeout, tryAddItem fail, reservedBy не существует).
  - ❌ `picked → idle`, `despawning → idle` — запрещено.

### Визуал лута (замена жёлтого квадрата на иконку)
- [ ] Создать `src/render/itemAtlas.ts` по шаблону выше.
- [ ] Вызвать `loadItemAtlas()` при инициализации (рядом с загрузкой карты).
- [ ] Убедиться, что `assets/icons/items.png` синкается в `apps/client/public/assets/icons/` (`make assets-sync` или Makefile).
- [ ] Заменить `createLootGraphics()` (жёлтый квадрат) на `createLootSprite(itemId)`:
  ```ts
  // render/lootVisual.ts
  import { Sprite } from 'pixi.js';
  import { getItemIcon, ItemIconId } from './itemAtlas';

  export function createLootSprite(itemId: ItemIconId): Sprite {
    const sprite = new Sprite(getItemIcon(itemId));
    sprite.anchor.set(0.5);
    return sprite;
  }
  ```
- [ ] Обновить `mountLootVisual.ts` / `createLootVisualAt` — принимать `itemId`, вызывать `createLootSprite(itemId)` вместо `createLootGraphics()`.
- [ ] Пока единственный тип лута — `'gold'`; при спавне передавать `'gold'` как itemId.

### Despawning VFX
- [ ] **Despawning VFX** в RenderSync:
  - При `LootState === despawning`: плавный fade (`alpha = timer / LOOT.DESPAWN_TIME`).
  - По желанию: уменьшение scale.
- [ ] **Удаление entity** по таймеру:
  - `DespawnTimer -= dt`; при `<= 0` → `removeEntity` + очистка реестра.

### Подбор по радиусу (замена AABB)
- [ ] Вместо пересечения хитбоксов — `distance(playerCenter, lootCenter) < PICKUP_RADIUS`.
- [ ] Тап по луту (опционально): `POINTER_TAP` → hit-test по экранным координатам лута → intent подбора если в радиусе.

## Ограничения

- Пока **один тип лута** (MVP gold); `InventoryService` — run-20.
- Не реализовывать инвентарь — подбор по-прежнему инкрементирует счётчик.

## Как проверить

1. Лут отображается как **иконка монеты** (не жёлтый квадрат).
2. Пройти **мимо** лута — **не подбирается** (радиус меньше AABB).
3. Подойти вплотную — подбор с коротким fade.
4. Спам-клик — лут подбирается **ровно один раз** (reserved блокирует).
5. Убить врага, не подходить к луту — лут остаётся в `idle`.
6. Debug overlay: `LootState` переключается корректно (idle → reserved → picked → despawning).
7. Нет залипания `reserved` (проверить: создать ситуацию, где reservedBy мог бы исчезнуть — пока сложно, но логика на месте).

## Выход для следующего рана

Предсказуемый подбор лута с state machine; инфраструктура `LootGranted` для будущего инвентаря.
