import { Assets, Rectangle, Texture } from "pixi.js";
import { CHARACTER_SHEET } from "../constants/characterAssets";

export type CharacterAnimRow = {
  idle: Texture[];
  walk: Texture[];
  attack: Texture[];
  hurt: Texture[];
  death: Texture[];
};

export type CharacterAnimationFrames = {
  soldier: CharacterAnimRow;
  orc: CharacterAnimRow;
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
 * Idle, walk, attack, hurt, death — листы 100×100 в ряд (run-14).
 */
export async function loadCharacterAnimationFrames(): Promise<CharacterAnimationFrames> {
  const base = window.location.origin;
  const urls = [
    new URL(CHARACTER_SHEET.SOLDIER_IDLE_URL, base).href,
    new URL(CHARACTER_SHEET.SOLDIER_WALK_URL, base).href,
    new URL(CHARACTER_SHEET.SOLDIER_ATTACK_URL, base).href,
    new URL(CHARACTER_SHEET.SOLDIER_HURT_URL, base).href,
    new URL(CHARACTER_SHEET.SOLDIER_DEATH_URL, base).href,
    new URL(CHARACTER_SHEET.ORC_IDLE_URL, base).href,
    new URL(CHARACTER_SHEET.ORC_WALK_URL, base).href,
    new URL(CHARACTER_SHEET.ORC_ATTACK_URL, base).href,
    new URL(CHARACTER_SHEET.ORC_HURT_URL, base).href,
    new URL(CHARACTER_SHEET.ORC_DEATH_URL, base).href,
  ];
  const [
    sIdle,
    sWalk,
    sAttack,
    sHurt,
    sDeath,
    oIdle,
    oWalk,
    oAttack,
    oHurt,
    oDeath,
  ] = await Promise.all(urls.map((u) => Assets.load<Texture>(u)));
  const fw = CHARACTER_SHEET.FRAME_PX;
  return {
    soldier: {
      idle: sliceHorizontalFrames(sIdle, fw),
      walk: sliceHorizontalFrames(sWalk, fw),
      attack: sliceHorizontalFrames(sAttack, fw),
      hurt: sliceHorizontalFrames(sHurt, fw),
      death: sliceHorizontalFrames(sDeath, fw),
    },
    orc: {
      idle: sliceHorizontalFrames(oIdle, fw),
      walk: sliceHorizontalFrames(oWalk, fw),
      attack: sliceHorizontalFrames(oAttack, fw),
      hurt: sliceHorizontalFrames(oHurt, fw),
      death: sliceHorizontalFrames(oDeath, fw),
    },
  };
}
