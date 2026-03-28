import { createWorld, registerComponents, type World } from "bitecs";
import { Hitbox, Player, Position, RenderRef, Velocity } from "./components";

export function createGameWorld(): World {
  const world = createWorld();
  registerComponents(world, [Position, Player, RenderRef, Hitbox, Velocity]);
  return world;
}
