/**
 * Числовые состояния клипа (architecture: только визуальный FSM, не канон боя).
 * idle=0 … death=4 — совпадает с ANIMATION.DEFAULT_STATE и приоритетами.
 */
export const AnimState = {
  Idle: 0,
  Walk: 1,
  Attack: 2,
  Hurt: 3,
  Death: 4,
} as const;

export type AnimStateId = (typeof AnimState)[keyof typeof AnimState];

export const ANIM_STATE_PRIORITY: Record<number, number> = {
  [AnimState.Idle]: 0,
  [AnimState.Walk]: 20,
  [AnimState.Attack]: 60,
  [AnimState.Hurt]: 80,
  [AnimState.Death]: 100,
};

export function animationStatePriority(state: number): number {
  return ANIM_STATE_PRIORITY[state] ?? -1;
}

export type CharacterVisualKind = "soldier" | "orc";

export type AnimationRequest = {
  entity: number;
  state: number;
  force?: boolean;
};

export const FacingDir = {
  Down: 0,
  Up: 1,
  Left: 2,
  Right: 3,
} as const;

export type FacingDirId = (typeof FacingDir)[keyof typeof FacingDir];

const ANIM_STATE_LABELS = ["idle", "walk", "attack", "hurt", "death"] as const;

export function animStateLabel(state: number): string {
  if (state >= 0 && state < ANIM_STATE_LABELS.length) {
    return ANIM_STATE_LABELS[state]!;
  }
  return `?${state}`;
}
