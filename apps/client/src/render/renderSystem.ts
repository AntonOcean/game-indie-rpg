import { hasComponent, query, type World } from "bitecs";
import { Sprite, type Texture } from "pixi.js";
import { AnimState, FacingDir } from "../animation/animationTypes";
import { LOOT } from "../constants/gameBalance";
import { getCharacterVisualKind } from "../ecs/characterVisualKind";
import {
  Animation,
  Dead,
  DespawnTimer,
  Enemy,
  Facing,
  Loot,
  LootState,
  LootStateEnum,
  Position,
  RenderRef,
} from "../ecs/components";
import { characterSpriteWorldScale } from "../constants/characterAssets";
import type { CharacterAnimRow } from "./loadCharacterAnimationTextures";
import type { CharacterAnimationFrames } from "./loadCharacterAnimationTextures";
import type { RenderAdapter } from "./renderAdapter";
import type { RenderRegistry } from "./renderRegistry";

/** Дедуп push ANIMATION_COMPLETE на поколение клипа (см. Animation.clipGeneration). */
const lastAnimCompletePushedGen = new Map<number, number>();

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

function rowForVisualState(row: CharacterAnimRow, state: number): Texture[] {
  switch (state) {
    case AnimState.Walk:
      return row.walk.length > 0 ? row.walk : row.idle;
    case AnimState.Attack:
      return row.attack.length > 0 ? row.attack : row.idle;
    case AnimState.Hurt:
      return row.hurt.length > 0 ? row.hurt : row.idle;
    case AnimState.Death:
      return row.death.length > 0 ? row.death : row.idle;
    default:
      return row.idle.length > 0 ? row.idle : row.walk;
  }
}

function maybePushAnimationComplete(
  adapter: RenderAdapter,
  eid: number
): void {
  const loop = Animation.loop[eid] !== 0;
  if (loop) {
    return;
  }
  const dur = Animation.duration[eid];
  const t = Animation.time[eid];
  if (dur <= 0 || t < dur) {
    return;
  }
  const gen = Animation.clipGeneration[eid] | 0;
  if (lastAnimCompletePushedGen.get(eid) === gen) {
    return;
  }
  lastAnimCompletePushedGen.set(eid, gen);
  adapter.push({ type: "ANIMATION_COMPLETE", entity: eid });
}

/**
 * Синхронизация ECS → реестр Pixi: destroy, мёртвые враги, позиции, кадр анимации, лут + fade.
 */
export function runRenderSystem(
  world: World,
  registry: RenderRegistry,
  pendingDestroyRenderIds: number[],
  animFrames: CharacterAnimationFrames,
  renderAdapter: RenderAdapter
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

    if (hasComponent(world, eid, Loot)) {
      if (
        LootState.state[eid] === LootStateEnum.Despawning &&
        hasComponent(world, eid, DespawnTimer)
      ) {
        const t = DespawnTimer.timer[eid];
        const a = Math.max(0, Math.min(1, t / LOOT.DESPAWN_TIME));
        node.alpha = a;
        const sc = 0.88 + 0.12 * a;
        node.scale.set(sc);
      } else {
        node.alpha = 1;
        node.scale.set(1);
      }
      continue;
    }

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

    maybePushAnimationComplete(renderAdapter, eid);

    const flip = Facing.direction[eid] === FacingDir.Left;
    node.scale.set(flip ? -baseScale : baseScale, baseScale);
  }
}
