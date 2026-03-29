import { createWorld, registerComponents, type World } from "bitecs";
import {
  AI,
  Animation,
  AttackCooldown,
  Dead,
  DeathSequence,
  Enemy,
  Facing,
  Health,
  Hitbox,
  Loot,
  LootState,
  LootReserve,
  DespawnTimer,
  LootItemKind,
  Player,
  Position,
  RenderRef,
  StuckDetector,
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
    DeathSequence,
    Loot,
    LootState,
    LootReserve,
    DespawnTimer,
    LootItemKind,
    Animation,
    Facing,
    AI,
    StuckDetector,
  ]);
  return world;
}
