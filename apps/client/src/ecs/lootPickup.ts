import { hasComponent, query, removeEntity, type World } from "bitecs";
import { aabbFromCenter, aabbIntersects } from "../collision/tileCollision";
import { Hitbox, Loot, Player, Position, RenderRef } from "./components";

/**
 * Автоподбор при пересечении AABB игрока и лута.
 * После MVP: см. implementation-plan §6 — радиус / тап, чтобы не подбирать «мимо» на мобиле.
 */
/** @returns сколько единиц лута подобрано за кадр */
export function processLootPickup(
  world: World,
  playerEid: number,
  outDestroyRenderIds: number[]
): number {
  if (!hasComponent(world, playerEid, Player)) {
    return 0;
  }
  const phw = Hitbox.width[playerEid] / 2;
  const phh = Hitbox.height[playerEid] / 2;
  const playerBox = aabbFromCenter(
    Position.x[playerEid],
    Position.y[playerEid],
    phw,
    phh
  );

  const lootEntities = query(world, [Loot, Position, Hitbox, RenderRef]);
  const toRemove: number[] = [];
  for (let i = 0; i < lootEntities.length; i++) {
    const leid = lootEntities[i];
    const lhw = Hitbox.width[leid] / 2;
    const lhh = Hitbox.height[leid] / 2;
    const lootBox = aabbFromCenter(
      Position.x[leid],
      Position.y[leid],
      lhw,
      lhh
    );
    if (aabbIntersects(playerBox, lootBox)) {
      toRemove.push(leid);
    }
  }

  for (let i = 0; i < toRemove.length; i++) {
    const leid = toRemove[i];
    outDestroyRenderIds.push(RenderRef.renderId[leid]);
    removeEntity(world, leid);
  }
  return toRemove.length;
}
