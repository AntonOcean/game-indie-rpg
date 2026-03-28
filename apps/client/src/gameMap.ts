import { Application, Assets, Container, path, type Texture } from "pixi.js";
import {
  TiledMap,
  parseMapAsync,
  parseTsx,
  parseTmx,
  type ResolvedLayer,
  type ResolvedMap,
  type ResolvedTileLayer,
  type TiledMapAsset,
  type TiledMapData,
  type TiledTileset,
} from "pixi-tiledmap";

const MAP_URL = "/assets/map.tmj";

function flattenLayers(layers: ResolvedLayer[]): ResolvedLayer[] {
  const result: ResolvedLayer[] = [];
  for (const layer of layers) {
    result.push(layer);
    if (layer.type === "group") {
      result.push(...flattenLayers(layer.layers));
    }
  }
  return result;
}

/** Абсолютный от корня сайта (`/assets/...`) или относительно base (URL каталога). */
function resolveResourceUrl(baseDirUrl: string, ref: string): string {
  if (ref.startsWith("/")) {
    return new URL(ref, window.location.origin).href;
  }
  return path.join(baseDirUrl, ref);
}

function isXmlExt(ext: string): boolean {
  return ext === ".tmx";
}

function isTsxExt(ext: string): boolean {
  return ext === ".tsx";
}

async function loadTiledMapAsset(mapPath: string): Promise<TiledMapAsset> {
  const mapFullUrl = new URL(mapPath, window.location.origin).href;
  const baseMapPath = path.dirname(mapFullUrl);

  const response = await fetch(mapFullUrl);
  const ext = path.extname(mapPath).toLowerCase();

  let data: TiledMapData;
  if (isXmlExt(ext)) {
    const xml = await response.text();
    data = parseTmx(xml);
  } else {
    data = await response.json();
  }

  const externalTilesets = new Map<string, TiledTileset>();
  const imageBaseByTilesetIndex: string[] = [];

  for (let i = 0; i < data.tilesets.length; i++) {
    const ts = data.tilesets[i];
    if ("source" in ts && !("name" in ts)) {
      const tsFullUrl = resolveResourceUrl(baseMapPath, ts.source);
      const tsResponse = await fetch(tsFullUrl);
      const tsExt = path.extname(ts.source).toLowerCase();
      let tsData: TiledTileset;
      if (isTsxExt(tsExt)) {
        tsData = parseTsx(await tsResponse.text());
      } else {
        tsData = await tsResponse.json();
      }
      externalTilesets.set(ts.source, tsData);
      imageBaseByTilesetIndex[i] = path.dirname(tsFullUrl);
    } else {
      imageBaseByTilesetIndex[i] = baseMapPath;
    }
  }

  const mapData = await parseMapAsync(data, { externalTilesets });

  const tilesetTextures = new Map<string, Texture>();
  const imageLayerTextures = new Map<string, Texture>();
  const tileImageTextures = new Map<string, Texture>();
  const textureLoads: Promise<void>[] = [];

  mapData.tilesets.forEach((ts, i) => {
    const imageBase = imageBaseByTilesetIndex[i] ?? baseMapPath;
    if (ts.image) {
      const imageUrl = resolveResourceUrl(imageBase, ts.image);
      textureLoads.push(
        Assets.load(imageUrl).then((tex) => {
          tilesetTextures.set(ts.image!, tex);
        })
      );
    }
    for (const [_localId, tileDef] of ts.tiles) {
      if (tileDef.image) {
        const tileImgUrl = resolveResourceUrl(imageBase, tileDef.image);
        textureLoads.push(
          Assets.load(tileImgUrl).then((tex) => {
            tileImageTextures.set(tileDef.image!, tex);
          })
        );
      }
    }
  });

  for (const layer of flattenLayers(mapData.layers)) {
    if (layer.type === "imagelayer" && layer.image) {
      const imgUrl = resolveResourceUrl(baseMapPath, layer.image);
      textureLoads.push(
        Assets.load(imgUrl).then((tex) => {
          imageLayerTextures.set(layer.image, tex);
        })
      );
    }
  }

  await Promise.all(textureLoads);

  const container = new TiledMap(mapData, {
    tilesetTextures,
    imageLayerTextures,
    tileImageTextures,
  });

  return { mapData, container };
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
  /** mapWidth * tileWidth — границы камеры в мировых пикселях. */
  mapWidthPx: number;
  /** mapHeight * tileHeight */
  mapHeightPx: number;
};

export type LoadedGameMap = {
  meta: GameMapMeta;
  /** Общий корень карты и сущностей мира (камера сдвинет его позже). */
  worldRoot: Container;
};

/**
 * Загружает Tiled-карту (pixi-tiledmap + Assets), монтирует на stage.
 * Слои ground → wall в порядке файла; collisions скрыт.
 *
 * В `.tmj` допускается `"source": "/assets/tilesets/foo.tsx"`; пути к текстурам в `.tsx` — только относительные (например `../tiles/grass.png`), база — каталог `.tsx`.
 */
export async function loadGameMap(app: Application): Promise<LoadedGameMap> {
  const { mapData, container } = await loadTiledMapAsset(MAP_URL);

  const collisionLayer = findTileLayer(mapData, "collisions");
  const collisionData = collisionGidsFromLayer(collisionLayer);

  const collisionsVisual = container.getLayer("collisions");
  if (collisionsVisual) {
    collisionsVisual.visible = false;
  }

  const worldRoot = new Container();
  worldRoot.addChild(container);
  app.stage.addChild(worldRoot);

  const meta: GameMapMeta = {
    collisionData,
    mapWidth: mapData.width,
    mapHeight: mapData.height,
    tileWidth: mapData.tilewidth,
    tileHeight: mapData.tileheight,
    mapWidthPx: mapData.width * mapData.tilewidth,
    mapHeightPx: mapData.height * mapData.tileheight,
  };

  if (import.meta.env.DEV) {
    console.info("[game-rpg] map", {
      collisionDataLength: meta.collisionData.length,
      mapWidth: meta.mapWidth,
      mapHeight: meta.mapHeight,
      tileWidth: meta.tileWidth,
      tileHeight: meta.tileHeight,
      mapWidthPx: meta.mapWidthPx,
      mapHeightPx: meta.mapHeightPx,
    });
  }

  return { meta, worldRoot };
}
