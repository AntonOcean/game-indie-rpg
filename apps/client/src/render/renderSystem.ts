import { hasComponent, query, type World } from "bitecs";
import { Sprite, type Texture } from "pixi.js";
import { AnimState, FacingDir } from "../animation/animationTypes";
import { getCharacterVisualKind } from "../ecs/characterVisualKind";
import { Animation, Dead, Enemy, Facing, Position, RenderRef } from "../ecs/components";
import { characterSpriteWorldScale } from "../constants/characterAssets";
import type { CharacterAnimationFrames } from "./loadCharacterAnimationTextures";
import type { RenderRegistry } from "./renderRegistry";

function frameIndexForAnimation(eid: number, framesLen: number): number {
  const loop = Animation.loop[eid] !== 0;
  const dur = Animation.duration[eid];
  const t = Animation.time[eid];
  if (framesLen <= 0) {
    return 0;
  }
  if (dur <= 0) {
    return 0;
  }
  const raw = (t / dur) * framesLen;
  if (loop) {
    const k = Math.floor(raw);
    return ((k % framesLen) + framesLen) % framesLen;
  }
  return Math.min(framesLen - 1, Math.floor(raw));
}

function rowForVisualState(
  row: CharacterAnimationFrames["soldier"],
  state: number
): Texture[] {
  if (state === AnimState.Walk && row.walk.length > 0) {
    return row.walk;
  }
  return row.idle.length > 0 ? row.idle : row.walk;
}

/**
 * Синхронизация ECS → реестр Pixi: destroy, мёртвые враги, позиции, кадр анимации, зеркало по Facing.
 */
export function runRenderSystem(
  world: World,
  registry: RenderRegistry,
  pendingDestroyRenderIds: number[],
  animFrames: CharacterAnimationFrames
): void {
  for (let i = 0; i < pendingDestroyRenderIds.length; i++) {
    const id = pendingDestroyRenderIds[i];
    const node = registry.nodes.get(id);
    if (node) {
      node.destroy();
      registry.nodes.delete(id);
    }
  }
  pendingDestroyRenderIds.length = 0;

  const deadEnemies = query(world, [Enemy, Dead, RenderRef]);
  for (let i = 0; i < deadEnemies.length; i++) {
    const eid = deadEnemies[i]!;
    const node = registry.nodes.get(RenderRef.renderId[eid]);
    if (node) {
      node.visible = false;
    }
  }

  const baseScale = characterSpriteWorldScale();

  const entities = query(world, [Position, RenderRef]);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const id = RenderRef.renderId[eid];
    const node = registry.nodes.get(id);
    if (!node) {
      continue;
    }
    if (hasComponent(world, eid, Enemy) && hasComponent(world, eid, Dead)) {
      continue;
    }
    node.visible = true;
    node.position.set(Position.x[eid], Position.y[eid]);

    if (!hasComponent(world, eid, Animation) || !(node instanceof Sprite)) {
      continue;
    }

    const kind = getCharacterVisualKind(world, eid);
    if (!kind) {
      continue;
    }

    const pack = animFrames[kind];
    const st = Animation.state[eid];
    const texRow = rowForVisualState(pack, st);
    if (texRow.length === 0) {
      continue;
    }
    const fi = frameIndexForAnimation(eid, texRow.length);
    node.texture = texRow[fi]!;

    const flip = Facing.direction[eid] === FacingDir.Left;
    node.scale.set(flip ? -baseScale : baseScale, baseScale);
  }
}
