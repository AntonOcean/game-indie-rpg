import { hasComponent, query, type World } from "bitecs";
import {
  AnimState,
  animationStatePriority,
  type AnimationRequest,
  type CharacterVisualKind,
} from "../animation/animationTypes";
import type { AnimationClipDef } from "../animation/animationClips";
import { getAnimationClip } from "../animation/animationClips";
import type { AnimationIntentBuffer } from "../animation/animationIntentBuffer";
import { ANIMATION } from "../constants/gameBalance";
import { Animation, Facing } from "./components";
import { getCharacterVisualKind } from "./characterVisualKind";

function applyClipToAnimation(
  eid: number,
  state: number,
  clip: AnimationClipDef
): void {
  Animation.state[eid] = state;
  Animation.time[eid] = 0;
  Animation.duration[eid] = clip.duration;
  Animation.loop[eid] = clip.loop;
  Animation.locked[eid] = clip.locked;
  Animation.minHoldTime[eid] = clip.minHoldTime;
  Animation.interruptAt[eid] = clip.interruptAt;
  const lf = clip.lockFacing ?? clip.locked;
  Facing.locked[eid] = lf;
}

function resolveClipWithFallback(
  kind: CharacterVisualKind,
  state: number,
  devWarn: (msg: string) => void,
  eid: number
): { state: number; clip: AnimationClipDef } {
  let clip = getAnimationClip(kind, state);
  if (clip) {
    return { state, clip };
  }
  devWarn(
    `[AnimationSystem] unknown state ${state} for eid ${eid}, fallback idle`
  );
  const idle = getAnimationClip(kind, ANIMATION.DEFAULT_STATE);
  if (!idle) {
    throw new Error("game-rpg: missing idle clip in ANIMATION_CLIPS");
  }
  return { state: ANIMATION.DEFAULT_STATE, clip: idle };
}

function canTransitionToWeaker(
  eid: number,
  req: AnimationRequest,
  targetState: number
): boolean {
  if (Animation.locked[eid]) {
    return false;
  }
  const force = req.force === true;
  const t = Animation.time[eid];
  const minHold = Animation.minHoldTime[eid];
  if (!force && t < minHold) {
    return false;
  }
  const dur = Animation.duration[eid];
  if (dur <= 0) {
    return true;
  }
  const progress = t / dur;
  if (!force && progress < Animation.interruptAt[eid]) {
    return false;
  }
  return true;
}

function processRequest(
  world: World,
  eid: number,
  req: AnimationRequest,
  devWarn: (msg: string) => void
): void {
  const kind = getCharacterVisualKind(world, eid);
  if (!kind) {
    return;
  }

  let targetState = req.state;
  let clip = getAnimationClip(kind, targetState);
  if (!clip) {
    const resolved = resolveClipWithFallback(kind, targetState, devWarn, eid);
    targetState = resolved.state;
    clip = resolved.clip;
  }

  const cur = Animation.state[eid];
  if (targetState === cur) {
    return;
  }

  const pReq = animationStatePriority(targetState);
  const pCur = animationStatePriority(cur);

  if (pReq > pCur) {
    applyClipToAnimation(eid, targetState, clip);
    return;
  }

  if (pReq < pCur) {
    if (canTransitionToWeaker(eid, req, targetState)) {
      const weakerClip = getAnimationClip(kind, targetState);
      if (weakerClip) {
        applyClipToAnimation(eid, targetState, weakerClip);
      }
    }
    return;
  }

  if (req.force) {
    applyClipToAnimation(eid, targetState, clip);
  }
}

/**
 * Накопление времени клипа и разбор AnimationIntentBuffer (приоритеты, locked, interruptAt).
 * Буфер очищается в конце.
 */
export function runAnimationSystem(
  world: World,
  buffer: AnimationIntentBuffer,
  dtSec: number,
  devWarn: (msg: string) => void
): void {
  const withAnim = query(world, [Animation]);
  for (let i = 0; i < withAnim.length; i++) {
    Animation.time[withAnim[i]!] += dtSec;
  }

  for (const [, req] of buffer) {
    if (!hasComponent(world, req.entity, Animation)) {
      continue;
    }
    processRequest(world, req.entity, req, devWarn);
  }

  buffer.clear();

  const sanity = query(world, [Animation]);
  for (let i = 0; i < sanity.length; i++) {
    const eid = sanity[i]!;
    const kind = getCharacterVisualKind(world, eid);
    if (!kind) {
      continue;
    }
    const st = Animation.state[eid];
    if (getAnimationClip(kind, st)) {
      continue;
    }
    devWarn(
      `[AnimationSystem] corrupt Animation.state=${st} eid=${eid}, reset idle`
    );
    const idleClip = getAnimationClip(kind, AnimState.Idle);
    if (idleClip) {
      applyClipToAnimation(eid, AnimState.Idle, idleClip);
    }
  }
}
