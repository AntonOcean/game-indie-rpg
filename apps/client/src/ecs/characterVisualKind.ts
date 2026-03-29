import { hasComponent, type World } from "bitecs";
import type { CharacterVisualKind } from "../animation/animationTypes";
import { Enemy, Player } from "./components";

export function getCharacterVisualKind(
  world: World,
  eid: number
): CharacterVisualKind | null {
  if (hasComponent(world, eid, Player)) {
    return "soldier";
  }
  if (hasComponent(world, eid, Enemy)) {
    return "orc";
  }
  return null;
}
