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
import type { AttackIntent } from "../events/attackIntent";
import type { GameEventQueues } from "../events/gameEventQueues";
import type { PlayerIntent } from "../input/playerIntent";
import type { GameTime } from "./gameTime";
import {
  AttackCooldown,
  Dead,
  Enemy,
  Health,
  Position,
} from "./components";

const ATTACK_COOLDOWN_SEC = PLAYER.ATTACK_COOLDOWN_MS / 1000;

/**
 * Из PlayerIntent: если задан attackTarget — одно намерение удара (позиция источника из мира).
 */
export function collectPlayerAttackIntents(
  world: World,
  playerEid: number,
  intent: PlayerIntent,
  out: AttackIntent[]
): void {
  const target = intent.attackTarget;
  if (target === null) {
    return;
  }
  if (!hasComponent(world, target, Enemy)) {
    return;
  }
  out.push({
    sourceId: playerEid,
    targetId: target,
    sourceX: Position.x[playerEid],
    sourceY: Position.y[playerEid],
  });
}

/**
 * Конвейер: AttackIntent → валидация → emitDamage (без прямой мутации Health).
 * Кулдаун, ATTACK в протокол, анимация атаки — как раньше.
 */
export function resolveCombatAndEmitDamage(
  world: World,
  gameTime: GameTime,
  queues: GameEventQueues,
  intents: readonly AttackIntent[],
  animationBuffer: AnimationIntentBuffer
): void {
  for (let i = 0; i < intents.length; i++) {
    const it = intents[i]!;
    const playerEid = it.sourceId;
    const target = it.targetId;

    if (!hasComponent(world, target, Enemy)) {
      continue;
    }
    if (hasComponent(world, target, Dead)) {
      continue;
    }
    if (!hasComponent(world, target, Health)) {
      continue;
    }
    if (Health.current[target] <= 0) {
      continue;
    }

    const until = AttackCooldown.untilSec[playerEid] ?? 0;
    if (until > 0 && gameTime.now < until) {
      continue;
    }

    const dx = Position.x[playerEid] - Position.x[target];
    const dy = Position.y[playerEid] - Position.y[target];
    const dist = Math.hypot(dx, dy);
    if (dist >= PLAYER.ATTACK_RANGE) {
      continue;
    }

    const dmg = queues.emitDamage({
      tickId: gameTime.tickId,
      sourceType: "entity",
      sourceId: playerEid,
      targetId: target,
      amount: PLAYER.ATTACK_DAMAGE,
      sourceX: it.sourceX,
      sourceY: it.sourceY,
    });

    AttackCooldown.untilSec[playerEid] = gameTime.now + ATTACK_COOLDOWN_SEC;

    mergeAnimationIntent(animationBuffer, {
      entity: playerEid,
      state: AnimState.Attack,
    });

    const payload: AttackPayload = { targetId: target };
    sendPlayerEvent({ type: PlayerEventType.ATTACK, payload });

    if (import.meta.env.DEV) {
      console.info("[game-rpg] DamageEvent", dmg);
    }
  }
}
