/**
 * Псевдослучайное [0, 1) от seed и tickId — без Math.random (post-mvp фаза 3, run-18).
 */
export function deterministicRng(seed: number, tickId: number): number {
  let x = (Math.imul(seed ^ tickId, 0x9e3779b1) >>> 0) || 0x12345678;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}
