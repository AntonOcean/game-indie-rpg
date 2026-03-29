import { addComponent, addEntity, type World } from "bitecs";
import { PLAYER } from "../constants/gameBalance";
import type { GameMapMeta } from "../gameMap";
import {
  AttackCooldown,
  Hitbox,
  Player,
  Position,
  RenderRef,
  Velocity,
} from "./components";
import { addCharacterAnimationFacing } from "./initCharacterVisualAnimation";

/** Центр тайла (tx, ty) с проходимым collisions=0 в текущей карте. */
export const PLAYER_SPAWN_TILE = { tx: 12, ty: 10 } as const;

export function tileCenterWorldPx(
  tx: number,
  ty: number,
  meta: Pick<GameMapMeta, "tileWidth" | "tileHeight">
): { x: number; y: number } {
  return {
    x: tx * meta.tileWidth + meta.tileWidth / 2,
    y: ty * meta.tileHeight + meta.tileHeight / 2,
  };
}

/**
 * Создаёт сущность игрока в ECS. Визуал и renderId — только через render-слой.
 */
export function spawnPlayerEntity(
  world: World,
  renderId: number,
  meta: GameMapMeta
): number {
  const eid = addEntity(world);
  const { x, y } = tileCenterWorldPx(
    PLAYER_SPAWN_TILE.tx,
    PLAYER_SPAWN_TILE.ty,
    meta
  );

  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;

  addComponent(world, eid, RenderRef);
  RenderRef.renderId[eid] = renderId;

  addComponent(world, eid, Hitbox);
  Hitbox.width[eid] = PLAYER.HITBOX_SIZE;
  Hitbox.height[eid] = PLAYER.HITBOX_SIZE;

  addComponent(world, eid, Velocity);
  Velocity.vx[eid] = 0;
  Velocity.vy[eid] = 0;

  addComponent(world, eid, AttackCooldown);
  AttackCooldown.untilMs[eid] = 0;

  addCharacterAnimationFacing(world, eid, "soldier");

  return eid;
}
