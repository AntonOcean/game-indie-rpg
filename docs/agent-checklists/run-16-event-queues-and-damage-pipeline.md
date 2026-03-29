# Run 16 — GameTime, GameEventQueues и DamageEvent Pipeline

**Фаза плана:** post-mvp-development-plan § принципы 6, 8; architecture.md § «GameEventQueues», «Фазы тика», «Бой и лут».

## Цель

Ввести **GameTime** (единый контекст времени), **GameEventQueues** (double-buffer) и перевести бой на **событийный конвейер**: `AttackIntent → DamageEvent → HealthSystem`. Это **фундамент** для авторитетного сервера, AI-атак и идемпотентности.

## Входные условия

Run-15: HP бары, анимации, бой работает (прямая мутация Health).

## Ключевые ссылки из architecture.md

- **GameTime:** `{ dt, now, tickId }` — один источник для всех систем.
- **GameEventQueues:** `current` (пишем) / `processing` (читаем после swap); фасад `emitDamage` / `getDamageEvents`.
- **DamageEvent:** обязательный `eventId`, `tickId`, `sourceType`, `sourceId`, `targetId`, `amount`, `sourceX`, `sourceY`.
- **processedEvents:** `Map<tickId, Set<eventId>>` со скользящим окном.
- **AttackIntent:** намерение; урон — только через `emitDamage` из одной точки.

## Задачи (чек-лист)

### GameTime
- [ ] Тип `GameTime` (`src/ecs/gameTime.ts`):
  ```ts
  { dt: number; now: number; tickId: number }
  ```
- [ ] Создать экземпляр один раз; обновлять в начале каждого тика (из Pixi ticker deltaMS → секунды, с капом).
- [ ] `tickId` инкремент +1 каждый тик.
- [ ] Заменить ad-hoc `dt` в системах на чтение из `GameTime`.

### GameEventQueues
- [ ] Тип `DamageEvent` (`src/events/damageEvent.ts`):
  ```ts
  { tickId: number; eventId: string; sourceType: 'entity' | 'environment'; sourceId: number; targetId: number; amount: number; sourceX: number; sourceY: number }
  ```
- [ ] `GameEventQueues` (`src/events/gameEventQueues.ts`):
  - `current: { damage: DamageEvent[] }` — только запись.
  - `processing: { damage: DamageEvent[] }` — только чтение.
  - `emitDamage(e: DamageEvent)` — пушит в `current.damage`.
  - `getDamageEvents(): readonly DamageEvent[]` — возвращает `processing.damage`.
  - `swap()` — обмен `current ↔ processing`; очистка нового `current`.
  - `clearProcessing()` — вызов после фазы 3 (Events → State).
  - ❌ Не экспортировать массивы напрямую.
- [ ] `eventId` — генерация: `${tickId}-${monotonicSeq}` (простой счётчик внутри тика).

### AttackIntent
- [ ] Тип `AttackIntent` (`src/events/attackIntent.ts`):
  ```ts
  { sourceId: number; targetId: number; sourceX: number; sourceY: number }
  ```
- [ ] В `playerCombat` (или переименованной системе): вместо прямого `Health[target] -= damage` → создать `AttackIntent`.

### Combat Pipeline (один проход, пока не разбиваем на 3 системы)
- [ ] **resolveAndEmitDamage** (или `combatSystem`):
  1. Получить `AttackIntent`.
  2. Проверить: цель жива, дистанция < attackRange, кулдаун истёк.
  3. Рассчитать damage (пока фиксированный из констант).
  4. Вызвать `queues.emitDamage(...)` с полным `DamageEvent`.
  5. Не менять `Health` напрямую.
  6. Стартовать кулдаун.
  7. Эмитить протокол ATTACK (как раньше).

### HealthSystem
- [ ] **HealthSystem** (`src/ecs/healthSystem.ts`):
  - Вызывается в **фазе 3** (Events → State changes).
  - Читает `queues.getDamageEvents()`.
  - Для каждого `DamageEvent`:
    - Проверить `eventId` в `processedEvents` → если найден, **пропустить**.
    - Применить: `Health[targetId] -= amount`.
    - Записать `eventId` в `processedEvents`.
  - После обработки: `queues.clearProcessing()` (для damage).
- [ ] **processedEvents** (`src/events/processedEvents.ts`):
  - `Map<number, Set<string>>` (tickId → Set<eventId>).
  - `markProcessed(tickId, eventId)`.
  - `isProcessed(eventId)` — поиск по всем актуальным тикам.
  - `cleanup(currentTickId, windowSize = 60)` — удалить записи старше `currentTickId - windowSize`.
  - Cleanup вызывать раз в N тиков (не каждый кадр).

### Pipeline
- [ ] Обновить порядок тика (`pipeline.ts` и `main.ts`):
  1. GameTime update
  2. Input → Intent (+ AttackIntent при тапе)
  3. Combat resolution → `emitDamage` (Intent → Events)
  4. `swap()` на прошлом кадре уже сделан; HealthSystem читает `processing` (Events → State)
  5. Death / loot (как раньше)
  6. Movement + Collision
  7. AI (пока нет)
  8. Animation + RenderSync
  9. `RenderAdapter.poll()`
  10. `swap()` + tickId++
- [ ] Зафиксировать порядок в комментарии/документации в `pipeline.ts`.

## Ограничения

- Не разбивать combat на 3 отдельные системы (TargetResolution / DamageCalculation / DamageEventEmitter) — это рефакторинг по мере роста.
- Не добавлять `LootGranted` event — run-17.
- Не менять AI (его нет пока).

## Как проверить

1. Бой работает **идентично** до и после: тот же DPS, те же условия.
2. В console.log (или debug): видны `DamageEvent` с уникальными `eventId`.
3. Быстрый спам-клик **не** даёт двойной урон (кулдаун + идемпотентность).
4. HP бар обновляется корректно через HealthSystem.
5. Смерть врага → лут (как раньше).
6. `GameTime.tickId` инкрементируется (проверить в debug overlay или логе).

## Выход для следующего рана

Событийный конвейер боя; GameEventQueues готовы к расширению (LootGranted, AI-атаки).
