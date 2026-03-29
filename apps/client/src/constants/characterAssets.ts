import { CHARACTER } from "./gameBalance";

/**
 * Tiny RPG Character Pack: кадры 100×100 на листе (idle 600×100 → 6 кадров).
 * См. docs/agent-checklists/run-12-character-sprites.md
 */
export const CHARACTER_SHEET = {
  FRAME_PX: 100,
  IDLE_FRAME_COUNT: 6,
  SOLDIER_IDLE_URL: "/assets/characters/soldier/Soldier-Idle.png",
  ORC_IDLE_URL: "/assets/characters/orc/Orc-Idle.png",
} as const;

/** Масштаб кадра 100×100 → высота в мире `CHARACTER.SPRITE_WORLD_HEIGHT_PX` (как тайл 32). */
export function characterSpriteWorldScale(): number {
  return CHARACTER.SPRITE_WORLD_HEIGHT_PX / CHARACTER_SHEET.FRAME_PX;
}
