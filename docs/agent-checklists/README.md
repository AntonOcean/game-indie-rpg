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

```text
run-01 → run-02 → run-03 → run-04 → run-05 → run-06 → run-07 → run-08 → run-09 → run-10
```

Параллельно **нельзя**: каждый ран опирается на предыдущий.

## Соответствие плану имплементации

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

## Итоговый чеклист MVP (после run-10)

Сверка с `implementation-plan.md`:

- [ ] Персонаж спавнится, движение стрелками и тапами
- [ ] Карта из Tiled (`map.tmj` + тайлсеты)
- [ ] Коллизии по слою `collisions`
- [ ] Атака по клику/тапу → урон
- [ ] Враг умирает
- [ ] Один тип лута и подбор

## Если контекста не хватает

- **run-06** самый тяжёлый: при необходимости разбейте вручную на два чата — сначала утилиты коллизий + `PlayerIntent` + заглушка движения без полировки, затем разделение desktop/mobile, dt и откат по осям. Второму чату снова прикрепите `run-06` и укажите, что сделано из списка.

## Список файлов

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
