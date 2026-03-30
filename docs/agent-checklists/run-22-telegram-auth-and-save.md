# Run 22 — Авторизация Telegram и сохранение прогресса

**Фаза плана:** post-mvp-development-plan § «Фаза 5».

## Цель

Проверка **`initData`** Telegram на сервере. Сохранение и восстановление прогресса (позиция, HP, инвентарь) по `user.id`.

## Входные условия

Run-21: инвентарь, множественный лут, USE_ITEM протокол.

## Ключевые ссылки

- architecture.md: «Сервер Node.js (MVP и рост)», недоверие к клиенту.
- post-mvp: фаза 5, формат сейва, `initData`.

## Задачи (чек-лист)

### Серверная авторизация
- [x] **Telegram `initData` проверка** (`apps/server/auth.js`):
  - Endpoint: `POST /api/auth`.
  - Принять `initData` string из клиента.
  - Проверить HMAC-SHA256 подпись с BOT_TOKEN (по документации TWA).
  - Извлечь `user.id` как стабильный ключ.
  - Вернуть `{ userId, ok: true }` или 401.
- [x] **`BOT_TOKEN`** — в `.env` (добавить в `.env.example`, **не** коммитить реальный токен).
- [x] Middleware или guard для protected endpoints.

### Save / Load API
- [x] **Формат сейва** (`SaveData`):
  ```ts
  {
    version: number;          // для миграции схемы
    position: { x: number; y: number };
    health: { current: number; max: number };
    inventory: ItemStack[];
    gold: number;             // или вычислять из inventory
    timestamp: string;        // ISO 8601
  }
  ```
- [x] **`POST /api/save`**:
  - Проверка auth (userId из сессии / токена).
  - Принять `SaveData` body.
  - Сохранить в `data/saves/{userId}.json` (или SQLite).
  - Версионирование: `version` поле для будущих миграций.
- [x] **`GET /api/load`**:
  - Проверка auth.
  - Вернуть `SaveData` или `{ empty: true }` для нового игрока.
- [x] **Хранилище:**
  - MVP: JSON файлы в `data/saves/` (добавить в .gitignore).
  - Создать директорию при первом сейве.

### Клиентская интеграция
- [x] **При старте приложения:**
  1. Получить `Telegram.WebApp.initData`.
  2. Отправить на `POST /api/auth`.
  3. При успехе → `GET /api/load`.
  4. Если есть сейв → восстановить: Position, Health, playerState.inventory.
  5. Если нет → стандартный спавн (как сейчас).
  6. Если вне Telegram (dev) → пропустить auth, играть без сейва.
- [x] **Auto-save:**
  - При подборе лута / смерти врага / USE_ITEM → собрать SaveData → `POST /api/save`.
  - Periodic save: каждые 30 секунд, если были изменения.
  - Debounce: не чаще 1 запроса в 5 секунд.
- [x] **SaveData сборка:**
  - Position из ECS (Position[playerEid]).
  - Health из ECS (Health[playerEid]).
  - Inventory из `inventoryService.getInventory()`.

### Безопасность
- [x] **Не** принимать произвольный `SaveData` без проверки auth.
- [x] **Не** доверять HP / position с клиента как «правде» (комментарий в коде: при авторитетном сервере — канон сервера).
- [x] initData без валидного BOT_TOKEN → 401.

## Ограничения

- Хранилище MVP — JSON файлы (не production-grade, но достаточно).
- Не реализовывать WebSocket / real-time sync.
- Не реализовывать серверную валидацию gameplay (урон, позиция).
- Миграция сейвов (при смене `version`) — оставить stub / TODO.

## Как проверить

1. Запуск в Telegram → auth проходит → `userId` получен.
2. Играть → убить врага → подобрать лут → закрыть app.
3. Открыть заново → позиция, HP, инвентарь восстановлены.
4. Запуск **вне** Telegram (dev) → игра работает без auth.
5. Подмена `initData` → 401 от сервера.
6. Файл сейва создаётся в `data/saves/`.
7. Повторный вход → тот же прогресс.

## Выход для следующего рана

Персистентный прогресс; авторизация для привязки к Telegram-аккаунту.
