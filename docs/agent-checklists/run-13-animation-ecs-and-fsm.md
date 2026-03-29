# Run 13 — Компонент Animation, Facing и FSM анимаций

**Фаза плана:** post-mvp-development-plan § «Фаза 1.1» (Animation FSM, idle/walk).

## Цель

Ввести ECS-компоненты **Animation** и **Facing**, систему FSM с приоритетами переходов, данные клипов. Анимировать **idle ↔ walk** для игрока и врага. Боевые анимации (attack, hurt, death) — следующий ран.

## Входные условия

Run-12: спрайты солдата и орка загружены и отображаются (статичный кадр).

## Ключевые ссылки из architecture.md

- **Animation.state** — только клипы (idle, walk, attack, hurt, death); **не** канон боя.
- **Приоритеты:** death:100 > hurt:80 > attack:60 > walk:20 > idle:0.
- **AnimationIntentBuffer:** за тик на eid — один агрегированный запрос `bestByPriority`.
- **Fallback:** `ANIMATION.DEFAULT_STATE = 'idle'` при неизвестном состоянии.
- **Facing** — отдельный компонент, не часть state.

## Задачи (чек-лист)

- [ ] **ECS-компонент `Animation`** (SoA в bitECS):
  - `state` (числовой enum: idle=0, walk=1, attack=2, hurt=3, death=4)
  - `time` (секунды, накопление `+= dt`)
  - `duration` (секунды, из AnimationClips)
  - `loop` (0/1)
  - `locked` (0/1)
  - `minHoldTime` (секунды)
  - `interruptAt` (0..1, доля клипа)
- [ ] **ECS-компонент `Facing`**:
  - `direction` (числовой: 0=down, 1=up, 2=left, 3=right — или проще left/right для 2D side-view листов)
  - `locked` (0/1, для будущего facingLocked при атаке)
- [ ] **AnimationClips** — данные (`src/animation/animationClips.ts` или JSON):
  - Per-тип персонажа (soldier, orc), per-state: `{ duration, loop, interruptAt, minHoldTime, framesCount, frameWidth, frameHeight }`.
  - idle: loop=true, interruptAt=0, minHoldTime=0.
  - walk: loop=true, interruptAt=0, minHoldTime=0.05.
  - (attack, hurt, death — заполнить значения, но **не** подключать в этом ране.)
- [ ] **Константа** `ANIMATION.DEFAULT_STATE = 0` (idle) в `gameBalance.ts`.
- [ ] **AnimationRequest** тип:
  ```ts
  type AnimationRequest = { entity: number; state: number; force?: boolean }
  ```
- [ ] **AnimationIntentBuffer** (`Map<eid, AnimationRequest>`):
  - За тик на одну сущность — один запрос с **наибольшим приоритетом**.
  - Анти-spam: если `requestedState === currentAnimation.state` и не нужен перезапуск — не обновлять.
- [ ] **AnimationSystem** (`src/ecs/animationSystem.ts`):
  1. Читает `AnimationIntentBuffer`.
  2. Для каждого eid: сравнивает запрос с текущим `Animation.state`.
  3. Переход на **более сильный** — безусловно (с учётом locked).
  4. Переход на **более слабый** — если не locked, `minHoldTime` выдержан, `time/duration >= interruptAt`.
  5. При переходе: обновить state, сбросить time=0, установить duration/loop/locked/minHoldTime/interruptAt из AnimationClips.
  6. Fallback: неизвестный state → idle + dev warning.
  7. Очистить `AnimationIntentBuffer` в конце.
- [ ] **Обновление `Animation.time`:** `time += dt` каждый тик (до или внутри AnimationSystem).
- [ ] **Генерация запросов idle/walk:**
  - Если у сущности есть ненулевая скорость (Velocity) → запрос `walk`.
  - Иначе → запрос `idle`.
  - Для игрока: в системе движения или отдельной системе после movement.
  - Для врага: пока статичен → idle.
- [ ] **Facing:** обновлять по направлению движения (dx > 0 → right, dx < 0 → left); не менять при `Facing.locked`.
- [ ] **RenderSync обновления:**
  - По `Animation.state` и `Animation.time` — вычислить текущий кадр: `frameIndex = floor((time / duration) * framesCount) % framesCount`.
  - Применить `Texture` кадра из spritesheet к `Sprite` в реестре.
  - По `Facing.direction` — зеркалить спрайт (`sprite.scale.x = -1` или `1`).
- [ ] Загрузить **walk** spritesheet (Soldier-Walk.png, Orc-Walk.png) аналогично idle (run-12).
- [ ] Подключить AnimationSystem в pipeline **после** movement, **до** RenderSync (фаза 6 pipeline).

## Ограничения

- **Не** подключать attack/hurt/death анимации — run-14.
- **Не** вводить RenderAdapter.poll() — run-14.
- **Не** менять боевую логику.

## Как проверить

1. Игрок стоит → idle-анимация (кадры сменяются).
2. Игрок двигается → walk-анимация.
3. Остановился → плавный переход walk → idle (без дребезга).
4. Facing: идёт влево → спрайт зеркалён; вправо → нормальный.
5. Враг: idle-анимация (пока стоит на месте).
6. Debug overlay (D): показывает текущий `Animation.state` у сущностей.
7. Нет регрессий в бое, движении, подборе лута.

## Выход для следующего рана

Работающая FSM анимаций с idle/walk; инфраструктура для добавления боевых клипов.
