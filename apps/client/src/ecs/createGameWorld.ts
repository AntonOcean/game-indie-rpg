import { createWorld, registerComponents, type World } from "bitecs";
import {
  AttackCooldown,
  Dead,
  Enemy,
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
  ]);
  return world;
}
