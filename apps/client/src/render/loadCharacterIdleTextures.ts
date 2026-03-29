import { Assets, Rectangle, Texture } from "pixi.js";
import { CHARACTER_SHEET } from "../constants/characterAssets";

export type CharacterIdleTextures = {
  soldierIdleFrame: Texture;
  orcIdleFrame: Texture;
};

/**
 * Загружает idle-листы через Assets и вырезает первый кадр 100×100 (run-12, без анимации).
 */
export async function loadCharacterIdleTextures(): Promise<CharacterIdleTextures> {
  const base = window.location.origin;
  const soldierHref = new URL(CHARACTER_SHEET.SOLDIER_IDLE_URL, base).href;
  const orcHref = new URL(CHARACTER_SHEET.ORC_IDLE_URL, base).href;

  const [soldierSheet, orcSheet] = await Promise.all([
    Assets.load<Texture>(soldierHref),
    Assets.load<Texture>(orcHref),
  ]);

  const frame = new Rectangle(0, 0, CHARACTER_SHEET.FRAME_PX, CHARACTER_SHEET.FRAME_PX);

  return {
    soldierIdleFrame: new Texture({
      source: soldierSheet.source,
      frame,
    }),
    orcIdleFrame: new Texture({
      source: orcSheet.source,
      frame,
    }),
  };
}
