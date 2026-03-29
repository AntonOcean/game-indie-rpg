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
  VISUAL_SIZE: 24,
  VISUAL_COLOR: 0x3366ff,
} as const;

export const ENEMY = {
  HP: 100,
  HITBOX_SIZE: 24,
  VISUAL_SIZE: 24,
  VISUAL_COLOR: 0xcc3333,
} as const;

export const LOOT = {
  HITBOX_SIZE: 24,
  VISUAL_SIZE: 20,
  VISUAL_COLOR: 0xe6c200,
} as const;

export const CAMERA = {
  WORLD_SCALE: 1,
  /** Дополнительный отступ при clamp камеры к границам карты (мир, px). MVP: 0. */
  CLAMP_MARGIN: 0,
} as const;

export const ENGINE = {
  /** Верхняя граница dt одного кадра (сек). */
  DT_MAX_SEC: 0.1,
} as const;
