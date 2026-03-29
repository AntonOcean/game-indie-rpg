# Чек-листы для разработки через агентов Cursor

Документы ниже рассчитаны на **один запуск агента**: ограниченный контекст, **законченный срез работы** и **явная проверка** в конце. Не смешивайте в одном чате несколько файлов `run-*.md` без необходимости.

## Обязательные ссылки для любого рана

Перед стартом агенту (или в правилах проекта) прикрепляйте:

- `docs/architecture.md` — слои, ECS ↔ Pixi, коллизии, протокол.
- `docs/implementation-plan.md` — фазы MVP и критерии готовности.
- **Только один** файл `docs/agent-checklists/run-XX-*.md` для текущей сессии.

## Правила для агента (кратко)

1. **Объём:** делать только задачи из текущего `run-XX`; не начинать следующую фазу «заодно».
2. **Архитектура:** ECS не импортирует Pixi; мутация графики — только в адаптере рендера / реестре представлений (см. architecture).
3. **Пути к карте:** в `.tmj` и цепочке ресурсов — префикс `/assets/`, зеркало на диске `public/assets/` (implementation-plan 2.1).
4. **Позиции:** `Position` в мировых пикселях; тайлы — через `floor` и `isBlockedTile`.
5. **Финиш рана:** выполнить все пункты «Как проверить»; при сбое — чинить в том же ране, не перекладывать на следующий.

## Порядок запусков (зависимости)

### MVP

```text
run-01 → run-02 → run-03 → run-04 → run-05 → run-06 → run-07 → run-08 → run-09 → run-10
```

Параллельно **нельзя**: каждый ран опирается на предыдущий.

### Post-MVP

```text
run-11 → run-12 → run-13 → run-14 ─┐
                                     ├→ run-15 → run-16 → run-17 → run-18 → run-19 → run-20 → run-21 → run-22 → run-23
```

Строго последовательно: каждый ран опирается на предыдущий. Run-15 (HP bars) зависит от анимаций (run-14); run-16 (events) зависит от HP bars; и т.д.

## Соответствие плану имплементации

### MVP

| Файл рана | Фазы implementation-plan |
|-----------|---------------------------|
| run-01 | Фаза 0 (клиент, зависимости, ассеты, пустая сцена) |
| run-02 | Фаза 0 (сервер статики, протокол-заглушка) |
| run-03 | Фаза 1 (TWA shell) |
| run-04 | Фаза 2 (карта, слои, данные коллизий) |
| run-05 | Фаза 3 (начало: ECS, игрок, реестр, RenderSystem) |
| run-06 | Фаза 3 (ввод → Intent, dt, движение, коллизии AABB↔тайлы, screen→world) |
| run-07 | Фаза 4 (камера, worldRoot, worldScale) |
| run-08 | Фаза 5 (враг, HP, атака, кулдаун) |
| run-09 | Фаза 6 (смерть, лут, подбор) |
| run-10 | Фаза 7 (полировка mobile-first, по возможности) |

### Post-MVP

| Файл рана | Фазы post-mvp-development-plan |
|-----------|--------------------------------|
| run-11 | Микро-улучшения: константы + debug overlay |
| run-12 | Фаза 1.1: ассеты спрайтов, статичное отображение |
| run-13 | Фаза 1.1: Animation + Facing ECS, FSM, idle/walk |
| run-14 | Фаза 1.1: attack/hurt/death анимации, RenderAdapter |
| run-15 | Фаза 1.2: HP бары (screen-space) |
| run-16 | Принципы: GameTime, GameEventQueues, DamageEvent pipeline |
| run-17 | Фаза 2: LootState machine, радиус подбора, VFX |
| run-18 | Фаза 3: AI intent, chase, collision, stuck detection |
| run-19 | Фаза 3: AI attack, CombatState, player death |
| run-20 | Фаза 4: playerState, InventoryService |
| run-21 | Фаза 4: UI инвентаря, типы лута, USE_ITEM |
| run-22 | Фаза 5: Telegram initData, save/load |
| run-23 | Фаза 6: звуковые эффекты |

## Итоговый чеклист MVP (после run-10)

Сверка с `implementation-plan.md`:

- [ ] Персонаж спавнится, движение стрелками и тапами
- [ ] Карта из Tiled (`map.tmj` + тайлсеты)
- [ ] Коллизии по слою `collisions`
- [ ] Атака по клику/тапу → урон
- [ ] Враг умирает
- [ ] Один тип лута и подбор

## Итоговый чеклист Post-MVP (после run-23)

Сверка с `post-mvp-development-plan.md`:

- [ ] Спрайты персонажей с анимацией (idle, walk, attack, hurt, death)
- [ ] FSM анимаций с приоритетами и fallback
- [ ] HP бары (враги + игрок)
- [ ] Событийный конвейер боя (GameEventQueues, DamageEvent, идемпотентность)
- [ ] Лут с state machine (reserved/picked/despawning), радиус подбора
- [ ] AI: преследование, коллизии, stuck detection, think phasing
- [ ] AI-атака, урон по игроку, смерть игрока + Game Over
- [ ] playerState + InventoryService (tryAddItem)
- [ ] UI инвентаря, множественные типы лута, USE_ITEM
- [ ] Telegram initData авторизация + save/load
- [ ] Звуковые эффекты + mute

## Если контекста не хватает

- **run-06** самый тяжёлый: при необходимости разбейте вручную на два чата — сначала утилиты коллизий + `PlayerIntent` + заглушка движения без полировки, затем разделение desktop/mobile, dt и откат по осям. Второму чату снова прикрепите `run-06` и укажите, что сделано из списка.
- **run-13** (Animation FSM) тоже объёмный: при необходимости разделить на два чата — (1) ECS-компоненты + AnimationClips + AnimationSystem, (2) интеграция с RenderSync + spritesheet кадры + Facing.
- **run-16** (EventQueues + Pipeline): если не помещается — (1) GameTime + GameEventQueues инфраструктура, (2) рефакторинг боя на события + HealthSystem.

## Список файлов

### MVP (run-01 — run-10)

| Файл | Назначение |
|------|------------|
| [run-01-client-scaffold.md](./run-01-client-scaffold.md) | Vite, зависимости, `public/assets`, пустая сцена Pixi |
| [run-02-server-and-protocol.md](./run-02-server-and-protocol.md) | Статика `dist`, типы `MOVE` / `ATTACK` / `USE_ITEM`, no-op |
| [run-03-telegram-webapp-shell.md](./run-03-telegram-webapp-shell.md) | TWA API, вёрстка, resize canvas |
| [run-04-tiled-map-and-collision-layer.md](./run-04-tiled-map-and-collision-layer.md) | pixi-tiledmap, слои, `collisions.data` |
| [run-05-ecs-player-and-render-adapter.md](./run-05-ecs-player-and-render-adapter.md) | bitECS, игрок, реестр, RenderSystem |
| [run-06-input-intent-movement-collisions.md](./run-06-input-intent-movement-collisions.md) | Intent, движение, dt, коллизии, screen→world |
| [run-07-camera-world-root.md](./run-07-camera-world-root.md) | worldRoot, worldScale, clamp камеры |
| [run-08-enemy-hp-attack.md](./run-08-enemy-hp-attack.md) | Враг, атака, кулдаун, протокол ATTACK |
| [run-09-death-and-loot.md](./run-09-death-and-loot.md) | Смерть, лут, подбор |
| [run-10-mobile-polish.md](./run-10-mobile-polish.md) | Жесты, UI по минимуму, опционально джойстик |

### Post-MVP (run-11 — run-23)

| Файл | Фаза post-mvp | Назначение |
|------|---------------|------------|
| [run-11-constants-and-debug-overlay.md](./run-11-constants-and-debug-overlay.md) | Микро-улучшения | Вынос магических чисел в `gameBalance.ts`, debug overlay (D) |
| [run-12-character-sprites.md](./run-12-character-sprites.md) | Фаза 1.1 (начало) | Спрайты солдата и орка, замена квадратов, статичный кадр |
| [run-13-animation-ecs-and-fsm.md](./run-13-animation-ecs-and-fsm.md) | Фаза 1.1 (ядро) | Animation + Facing компоненты, FSM с приоритетами, idle/walk |
| [run-14-combat-animations-and-render-adapter.md](./run-14-combat-animations-and-render-adapter.md) | Фаза 1.1 (бой) | Attack/hurt/death анимации, RenderAdapter, ANIMATION_COMPLETE |
| [run-15-hp-bars.md](./run-15-hp-bars.md) | Фаза 1.2 | HP бары врагов (screen-space) + HP игрока в HUD |
| [run-16-event-queues-and-damage-pipeline.md](./run-16-event-queues-and-damage-pipeline.md) | Принципы 6, 8 | GameTime, GameEventQueues, DamageEvent pipeline, идемпотентность |
| [run-17-loot-state-machine.md](./run-17-loot-state-machine.md) | Фаза 2 | LootState (idle/reserved/picked/despawning), радиус, fade VFX |
| [run-18-ai-chase-and-movement.md](./run-18-ai-chase-and-movement.md) | Фаза 3 (начало) | AIIntent, преследование, коллизии, stuck detection, think phasing |
| [run-19-ai-attack-and-player-death.md](./run-19-ai-attack-and-player-death.md) | Фаза 3 (бой) | CombatState, AI-атака, урон по игроку, смерть, Game Over |
| [run-20-player-state-and-inventory-service.md](./run-20-player-state-and-inventory-service.md) | Фаза 4 (начало) | playerState, InventoryService, tryAddItem, граница ECS/state |
| [run-21-inventory-ui-and-loot-types.md](./run-21-inventory-ui-and-loot-types.md) | Фаза 4 (UI) | Множественные типы лута, UI инвентаря, USE_ITEM |
| [run-22-telegram-auth-and-save.md](./run-22-telegram-auth-and-save.md) | Фаза 5 | initData верификация, save/load API, auto-save |
| [run-23-sound-effects.md](./run-23-sound-effects.md) | Фаза 6 | SFX из `assets/audio/` (RPG Sound Pack), WAV, autoplay unlock, mute; BGM опционально отдельным файлом |
