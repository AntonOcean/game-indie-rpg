import { hasComponent, type World } from "bitecs";
import {
  PlayerEventType,
  sendPlayerEvent,
  type AttackPayload,
} from "game-rpg-protocol";
import { AnimState } from "../animation/animationTypes";
import {
  mergeAnimationIntent,
  type AnimationIntentBuffer,
} from "../animation/animationIntentBuffer";
import { PLAYER } from "../constants/gameBalance";
import type { PlayerIntent } from "../input/playerIntent";
import {
  AttackCooldown,
  Dead,
  Enemy,
  Health,
  Position,
} from "./components";

/**
 * Урон только если одновременно (implementation-plan §5, architecture.md):
 * 1) задано намерение attackTarget;
 * 2) цель имеет компонент Enemy;
 * 3) цель жива: нет Dead и Health.current &gt; 0;
 * 4) дистанция от игрока до цели &lt; PLAYER.ATTACK_RANGE;
 * 5) кулдаун атаки истёк (untilMs === 0 или now &gt;= untilMs).
 */
export function resolvePlayerAttack(
  world: World,
  playerEid: number,
  intent: PlayerIntent,
  nowMs: number,
  animationBuffer: AnimationIntentBuffer
): void {
  const target = intent.attackTarget;
  if (target === null) {
    return;
  }

  if (!hasComponent(world, target, Enemy)) {
    return;
  }

  if (hasComponent(world, target, Dead)) {
    return;
  }

  if (!hasComponent(world, target, Health)) {
    return;
  }

  if (Health.current[target] <= 0) {
    return;
  }

  const until = AttackCooldown.untilMs[playerEid];
  if (until > 0 && nowMs < until) {
    return;
  }

  const dx = Position.x[playerEid] - Position.x[target];
  const dy = Position.y[playerEid] - Position.y[target];
  const dist = Math.hypot(dx, dy);
  if (dist >= PLAYER.ATTACK_RANGE) {
    return;
  }

  Health.current[target] -= PLAYER.ATTACK_DAMAGE;
  AttackCooldown.untilMs[playerEid] = nowMs + PLAYER.ATTACK_COOLDOWN_MS;

  mergeAnimationIntent(animationBuffer, {
    entity: playerEid,
    state: AnimState.Attack,
  });

  const payload: AttackPayload = { targetId: target };
  sendPlayerEvent({ type: PlayerEventType.ATTACK, payload });

  if (import.meta.env.DEV) {
    console.info("[game-rpg] hit enemy", {
      target,
      hp: Health.current[target],
    });
  }
}
