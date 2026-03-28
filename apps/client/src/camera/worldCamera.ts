import type { Container } from "pixi.js";
import type { GameMapMeta } from "../gameMap";

/** Равномерный масштаб мира (= worldRoot.scale.x при одинаковых осях). */
export const DEFAULT_WORLD_SCALE = 1;

export function applyWorldScale(worldRoot: Container, scale: number): void {
  worldRoot.scale.set(scale, scale);
}

function clampCameraAxis(
  player: number,
  viewSize: number,
  mapSizePx: number
): number {
  if (mapSizePx <= viewSize) {
    return (mapSizePx - viewSize) / 2;
  }
  const desired = player - viewSize / 2;
  return Math.min(Math.max(desired, 0), mapSizePx - viewSize);
}

/**
 * Камера: смещение worldRoot в координатах стейджа; видимый размер в мире — screen / worldScale.
 * Согласовано с screenToWorld через worldRoot.toLocal (implementation-plan §4, §3).
 */
export function updateWorldCamera(
  worldRoot: Container,
  meta: GameMapMeta,
  playerX: number,
  playerY: number,
  screenW: number,
  screenH: number
): void {
  const worldScale = worldRoot.scale.x;
  const viewW = screenW / worldScale;
  const viewH = screenH / worldScale;

  const camX = clampCameraAxis(playerX, viewW, meta.mapWidthPx);
  const camY = clampCameraAxis(playerY, viewH, meta.mapHeightPx);

  worldRoot.position.set(-camX * worldScale, -camY * worldScale);
}
