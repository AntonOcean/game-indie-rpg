# Run 28 — Диалоговая система и UI

**Фаза плана:** implementation-plan-stats-combat-npcs-shop § 3 «Невраждебные NPC и диалоги» — контент, UI, интеграция с вводом.

## Цель

Создать таблицу диалогов, **HTML-оверлей** для отображения реплик NPC, связать тап по NPC → открытие диалога. Блокировать игровой ввод при открытом оверлее.

## Входные условия

Run-27: `Npc` + `Interactable` + `DialogueId` компоненты, `resolveInteractionAtPoint`, трейдер на карте, тап по NPC → `console.log`.

## Ключевые ссылки

- implementation-plan-stats-combat-npcs-shop.md § 3: UI, контент, блокировка ввода.
- `apps/client/src/ui/inventoryOverlay.ts` — референс для стиля overlay.
- `apps/client/src/input/interactionResolver.ts` — резолвер из run-27.

## Задачи (чек-лист)

### Таблица диалогов

- [ ] Файл: `src/data/dialogueDefs.ts`.
- [ ] Типы:
  ```ts
  type DialogueLine = {
    speaker: string   // имя NPC
    text: string      // реплика
  }

  type DialogueScript = {
    id: number
    lines: DialogueLine[]
  }
  ```
- [ ] Данные: 1–2 тестовых диалога:
  ```ts
  const DIALOGUE_SCRIPTS: Record<number, DialogueScript> = {
    1: {
      id: 1,
      lines: [
        { speaker: "Торговец", text: "Добро пожаловать, путник! У меня есть товары для тебя." },
        { speaker: "Торговец", text: "Загляни в мой магазин — зелья могут спасти жизнь." },
      ],
    },
  }
  ```
- [ ] Функция-аксессор: `getDialogueScript(scriptId: number): DialogueScript | undefined`.

### Диалоговый оверлей (`dialogueOverlay.ts`)

- [ ] Файл: `src/ui/dialogueOverlay.ts`.
- [ ] **HTML-структура** (DOM, как `inventoryOverlay`):
  - Контейнер (полупрозрачный фон, нижняя часть экрана — стиль «речевой пузырь»).
  - Имя говорящего (bold).
  - Текст реплики.
  - Кнопка **«Далее»** (если есть следующая реплика).
  - Кнопка **«Закрыть»** (на последней реплике или всегда видна).
- [ ] Стиль: тёмный фон с `rgba`, белый текст, скруглённые углы — по аналогии с инвентарём.
- [ ] `pointer-events: auto` на оверлее — блокирует тапы к canvas.
- [ ] API:
  ```ts
  function openDialogue(scriptId: number): void
  function closeDialogue(): void
  function isDialogueOpen(): boolean
  function advanceDialogue(): void  // переключить на следующую реплику
  ```
- [ ] При открытии:
  - Найти `DialogueScript` по `scriptId`.
  - Показать первую реплику.
  - `currentLineIndex = 0`.
- [ ] Кнопка «Далее»: `currentLineIndex++`. Если `>= lines.length` → закрыть.
- [ ] Кнопка «Закрыть»: `closeDialogue()`.

### Блокировка игрового ввода

- [ ] При открытом диалоге: игровой ввод **не проходит** к `resolveInteractionAtPoint` и movement.
  - Использовать существующий механизм `canAcceptGameplayInput` или аналог (как для инвентаря).
  - Или: проверка `isDialogueOpen()` в input handler, `return` до обработки мирового тапа.
- [ ] При закрытии диалога: ввод восстанавливается.

### Интеграция с вводом

- [ ] В `inputBindings.ts` (или обработчике тапа):
  - Сейчас: `npc` → `console.log(...)`.
  - Заменить на:
    ```ts
    case "npc":
      const scriptId = DialogueId.scriptId[target.eid]
      if (scriptId) openDialogue(scriptId)
      break
    ```
- [ ] Проверка дистанции до NPC (опционально): открывать диалог только если игрок **в радиусе** `Interactable.radius` (или подойти к NPC перед открытием).
  - MVP: разрешить открытие с любой дистанции при тапе (мобила — удобнее).
  - Альтернатива: если далеко — двигать игрока к NPC, затем открыть (сложнее, оставить на потом).

### Протокол (заготовка)

- [ ] Новые типы событий (опционально, для будущего сервера):
  ```ts
  INTERACT_NPC = 'INTERACT_NPC'
  DIALOGUE_ADVANCE = 'DIALOGUE_ADVANCE'
  ```
- [ ] Эмитить `INTERACT_NPC` при открытии диалога (как `USE_ITEM` — no-op на сервере пока).

## Ограничения

- **Не** реализовывать ветвления диалогов (choices) — только линейный список реплик.
- **Не** реализовывать магазин (кнопка «Торговать» в диалоге → run-30).
- **Не** менять NPC-компоненты, резолвер, спавн (из run-27).
- **Не** менять боевую систему / AI.

## Как проверить

1. Тап по NPC-трейдеру → открывается диалоговый оверлей с именем и текстом.
2. Кнопка «Далее» → следующая реплика.
3. На последней реплике → «Закрыть» (или «Далее» закрывает).
4. При открытом диалоге: тапы **не** двигают игрока, **не** атакуют врагов.
5. После закрытия: игра работает нормально (движение, атаки).
6. `DialogueId.scriptId` на NPC = 1 → загружается правильный скрипт из `dialogueDefs`.
7. Стилистика оверлея выглядит аккуратно на мобиле (нижняя часть экрана, читаемый шрифт).
8. Если `scriptId` не найден в `DIALOGUE_SCRIPTS` → диалог не открывается (или toast с ошибкой в dev).

## Выход для следующего рана

Работающая диалоговая система; NPC разговаривает; основа для добавления кнопки «Торговать» в диалоге (run-30).
