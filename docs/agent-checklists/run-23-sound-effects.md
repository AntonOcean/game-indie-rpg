# Run 23 — Звуковые эффекты

**Фаза плана:** post-mvp-development-plan § «Фаза 6».

## Цель

Звуковая обратная связь: удар, получение урона, подбор лута, смерть. Mute-переключатель. Учёт autoplay-политики браузера / TWA.

## Входные условия

Run-22: полный геймплейный цикл с сейвом.

## Ассеты: RPG Sound Pack → `assets/audio/`

Источник (локально, обычно в `.gitignore`): `full-assets/RPG Sound Pack/`. В репозиторий попадают **только** скопированные файлы под `assets/audio/` — после `make assets-sync` они доступны как `/assets/audio/…`.

Уже перенесены (имя в игре → исходный файл в паке):

| `soundId` / файл в `assets/audio/` | Исходник в паке | Назначение |
|--------------------------------------|-----------------|------------|
| `attack.wav` | `battle/swing.wav` | Удар мечом (атака игрока) |
| `hurt.wav` | `NPC/beetle/bite-small.wav` | Получение урона (короткий укус/удар) |
| `pickup.wav` | `inventory/coin.wav` | Подбор лута / монет |
| `enemy-death.wav` | `NPC/gutteral beast/mnstr4.wav` | Смерть врага |
| `player-death.wav` | `NPC/shade/shade3.wav` | Смерть игрока |
| `ui-click.wav` | `interface/interface1.wav` | Клик по UI / инвентарь |

Формат **WAV** — браузер декодирует через `decodeAudioData` так же, как OGG/MP3.

**Фоновой музыки в этом паке нет** (только SFX и один `world/door.wav`). Если появится отдельный трек — положить, например, `assets/audio/music-loop.ogg` и подключить в опциональном `playMusic` (см. ниже).

**Добавить новый SFX:** скопировать из пака в `assets/audio/` под понятным именем, зарегистрировать в `audioManager` / таблице загрузки, выполнить `make assets-sync`.

## Задачи (чек-лист)

### Audio Manager
- [ ] **`src/audio/audioManager.ts`:**
  - Управление Web Audio API `AudioContext`.
  - `play(soundId: string)` — воспроизвести SFX.
  - `setMuted(muted: boolean)`.
  - `isMuted(): boolean`.
  - Пул аудиоисточников (не создавать новый `Audio` / `BufferSource` на каждый вызов).
- [ ] **Autoplay unlock:**
  - `AudioContext` создаётся в `suspended` state.
  - На первый `pointerdown` / `touchstart` → `context.resume()`.
  - До resume: `play()` — no-op или буферизация.
- [ ] Предзагрузка звуков при инициализации (fetch + decodeAudioData).

### Звуковые файлы
- [ ] Использовать **уже лежащие** в `assets/audio/*.wav` (см. таблицу выше; при отсутствии — скопировать из `full-assets/RPG Sound Pack/` по той же таблице).
- [ ] Убедиться, что после `make assets-sync` файлы есть в `apps/client/public/assets/audio/`.
- [ ] Загрузить через `fetch('/assets/audio/attack.wav')` и т.д. при старте (или лениво при первом `play`).
- [ ] В коде использовать **идентификаторы**, совпадающие с именами файлов без расширения: `attack`, `hurt`, `pickup`, `enemy-death`, `player-death`, `ui-click`.

### Интеграция в игровой цикл
- [ ] **Атака игрока** (успешный DamageEvent с sourceId=player): `audioManager.play('attack')`.
- [ ] **Урон по игроку** (DamageEvent с targetId=player): `audioManager.play('hurt')`.
- [ ] **Подбор лута** (LootGranted): `audioManager.play('pickup')`.
- [ ] **Смерть врага** (CombatState → dead): `audioManager.play('enemy-death')`.
- [ ] **Смерть игрока**: `audioManager.play('player-death')`.
- [ ] Триггеры — в presentation layer или рядом с HealthSystem / LootSystem, **не** внутри ECS-систем как сайд-эффект.

### UI Mute
- [ ] **Кнопка mute / unmute** в HUD:
  - Иконка (🔊 / 🔇 или простой текст «Sound: ON/OFF»).
  - Тап → `audioManager.setMuted(!)`.
  - Сохранять preference в `localStorage`.
- [ ] При старте: читать `localStorage` → применять muted state.

### Фоновая музыка (опционально)
- [ ] Если есть подходящий трек:
  - `audioManager.playMusic(trackId)` — loop, низкая громкость.
  - `audioManager.setMusicVolume(v: number)`.
  - При mute → music тоже заглушается.
- [ ] Если нет трека — пропустить, не блокирует ран.

## Ограничения

- Звуки не должны вызывать **lag / frame drop** на слабых устройствах.
- Не реализовывать 3D audio / позиционное звучание.
- Замена SFX: другой файл из того же пака — скопировать в `assets/audio/` под тем же логическим именем (или добавить новый ключ и строку в таблицу этого чеклиста).

## Как проверить

1. Первый тап → AudioContext разблокирован.
2. Удар по врагу → звук атаки.
3. Враг бьёт игрока → звук hurt.
4. Подбор лута → звук pickup.
5. Смерть врага → звук death.
6. Кнопка mute → все звуки отключены; повторно → включены.
7. Перезагрузка → mute preference сохранён.
8. На мобиле (TWA): звуки воспроизводятся после первого жеста.
9. **Нет** заметных frame drops при одновременных звуках.

## Выход

Звуковая обратная связь по всем ключевым событиям; mute control; autoplay-safe.
