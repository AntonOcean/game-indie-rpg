# Run 19 — AI-атака, урон по игроку, смерть игрока

**Фаза плана:** post-mvp-development-plan § «Фаза 3» (вторая часть) + Фаза 1.2 (HP игрока).

## Цель

Враги **наносят урон** игроку через тот же DamageEvent pipeline. Игрок может **умереть**. Ввести **CombatState** для разделения боевой логики и анимации.

## Входные условия

Run-18: враги преследуют, AI state machine работает, enemy movement с коллизиями.

## Ключевые ссылки из architecture.md

- **CombatState** (alive, dead, attacking, stunned) — канон для логики; не путать с `Animation.state`.
- AI → `AttackIntent` → конвейер → `DamageEvent` → `HealthSystem` — как у игрока.
- **AI не пушит DamageEvent напрямую**.
- `emitDamage` — только из одной точки конвейера.

## Задачи (чек-лист)

### CombatState
- [ ] **ECS-компонент `CombatState`**:
  - `state` (alive=0, dead=1, attacking=2, stunned=3).
- [ ] Добавить `CombatState` к **игроку** и **всем врагам** при спавне (initial: alive).
- [ ] Смерть определяется по `CombatState.state === dead`, **не** по `Animation.state === death`.
- [ ] Обновить существующие проверки `Dead` компонента: либо заменить на CombatState, либо синхронизировать.

### AI Attack
- [ ] В `AISystem`: при `state === attack`:
  - Проверить кулдаун (компонент `AttackCooldown` на враге, как у игрока).
  - Проверить расстояние <= `AI.ATTACK_RANGE`.
  - Проверить цель жива (`CombatState` игрока !== dead).
  - Если всё ОК → создать `AttackIntent { sourceId: enemyEid, targetId: playerEid, ... }`.
- [ ] **AttackIntent** обрабатывается **тем же** конвейером, что атака игрока:
  - Единая очередь `AttackIntent[]` за тик (и от игрока, и от AI).
  - Combat resolution → `emitDamage` → `HealthSystem`.
- [ ] **Константы** в `gameBalance.ts`:
  - `AI.ATTACK_DAMAGE` (меньше чем у игрока, например 10).
  - `AI.ATTACK_COOLDOWN_MS` (600–1000 ms).

### Player Damage & Death
- [ ] **HealthSystem** уже обрабатывает `DamageEvent` → HP уменьшается для любой цели (и врагов, и игрока).
- [ ] **HP бар игрока** (run-15) обновляется при получении урона.
- [ ] **Hurt-анимация игрока:** при `DamageEvent` с `targetId === playerEid`:
  - `AnimationRequest { entity: playerEid, state: hurt }`.
- [ ] **Смерть игрока:** при `Health <= 0`:
  - `CombatState = dead`.
  - `AnimationRequest { state: death, force: true }`.
  - Отключить ввод (игрок не может двигаться/атаковать).
  - AI перестаёт атаковать мёртвого игрока.
- [ ] **Game Over экран:**
  - После death-анимации (ANIMATION_COMPLETE с death) — показать overlay «Game Over».
  - Кнопка «Restart» / «Retry» → пересоздать ECS мир, респаун игрока и врагов.
  - Или простой вариант: `location.reload()`.

### Attack Animation для врага
- [ ] При AI-атаке: `AnimationRequest { entity: enemyEid, state: attack }`.
- [ ] facingLocked при атаке врага (аналогично игроку из run-14).

### Debug Overlay
- [ ] Показывать `CombatState` рядом с сущностями.
- [ ] Показывать `attackRange` кругом вокруг врага при chase/attack.

## Ограничения

- Не реализовывать stunned — заглушка в enum, механика позже.
- Не реализовывать knockback / ExternalForces — следующие фазы.
- Game Over UI — минимально (текст + кнопка), без сложной вёрстки.

## Как проверить

1. Враг подходит и **бьёт** игрока с кулдауном → HP бар уменьшается.
2. Hurt-анимация проигрывается на игроке при получении урона.
3. HP = 0 → death-анимация → Game Over overlay.
4. Restart → новая сессия, всё работает заново.
5. Мёртвый игрок **не атакует** и **не двигается**.
6. Враги **не атакуют** мёртвого игрока.
7. DamageEvent от AI проходит через **тот же** pipeline (проверить eventId в логах).
8. Несколько врагов одновременно бьют игрока — HP уменьшается корректно (не двойной урон от одного удара).

## Выход для следующего рана

Полный боевой цикл: игрок бьёт врага, враг бьёт игрока; смерть с обеих сторон. Готово к инвентарю.
