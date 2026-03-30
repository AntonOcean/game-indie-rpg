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
import { AI as AICfg, PLAYER } from "../constants/gameBalance";
import type { AttackIntent } from "../events/attackIntent";
import type { GameEventQueues } from "../events/gameEventQueues";
import type { PlayerIntent } from "../input/playerIntent";
import type { GameTime } from "./gameTime";
import {
  AttackCooldown,
  CombatState,
  CombatStateEnum,
  Dead,
  Enemy,
  Health,
  Player,
  Position,
} from "./components";

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
    const source = it.sourceId;
    const target = it.targetId;

    const sourceIsPlayer = hasComponent(world, source, Player);
    const sourceIsEnemy = hasComponent(world, source, Enemy);
    if (!sourceIsPlayer && !sourceIsEnemy) {
      continue;
    }

    if (hasComponent(world, source, CombatState)) {
      if (CombatState.state[source] === CombatStateEnum.dead) {
        continue;
      }
    }

    if (!hasComponent(world, source, AttackCooldown)) {
      continue;
    }

    if (!hasComponent(world, target, Health)) {
      continue;
    }
    if (Health.current[target] <= 0) {
      continue;
    }
    if (hasComponent(world, target, CombatState)) {
      if (CombatState.state[target] === CombatStateEnum.dead) {
        continue;
      }
    }
    // Мёртвые враги (run-09) больше не принимают урон.
    if (hasComponent(world, target, Dead)) {
      continue;
    }

    const until = AttackCooldown.untilSec[source] ?? 0;
    if (until > 0 && gameTime.now < until) {
      continue;
    }

    const attackRange = sourceIsPlayer ? PLAYER.ATTACK_RANGE : AICfg.ATTACK_RANGE;
    const dx = Position.x[source] - Position.x[target];
    const dy = Position.y[source] - Position.y[target];
    const dist = Math.hypot(dx, dy);
    if (dist >= attackRange) {
      continue;
    }

    const amount = sourceIsPlayer ? PLAYER.ATTACK_DAMAGE : AICfg.ATTACK_DAMAGE;
    queues.emitDamage({
      tickId: gameTime.tickId,
      sourceType: "entity",
      sourceId: source,
      targetId: target,
      amount,
      sourceX: it.sourceX,
      sourceY: it.sourceY,
    });

    const cooldownSec =
      (sourceIsPlayer ? PLAYER.ATTACK_COOLDOWN_MS : AICfg.ATTACK_COOLDOWN_MS) / 1000;
    AttackCooldown.untilSec[source] = gameTime.now + cooldownSec;

    mergeAnimationIntent(animationBuffer, {
      entity: source,
      state: AnimState.Attack,
    });

    if (sourceIsPlayer) {
      const payload: AttackPayload = { targetId: target };
      sendPlayerEvent({ type: PlayerEventType.ATTACK, payload });
    }

    if (import.meta.env.DEV) {
      console.info("[game-rpg] attack resolved", {
        source,
        target,
        amount,
      });
    }
  }
}
