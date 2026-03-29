import {
  aabbFromCenter,
  hitboxIntersectsBlockedTiles,
} from "../collision/tileCollision";
import { ENGINE, PLAYER } from "../constants/gameBalance";
import type { GameMapMeta } from "../gameMap";
import type { PlayerIntent } from "../input/playerIntent";
import { Hitbox, Position, Velocity } from "./components";

export function deltaSecondsClamped(deltaMS: number): number {
  return Math.min(deltaMS / 1000, ENGINE.DT_MAX_SEC);
}

export function resolvePlayerIntentToVelocity(
  eid: number,
  intent: PlayerIntent
): void {
  if (intent.moveDirection) {
    Velocity.vx[eid] = intent.moveDirection.x * PLAYER.SPEED;
    Velocity.vy[eid] = intent.moveDirection.y * PLAYER.SPEED;
    return;
  }

  if (intent.moveTo) {
    const px = Position.x[eid];
    const py = Position.y[eid];
    const dx = intent.moveTo.x - px;
    const dy = intent.moveTo.y - py;
    const len = Math.hypot(dx, dy);
    if (len < PLAYER.MOVE_TO_STOP_PX) {
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
      return;
    }
    Velocity.vx[eid] = (dx / len) * PLAYER.SPEED;
    Velocity.vy[eid] = (dy / len) * PLAYER.SPEED;
    return;
  }

  Velocity.vx[eid] = 0;
  Velocity.vy[eid] = 0;
}

/**
 * Пробное смещение по X, затем по Y; при пересечении с блокирующим тайлом — откат оси
 * (четыре угла хитбокса, implementation-plan §3).
 */
export function movePlayerWithTileCollisions(
  eid: number,
  meta: GameMapMeta,
  dtSec: number
): void {
  const dx = Velocity.vx[eid] * dtSec;
  const dy = Velocity.vy[eid] * dtSec;
  const oldX = Position.x[eid];
  const oldY = Position.y[eid];
  const hw = Hitbox.width[eid] / 2;
  const hh = Hitbox.height[eid] / 2;

  Position.x[eid] = oldX + dx;
  if (
    hitboxIntersectsBlockedTiles(
      aabbFromCenter(Position.x[eid], oldY, hw, hh),
      meta
    )
  ) {
    Position.x[eid] = oldX;
  }

  Position.y[eid] = oldY + dy;
  if (
    hitboxIntersectsBlockedTiles(
      aabbFromCenter(Position.x[eid], Position.y[eid], hw, hh),
      meta
    )
  ) {
    Position.y[eid] = oldY;
  }
}
