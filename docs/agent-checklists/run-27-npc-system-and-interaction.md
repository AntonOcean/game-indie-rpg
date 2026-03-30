# Run 27 — NPC-система, interaction resolver и спавн трейдера

**Фаза плана:** implementation-plan-stats-combat-npcs-shop § 3 «Невраждебные NPC и диалоги» — ECS-компоненты, резолвер, спавн, ассет трейдера.

## Цель

Создать ECS-компоненты для NPC (`Npc`, `Interactable`), **единый резолвер** взаимодействий в мире (`resolveInteractionAtPoint`), runtime guard `Npc` + `Enemy`, и спавнить **трейдера** с ассетом на карте.

## Входные условия

Run-26: статистика, `CombatGroup`, save v2. Бой и AI работают.

## Ключевые ссылки

- implementation-plan-stats-combat-npcs-shop.md § 3: ECS, ввод, resolveInteractionAtPoint, runtime guard.
- architecture.md § «Ввод: Input → Intent»: тап → мировые координаты.
- `apps/client/src/input/inputBindings.ts`: текущий обработчик ввода.
- `apps/client/src/ecs/enemyHitTest.ts`: hit-test врагов.
- `apps/client/src/constants/characterAssets.ts`: реестр ассетов персонажей.
- `assets/characters/trader/`: ассет трейдера (Trader-Idle.png).

## Задачи (чек-лист)

### ECS-компоненты

- [ ] **`Npc`** — маркер-компонент (tag):
  ```ts
  Npc = defineComponent({})
  ```
- [ ] **`Interactable`** — данные взаимодействия:
  ```ts
  Interactable = defineComponent({
    radius: Types.f32,    // радиус взаимодействия в мировых пикселях
    kind: Types.ui8,      // enum: 0 = dialogue, 1 = shop
  })
  ```
- [ ] Enum / константы для `kind`:
  ```ts
  const INTERACT_KIND = { DIALOGUE: 0, SHOP: 1 } as const
  ```

### Runtime guard: `Npc` + `Enemy`

- [ ] При спавне NPC (`spawnNpc` или общая фабрика):
  ```ts
  if (hasComponent(world, Enemy, eid) && hasComponent(world, Npc, eid)) {
    console.error(`Entity ${eid} has both Npc and Enemy — removing Enemy`);
    removeComponent(world, Enemy, eid);
  }
  ```
- [ ] В `collectPlayerAttackIntents` (или аналоге hit-test атаки): пропускать сущности с `Npc` даже если у них случайно есть `Enemy`.

### `interactionResolver.ts`

- [ ] Файл: `src/input/interactionResolver.ts`.
- [ ] Типы:
  ```ts
  type InteractionTarget =
    | { kind: "npc"; eid: number }
    | { kind: "loot"; eid: number }
    | { kind: "enemy"; eid: number }
    | { kind: "none" }
  ```
- [ ] Функция:
  ```ts
  function resolveInteractionAtPoint(
    worldPos: { x: number; y: number },
    world: World,
    playerEid: number
  ): InteractionTarget
  ```
- [ ] Приоритет внутри резолвера (только сущности мира):
  1. `npc` — hit-test по `Npc` + `Interactable` + `Hitbox`, radius из `Interactable.radius`.
  2. `loot` — hit-test по `Loot` + `Hitbox`.
  3. `enemy` — hit-test по `Enemy` + `Hitbox` (не `Dead`).
  4. `none`.
- [ ] **Distance tiebreaker:** внутри каждой группы — ближайшая сущность к `worldPos` (по `sqDist` к центру).
- [ ] **Combat context:** если `CombatState` игрока === `attacking` или `alive` и есть `Enemy` в `attackRange` → понизить приоритет NPC (тап в зоне пересечения → враг).

### Интеграция с вводом

- [ ] В `inputBindings.ts` (или обработчике тапа):
  1. Если тап поймал **HTML overlay** (инвентарь открыт, или `target` — DOM-элемент UI) → только UI, **выход**. Не вызывать `resolveInteractionAtPoint`.
  2. Иначе: `worldPos = screenToWorld(...)`.
  3. `const target = resolveInteractionAtPoint(worldPos, world, playerEid)`.
  4. По результату:
     - `npc` → пока: `console.log("Interact NPC", target.eid)` (диалог → run-28).
     - `loot` → подбор (как сейчас).
     - `enemy` → атака (как сейчас).
     - `none` → move-to (как сейчас).
- [ ] Удалить / объединить дублирующие hit-test врагов если они были inline в input handler (теперь через резолвер).

### Спавн NPC-трейдера

- [ ] Функция `spawnNpc(world, config)` (`src/ecs/npcSpawn.ts`):
  - Создать entity.
  - `addComponent`: `Position`, `Npc`, `Interactable`, `Hitbox`, `RenderRef` (для визуала).
  - Runtime guard (см. выше).
  - Не добавлять `Enemy`, `Health`, `BaseStats` (NPC неуязвим).
- [ ] Координаты трейдера:
  - Предпочтительно из **Tiled object layer** (custom property `npc_type: "trader"`).
  - Фоллбэк: константы в коде рядом со спавном врагов.
- [ ] `Interactable.kind` = `INTERACT_KIND.SHOP`.
- [ ] `Interactable.radius` — например `40` пикселей (подобрать визуально; `< hitboxSize` врага чтобы не было пересечений).

### Ассет трейдера

- [ ] Скопировать `assets/characters/trader/` в `public/assets/characters/trader/` (или настроить Vite copy).
- [ ] Добавить в `characterAssets.ts` запись для `trader`:
  ```ts
  trader: {
    idle: { path: '/assets/characters/trader/Trader-Idle.png', ... }
  }
  ```
- [ ] Загрузка текстуры по аналогии с солдатом/орком (`loadCharacterAnimationTextures.ts`).
- [ ] Mount визуала NPC (спрайт idle): по аналогии с `mountPlayerVisual` / `mountEnemyVisual`, но для NPC — только idle-цикл.
- [ ] Добавить в реестр рендера (`RenderRef`).

### `DialogueId` компонент (заготовка для run-28)

- [ ] Компонент:
  ```ts
  DialogueId = defineComponent({ scriptId: Types.ui16 })
  ```
- [ ] При спавне трейдера: `DialogueId.scriptId[eid] = 1` (id в будущей таблице диалогов).

## Ограничения

- **Не** реализовывать диалоговый UI (это run-28).
- **Не** реализовывать магазин / shop overlay (это run-30).
- **Не** менять боевой пайплайн / AI.
- **Не** добавлять анимации walk/attack для трейдера — только idle.

## Как проверить

1. Игра запускается, на карте виден NPC-трейдер со спрайтом Trader-Idle.
2. Тап по NPC → в консоли `"Interact NPC"` + eid. Игрок **не** атакует NPC.
3. Тап по врагу рядом с NPC → атака (enemy приоритет при combat context).
4. Тап по пустому месту → движение (как раньше).
5. Тап по луту → подбор (как раньше).
6. Если дать NPC одновременно `Npc` + `Enemy` (тест) → `Enemy` удаляется, guard в логе.
7. `collectPlayerAttackIntents` пропускает сущности с `Npc`.
8. HTML overlay (инвентарь) → тап не проходит в мир.

## Выход для следующего рана

NPC на карте с визуалом; `resolveInteractionAtPoint` как единый вход для тапов; заготовка `DialogueId` для диалогов (run-28).
