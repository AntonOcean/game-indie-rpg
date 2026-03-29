import type { Container } from "pixi.js";
import { CAMERA } from "../constants/gameBalance";
import type { GameMapMeta } from "../gameMap";

export function applyWorldScale(worldRoot: Container, scale: number): void {
  worldRoot.scale.set(scale, scale);
}

function clampCameraAxis(
  player: number,
  viewSize: number,
  mapSizePx: number,
  margin: number
): number {
  if (mapSizePx <= viewSize) {
    return (mapSizePx - viewSize) / 2;
  }
  const desired = player - viewSize / 2;
  const minCam = margin;
  const maxCam = mapSizePx - viewSize - margin;
  return Math.min(Math.max(desired, minCam), maxCam);
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

  const m = CAMERA.CLAMP_MARGIN;
  const camX = clampCameraAxis(playerX, viewW, meta.mapWidthPx, m);
  const camY = clampCameraAxis(playerY, viewH, meta.mapHeightPx, m);

  worldRoot.position.set(-camX * worldScale, -camY * worldScale);
}
