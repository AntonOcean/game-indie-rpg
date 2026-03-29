# Run 14 — Боевые анимации и RenderAdapter

**Фаза плана:** post-mvp-development-plan § «Фаза 1.1» (attack, hurt, death + RenderAdapter).

## Цель

Подключить анимации **attack**, **hurt**, **death**. Ввести **RenderAdapter** с `poll()` и типом `RenderEvent` для получения `ANIMATION_COMPLETE` от Pixi. Реализовать **facingLocked** при атаке.

## Входные условия

Run-13: Animation + Facing компоненты, AnimationSystem FSM с idle/walk, AnimationClips, RenderSync отображает кадры.

## Ключевые ссылки из architecture.md

- **RenderAdapter:** единственная точка Pixi → ECS; внутренняя очередь `RenderEvent[]`, `poll()`.
- **RenderEvent:** `ANIMATION_COMPLETE`, `POINTER_TAP`, `SPRITE_READY`.
- Адаптер **не мутирует ECS** — только чтение + эмит в очередь.
- `poll()` в конце тика (фаза 7); consume в начале **следующего** тика.

## Задачи (чек-лист)

- [ ] Загрузить **attack**, **hurt**, **death** спрайт-листы:
  - `Soldier-Attack01.png`, `Soldier-Hurt.png`, `Soldier-Death.png`.
  - `Orc-Attack01.png` (или `Attack02`), `Orc-Hurt.png`, `Orc-Death.png`.
  - Скопировать в `assets/characters/soldier/` и `assets/characters/orc/`, sync.
- [ ] Обновить **AnimationClips** данными:
  - attack: loop=false, interruptAt=0.5, locked=true до interruptAt.
  - hurt: loop=false, interruptAt=0.7, minHoldTime=0.1.
  - death: loop=false, interruptAt=1.0, locked=true (не прерывается).
- [ ] **RenderAdapter** (`src/render/renderAdapter.ts`):
  - Внутренняя очередь: `RenderEvent[]`.
  - `push(event: RenderEvent)` — добавить в очередь (вызывается из Pixi-колбэков).
  - `poll(): RenderEvent[]` — вернуть накопленное и очистить.
  - **Не** импортировать ECS для мутации.
- [ ] **RenderEvent** тип (`src/render/renderEvent.ts`):
  ```ts
  type RenderEvent =
    | { type: 'ANIMATION_COMPLETE'; entity: number }
    | { type: 'POINTER_TAP'; worldX: number; worldY: number }
  ```
- [ ] В **RenderSync** / анимации спрайта: при завершении клипа (loop=false, time >= duration) — вызвать `renderAdapter.push({ type: 'ANIMATION_COMPLETE', entity })`.
- [ ] **Генерация запроса attack:**
  - В системе атаки (playerCombat): при успешной атаке — `AnimationIntentBuffer.set(eid, { state: ATTACK })`.
  - facingLocked: установить `Facing.locked = 1` при переходе в attack; снять при `time/duration >= interruptAt`.
- [ ] **Генерация запроса hurt:**
  - При получении урона сущностью — запрос `hurt` (подготовить хук; для MVP игрок пока не получает урон → hurt только для врагов при… не актуально в текущем бое. Пока оставить инфраструктуру, запрос добавится при AI-атаке в run-19).
- [ ] **Генерация запроса death:**
  - При `Health <= 0` / компонент `Dead` — запрос `death` с force=true.
  - Death animation: locked, не прерывается.
- [ ] **Consume ANIMATION_COMPLETE:**
  - `poll()` вызывается в конце тика (pipeline фаза 7).
  - В начале **следующего** тика: для каждого `ANIMATION_COMPLETE`:
    - Если entity в состоянии `death` → оставить в death (или удалить entity, как в текущем коде).
    - Если entity в состоянии `attack` или `hurt` → запрос `idle` (или `walk`, если есть скорость).
- [ ] **Рефакторинг pointer tap** (опционально):
  - Перенести обработку тапа из input → через RenderAdapter (POINTER_TAP) с мировыми координатами.
  - Или оставить текущую схему, если рефакторинг слишком объёмен.
- [ ] Подключить `poll()` в pipeline после RenderSync.

## Ограничения

- **Не** менять формулу урона и бой — только визуальную обратную связь.
- Hurt-анимация игрока: инфраструктура готова, но триггер появится в run-19 (AI атакует).
- **Не** вводить GameEventQueues — run-16.

## Как проверить

1. Тап по врагу в радиусе → attack-анимация солдата, затем возврат в idle/walk.
2. Во время attack-анимации — facing не меняется (facingLocked).
3. Враг с HP=0 → death-анимация проигрывается полностью, затем лут (как раньше).
4. Debug overlay (D): `Animation.state` обновляется корректно (attack → idle).
5. `ANIMATION_COMPLETE` корректно обрабатывается (нет залипания в attack).
6. Нет регрессий: кулдаун, урон, лут.

## Выход для следующего рана

Полная анимационная система; RenderAdapter готов к расширению (VFX, SPRITE_READY и т.д.).
