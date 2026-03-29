import { AnimState, type CharacterVisualKind } from "./animationTypes";
import { CHARACTER_SHEET } from "../constants/characterAssets";

/**
 * Данные клипа: длительность цикла (сек), loop, порог прерывания, анти-дребезг.
 * attack/hurt/death заполнены для FSM; текстуры подключатся в run-14.
 */
export type AnimationClipDef = {
  duration: number;
  loop: number;
  interruptAt: number;
  minHoldTime: number;
  framesCount: number;
  frameWidth: number;
  frameHeight: number;
  /** 1 — нельзя перейти на более слабое состояние по обычным правилам */
  locked: number;
  /** 1 — не менять Facing (по умолчанию = locked, если не задано отдельно) */
  lockFacing?: number;
};

const FW = CHARACTER_SHEET.FRAME_PX;
const FH = CHARACTER_SHEET.FRAME_PX;

const soldierOrcShared = {
  idle: {
    duration: 0.9,
    loop: 1,
    interruptAt: 0,
    minHoldTime: 0,
    framesCount: CHARACTER_SHEET.IDLE_FRAME_COUNT,
    frameWidth: FW,
    frameHeight: FH,
    locked: 0,
  },
  walk: {
    duration: 0.55,
    loop: 1,
    interruptAt: 0,
    minHoldTime: 0.05,
    framesCount: CHARACTER_SHEET.WALK_FRAME_COUNT,
    frameWidth: FW,
    frameHeight: FH,
    locked: 0,
  },
  attack: {
    duration: 0.45,
    loop: 0,
    interruptAt: 0.5,
    minHoldTime: 0,
    framesCount: 6,
    frameWidth: FW,
    frameHeight: FH,
    locked: 1,
    lockFacing: 1,
  },
  hurt: {
    duration: 0.35,
    loop: 0,
    interruptAt: 1,
    minHoldTime: 0,
    framesCount: 4,
    frameWidth: FW,
    frameHeight: FH,
    locked: 0,
  },
  death: {
    duration: 0.8,
    loop: 0,
    interruptAt: 1,
    minHoldTime: 0,
    framesCount: 6,
    frameWidth: FW,
    frameHeight: FH,
    locked: 1,
    lockFacing: 1,
  },
} as const satisfies Record<string, AnimationClipDef>;

export const ANIMATION_CLIPS: Record<
  CharacterVisualKind,
  Record<number, AnimationClipDef>
> = {
  soldier: {
    [AnimState.Idle]: { ...soldierOrcShared.idle },
    [AnimState.Walk]: { ...soldierOrcShared.walk },
    [AnimState.Attack]: { ...soldierOrcShared.attack },
    [AnimState.Hurt]: { ...soldierOrcShared.hurt },
    [AnimState.Death]: { ...soldierOrcShared.death },
  },
  orc: {
    [AnimState.Idle]: { ...soldierOrcShared.idle },
    [AnimState.Walk]: { ...soldierOrcShared.walk },
    [AnimState.Attack]: { ...soldierOrcShared.attack },
    [AnimState.Hurt]: { ...soldierOrcShared.hurt },
    [AnimState.Death]: { ...soldierOrcShared.death },
  },
};

export function getAnimationClip(
  kind: CharacterVisualKind,
  state: number
): AnimationClipDef | null {
  const row = ANIMATION_CLIPS[kind];
  const clip = row[state];
  return clip ?? null;
}
