import { Assets, Rectangle, Texture } from "pixi.js";
import { CHARACTER_SHEET } from "../constants/characterAssets";

export type CharacterAnimationFrames = {
  soldier: { idle: Texture[]; walk: Texture[] };
  orc: { idle: Texture[]; walk: Texture[] };
};

function sliceHorizontalFrames(sheet: Texture, frameWidth: number): Texture[] {
  const src = sheet.source;
  const w = src.width;
  const h = src.height;
  const n = Math.floor(w / frameWidth);
  const out: Texture[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      new Texture({
        source: src,
        frame: new Rectangle(i * frameWidth, 0, frameWidth, h),
      })
    );
  }
  return out;
}

/**
 * Idle + walk листы (run-13); кадры 100×100 в ряд.
 */
export async function loadCharacterAnimationFrames(): Promise<CharacterAnimationFrames> {
  const base = window.location.origin;
  const urls = [
    new URL(CHARACTER_SHEET.SOLDIER_IDLE_URL, base).href,
    new URL(CHARACTER_SHEET.SOLDIER_WALK_URL, base).href,
    new URL(CHARACTER_SHEET.ORC_IDLE_URL, base).href,
    new URL(CHARACTER_SHEET.ORC_WALK_URL, base).href,
  ];
  const [sIdle, sWalk, oIdle, oWalk] = await Promise.all(
    urls.map((u) => Assets.load<Texture>(u))
  );
  const fw = CHARACTER_SHEET.FRAME_PX;
  return {
    soldier: {
      idle: sliceHorizontalFrames(sIdle, fw),
      walk: sliceHorizontalFrames(sWalk, fw),
    },
    orc: {
      idle: sliceHorizontalFrames(oIdle, fw),
      walk: sliceHorizontalFrames(oWalk, fw),
    },
  };
}
