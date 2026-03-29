import { Assets, Rectangle, Texture } from "pixi.js";

const TILE = 32;

const ITEM_ICONS = {
  gold: { row: 17, col: 3 },
  potion_hp: { row: 9, col: 0 },
} as const;

export type ItemIconId = keyof typeof ITEM_ICONS;

let baseTexture: Texture | null = null;
const cache = new Map<ItemIconId, Texture>();

export async function loadItemAtlas(): Promise<void> {
  baseTexture = await Assets.load("/assets/icons/items.png");
}

export function getItemIcon(id: ItemIconId): Texture {
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }
  if (!baseTexture) {
    throw new Error("Item atlas not loaded");
  }
  const def = ITEM_ICONS[id];
  const frame = new Rectangle(def.col * TILE, def.row * TILE, TILE, TILE);
  const tex = new Texture({
    source: baseTexture.source,
    frame,
  });
  cache.set(id, tex);
  return tex;
}
