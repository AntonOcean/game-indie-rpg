import type { GameMapMeta } from "../gameMap";

export type AabbWorldPx = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function isBlockedTile(
  tx: number,
  ty: number,
  meta: GameMapMeta
): boolean {
  const { mapWidth, mapHeight, collisionData } = meta;
  if (tx < 0 || ty < 0 || tx >= mapWidth || ty >= mapHeight) {
    return true;
  }
  const i = ty * mapWidth + tx;
  return collisionData[i] !== 0;
}

/** Четыре угла AABB → тайлы; любой ненулевой gid в слое collisions = блок. */
export function hitboxIntersectsBlockedTiles(
  box: AabbWorldPx,
  meta: GameMapMeta
): boolean {
  const { tileWidth, tileHeight } = meta;
  const corners = [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.left, y: box.bottom },
    { x: box.right, y: box.bottom },
  ];
  return corners.some((p) =>
    isBlockedTile(
      Math.floor(p.x / tileWidth),
      Math.floor(p.y / tileHeight),
      meta
    )
  );
}

export function aabbFromCenter(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number
): AabbWorldPx {
  return {
    left: cx - halfW,
    top: cy - halfH,
    right: cx + halfW,
    bottom: cy + halfH,
  };
}
