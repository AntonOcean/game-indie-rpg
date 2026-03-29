import { createWorld, registerComponents, type World } from "bitecs";
import {
  Animation,
  AttackCooldown,
  Dead,
  Enemy,
  Facing,
  Health,
  Hitbox,
  Loot,
  Player,
  Position,
  RenderRef,
  Velocity,
} from "./components";

export function createGameWorld(): World {
  const world = createWorld();
  registerComponents(world, [
    Position,
    Player,
    RenderRef,
    Hitbox,
    Velocity,
    Enemy,
    Health,
    AttackCooldown,
    Dead,
    Loot,
    Animation,
    Facing,
  ]);
  return world;
}
