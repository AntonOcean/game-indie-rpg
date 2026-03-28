import type { Container } from "pixi.js";

/**
 * Глобальные координаты указателя (как в FederatedPointerEvent.global) → мир worldRoot.
 * Одна точка входа для ввода и будущей атаки (implementation-plan, фаза 3).
 */
export function screenToWorld(
  globalX: number,
  globalY: number,
  worldRoot: Container
): { x: number; y: number } {
  return worldRoot.toLocal({ x: globalX, y: globalY });
}
