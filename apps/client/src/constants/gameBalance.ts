/**
 * Числовые константы баланса и визуала MVP (единая точка настройки).
 * См. docs/post-mvp-development-plan.md, run-11.
 */
/**
 * Визуальная высота спрайта юнита в мировых пикселях (кадр ассета масштабируется к этому размеру).
 * Тайл карты 32×32 — берём 32, чтобы фигура читалась на сетке; хитбокс задаётся отдельно (PLAYER/ENEMY.HITBOX_SIZE).
 */
export const CHARACTER = {
  SPRITE_WORLD_HEIGHT_PX: 32,
} as const;

export const PLAYER = {
  SPEED: 220,
  HITBOX_SIZE: 24,
  /** Десктоп: цель moveTo считается достигнутой, если ближе (px). */
  MOVE_TO_STOP_PX: 5,
  ATTACK_RANGE: 56,
  ATTACK_COOLDOWN_MS: 300,
  ATTACK_DAMAGE: 25,
  MAX_HP: 100,
  VISUAL_SIZE: 24,
  VISUAL_COLOR: 0x3366ff,
} as const;

export const ENEMY = {
  HP: 100,
  HITBOX_SIZE: 24,
  VISUAL_SIZE: 24,
  VISUAL_COLOR: 0xcc3333,
} as const;

/** Враг: агро, think, скорость (run-18, post-mvp фаза 3). */
export const AI = {
  AGGRO_RADIUS: 150,
  ATTACK_RANGE: 52,
  ATTACK_DAMAGE: 10,
  ATTACK_COOLDOWN_MS: 800,
  THINK_INTERVAL_MIN: 0.1,
  THINK_INTERVAL_MAX: 0.3,
  THINK_PHASE_N: 4,
  /** Доля скорости игрока (~60%). */
  MOVE_SPEED: PLAYER.SPEED * 0.6,
  STUCK_MOVE_EPS: 0.35,
  STUCK_TIME_THRESHOLD: 0.5,
} as const;

export const LOOT = {
  HITBOX_SIZE: 24,
  VISUAL_SIZE: 20,
  VISUAL_COLOR: 0xe6c200,
  /** Центр–центр (px); меньше зоны пересечения AABB с хитбоксом 24 — нет «мимо» на мобиле. */
  PICKUP_RADIUS: 20,
  RESERVE_TIMEOUT: 0.2,
  /** UX: не обрезать при оптимизации (post-mvp фаза 2). */
  PICKUP_FEEDBACK_SEC: 0.25,
  /** Полный цикл despawning (fade + удаление entity). */
  DESPAWN_TIME: 0.3,
} as const;

export const INVENTORY = {
  MAX_SLOTS: 20,
  STACK_CAP: 99,
} as const;

export const ITEMS = {
  GOLD: "gold",
} as const;

export const CAMERA = {
  WORLD_SCALE: 1,
  /** Дополнительный отступ при clamp камеры к границам карты (мир, px). MVP: 0. */
  CLAMP_MARGIN: 0,
} as const;

/** Screen-space HP bars (run-15): не масштабируются камерой, snap к пикселю после worldToScreen. */
export const HP_BAR = {
  WIDTH: 40,
  HEIGHT: 4,
  /** Отступ вверх от верхнего края спрайта (мир, px), от центра сущности: см. hpBarLayer. */
  OFFSET_Y: 6,
  /** Фон полоски (серый). */
  BG_COLOR: 0x3d3d4a,
  COLOR_HIGH: 0x22c55e,
  COLOR_MID: 0xeab308,
  COLOR_LOW: 0xef4444,
  /** Отступ HUD игрока от краёв экрана (stage px). */
  HUD_MARGIN_X: 12,
  HUD_MARGIN_Y: 12,
} as const;

export const ENGINE = {
  /** Верхняя граница dt одного кадра (сек). */
  DT_MAX_SEC: 0.1,
  /** Очистка processedEvents по tickId не каждый кадр (run-16). */
  PROCESSED_EVENTS_CLEANUP_EVERY_TICKS: 30,
} as const;

/** Визуальный FSM: при битом state / нет клипа → idle (число = AnimState.Idle). */
export const ANIMATION = {
  DEFAULT_STATE: 0,
} as const;
