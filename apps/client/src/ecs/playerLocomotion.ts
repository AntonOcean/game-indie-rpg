import type { GameMapMeta } from "../gameMap";
import {
  aabbFromCenter,
  hitboxIntersectsBlockedTiles,
} from "../collision/tileCollision";
import type { PlayerIntent } from "../input/playerIntent";
import { Hitbox, Position, Velocity } from "./components";

/** Скорость ходьбы, мировые пиксели в секунду. */
const PLAYER_SPEED_PX_PER_SEC = 220;

/** Считаем цель достигнутой — перестаём выставлять moveTo (десктоп). */
const MOVE_TO_STOP_PX = 5;

const DT_MAX_SEC = 0.1;

export function deltaSecondsClamped(deltaMS: number): number {
  return Math.min(deltaMS / 1000, DT_MAX_SEC);
}

export function resolvePlayerIntentToVelocity(
  eid: number,
  intent: PlayerIntent
): void {
  if (intent.moveDirection) {
    Velocity.vx[eid] = intent.moveDirection.x * PLAYER_SPEED_PX_PER_SEC;
    Velocity.vy[eid] = intent.moveDirection.y * PLAYER_SPEED_PX_PER_SEC;
    return;
  }

  if (intent.moveTo) {
    const px = Position.x[eid];
    const py = Position.y[eid];
    const dx = intent.moveTo.x - px;
    const dy = intent.moveTo.y - py;
    const len = Math.hypot(dx, dy);
    if (len < MOVE_TO_STOP_PX) {
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
      return;
    }
    Velocity.vx[eid] = (dx / len) * PLAYER_SPEED_PX_PER_SEC;
    Velocity.vy[eid] = (dy / len) * PLAYER_SPEED_PX_PER_SEC;
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
