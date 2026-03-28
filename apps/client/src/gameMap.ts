import { Application, Assets, extensions } from "pixi.js";
import {
  tiledMapLoader,
  type ResolvedMap,
  type ResolvedTileLayer,
  type TiledMapAsset,
} from "pixi-tiledmap";

const MAP_URL = "/assets/map.tmj";

let tiledMapLoaderRegistered = false;

function registerTiledMapLoaderOnce(): void {
  if (tiledMapLoaderRegistered) return;
  extensions.add(tiledMapLoader);
  tiledMapLoaderRegistered = true;
}

function findTileLayer(map: ResolvedMap, name: string): ResolvedTileLayer {
  const layer = map.layers.find(
    (l): l is ResolvedTileLayer => l.type === "tilelayer" && l.name === name
  );
  if (!layer) {
    throw new Error(`game-rpg: missing tile layer "${name}" in ${MAP_URL}`);
  }
  return layer;
}

/** Линейный массив gid слоя collisions (0 = проходимо); индекс ty * mapWidth + tx — для run-06. */
export function collisionGidsFromLayer(layer: ResolvedTileLayer): number[] {
  return layer.tiles.map((t) => (t ? t.gid : 0));
}

export type GameMapMeta = {
  collisionData: number[];
  mapWidth: number;
  mapHeight: number;
  tileWidth: number;
  tileHeight: number;
};

export type LoadedGameMap = {
  meta: GameMapMeta;
};

/**
 * Загружает Tiled-карту (pixi-tiledmap + Assets), монтирует на stage.
 * Слои ground → wall в порядке файла; collisions скрыт.
 */
export async function loadGameMap(app: Application): Promise<LoadedGameMap> {
  registerTiledMapLoaderOnce();

  const asset = await Assets.load<TiledMapAsset>(MAP_URL);
  const { mapData, container } = asset;

  const collisionLayer = findTileLayer(mapData, "collisions");
  const collisionData = collisionGidsFromLayer(collisionLayer);

  const collisionsVisual = container.getLayer("collisions");
  if (collisionsVisual) {
    collisionsVisual.visible = false;
  }

  app.stage.addChild(container);

  const meta: GameMapMeta = {
    collisionData,
    mapWidth: mapData.width,
    mapHeight: mapData.height,
    tileWidth: mapData.tilewidth,
    tileHeight: mapData.tileheight,
  };

  if (import.meta.env.DEV) {
    console.info("[game-rpg] map", {
      collisionDataLength: meta.collisionData.length,
      mapWidth: meta.mapWidth,
      mapHeight: meta.mapHeight,
      tileWidth: meta.tileWidth,
      tileHeight: meta.tileHeight,
    });
  }

  return { meta };
}
