import { ENGINE } from "../constants/gameBalance";

/** Единый контекст времени тика (architecture.md § GameTime). */
export type GameTime = {
  dt: number;
  now: number;
  tickId: number;
};

export function createGameTime(): GameTime {
  return { dt: 0, now: 0, tickId: 0 };
}

/**
 * В начале кадра: dt из тикера (сек, с капом), монотонный now += dt.
 * tickId инкрементируется в конце кадра вместе с swap очередей.
 */
export function advanceGameTime(time: GameTime, deltaMS: number): void {
  time.dt = Math.min(deltaMS / 1000, ENGINE.DT_MAX_SEC);
  time.now += time.dt;
}
