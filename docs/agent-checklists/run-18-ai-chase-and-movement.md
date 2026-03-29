# Run 18 — AI: Intent, преследование, коллизии, stuck

**Фаза плана:** post-mvp-development-plan § «Фаза 3» (AI — первая часть).

## Цель

Враги **преследуют** игрока при входе в `aggroRadius`. Движение — с теми же правилами коллизий, что у игрока. Детекция «застрял» и скольжение у стен.

## Входные условия

Run-17: лут с state machine, GameEventQueues, анимации, бой через события.

## Ключевые ссылки из architecture.md / post-mvp

- **AIIntent:** `{ type: 'chase' | 'attack' | 'idle'; targetId? }`.
- **AI не пушит DamageEvent** — только `AIIntent` → затем `AttackIntent` → конвейер.
- **DesiredVelocity** — один агрегирующий проход; knockback → `ExternalForces` (будущее).
- **Think phasing:** `thinkOffset = eid % N`; `think()` если `tickId % N === thinkOffset`.
- **deterministicRng** вместо `Math.random` для jitter.
- **Stuck detection:** lastX/Y + stuckTime, перпендикулярный сдвиг.
- AI выполняется в **фазе 5** pipeline (после movement).

## Задачи (чек-лист)

### AIComponent
- [ ] **ECS-компонент `AIComponent`**:
  - `state` (idle=0, chase=1, attack=2).
  - `targetId` (eid цели, 0 = нет).
  - `aggroRadius` (px, из констант).
  - `attackRange` (px, из констант).
  - `nextThinkTime` (секунды, монотонное время).
  - `thinkOffset` (= `spawnIndex % AI.THINK_PHASE_N`).
- [ ] **Константы** в `gameBalance.ts`:
  - `AI.AGGRO_RADIUS` (например 150 px).
  - `AI.ATTACK_RANGE` (40–60 px).
  - `AI.THINK_INTERVAL_MIN` / `AI.THINK_INTERVAL_MAX` (0.1–0.3 с).
  - `AI.THINK_PHASE_N` (делитель тика, например 3–5).
  - `AI.MOVE_SPEED` (скорость врага, например 60% от игрока).

### AI System
- [ ] **AISystem** (`src/ecs/aiSystem.ts`):
  - Выполняется в фазе 5 pipeline.
  - Для каждого врага с `AIComponent`:
    1. **Think gating:** `tickId % AI.THINK_PHASE_N !== thinkOffset` → пропустить think (но движение — каждый кадр).
    2. **Think:**
       - Расстояние до игрока.
       - Если > `aggroRadius` → `state = idle`, `targetId = 0`.
       - Если <= `aggroRadius` и > `attackRange` → `state = chase`, `targetId = playerEid`.
       - Если <= `attackRange` → `state = attack`, `targetId = playerEid`.
    3. `nextThinkTime = gameTime.now + jitterSec` (deterministicRng).
  - **AI → AnimationRequest**: chase → walk, idle → idle, attack → подготовить для run-19.

### Enemy Movement
- [ ] **Отдельная система или расширение MovementSystem:**
  - При `AIComponent.state === chase`:
    - Вектор от врага к цели → нормализация → `DesiredVelocity` = направление × `AI.MOVE_SPEED`.
  - При `idle`: `DesiredVelocity = (0, 0)`.
  - Применить коллизии (**те же** `isBlockedTile` / hitbox corner checks, что у игрока).
  - `Position += ActualVelocity * dt`.
- [ ] **Facing** врага: обновлять по направлению к цели при chase.

### Stuck Detection
- [ ] **Компонент `StuckDetector`**:
  - `lastX`, `lastY`, `stuckTime` (секунды).
- [ ] **Логика:**
  - Если `distance((x, y), (lastX, lastY)) < epsilon` → `stuckTime += dt`.
  - Если `stuckTime > STUCK_THRESHOLD` (например 0.5 с):
    - Сменить стратегию: сдвиг **перпендикулярно** направлению к цели на короткое расстояние.
    - Сбросить `stuckTime`.
  - Если движение заметное → `lastX = x, lastY = y, stuckTime = 0`.

### Deterministic RNG
- [ ] Простая функция `deterministicRng(seed: number, tickId: number): number` (0..1):
  - Например mulberry32 или xorshift от `seed ^ tickId`.
  - Использовать для jitter `nextThinkTime` и stuck-сдвига.

## Ограничения

- **Не** реализовывать AI-атаку (DamageEvent от врага) — run-19.
- AI при `state === attack` пока просто **стоит** рядом с игроком (не двигается и не бьёт).
- **Не** использовать `Math.random` для игровых решений.

## Как проверить

1. Враг стоит в idle, пока игрок далеко.
2. Игрок подходит → враг начинает преследование, движется к игроку.
3. Враг **не проходит сквозь стены** — коллизии работают.
4. Враг **не залипает** в углах надолго (stuck detection + slide).
5. Враг останавливается в `attackRange` от игрока.
6. Несколько врагов: не все «думают» в одном кадре (проверить через debug log tickId vs thinkOffset).
7. Debug overlay (D): `AIComponent.state`, `aggroRadius` (круг), `attackRange` (круг).
8. Анимация: walk при chase, idle при idle.

## Выход для следующего рана

Враги преследуют и останавливаются; готово к подключению AI-атаки и урону по игроку.
