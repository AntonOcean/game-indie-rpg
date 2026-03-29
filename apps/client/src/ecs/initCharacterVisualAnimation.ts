import { addComponent, type World } from "bitecs";
import { AnimState, type CharacterVisualKind, FacingDir } from "../animation/animationTypes";
import { getAnimationClip } from "../animation/animationClips";
import { Animation, Facing } from "./components";

export function addCharacterAnimationFacing(
  world: World,
  eid: number,
  kind: CharacterVisualKind
): void {
  addComponent(world, eid, Animation);
  addComponent(world, eid, Facing);
  const clip = getAnimationClip(kind, AnimState.Idle);
  if (!clip) {
    throw new Error(`game-rpg: no idle clip for kind ${kind}`);
  }
  Animation.state[eid] = AnimState.Idle;
  Animation.time[eid] = 0;
  Animation.duration[eid] = clip.duration;
  Animation.loop[eid] = clip.loop;
  Animation.locked[eid] = clip.locked;
  Animation.minHoldTime[eid] = clip.minHoldTime;
  Animation.interruptAt[eid] = clip.interruptAt;
  Animation.clipGeneration[eid] = 0;
  Facing.direction[eid] = FacingDir.Right;
  Facing.locked[eid] = clip.lockFacing ?? clip.locked;
}
