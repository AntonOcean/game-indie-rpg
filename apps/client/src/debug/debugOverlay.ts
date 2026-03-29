import { query, hasComponent, type World } from "bitecs";
import { Container, Graphics, Text, type Container as PixiContainer } from "pixi.js";
import { animStateLabel } from "../animation/animationTypes";
import { LOOT } from "../constants/gameBalance";
import { AI, AIState } from "../ecs/components/ai";
import type { GameTime } from "../ecs/gameTime";
import {
  Animation,
  Dead,
  Enemy,
  Health,
  Hitbox,
  Loot,
  LootState,
  lootStateLabel,
  Player,
  Position,
} from "../ecs/components";

const HITBOX_FILL = { color: 0x44ff88, alpha: 0.14 } as const;
const HITBOX_STROKE = { width: 1, color: 0x66ffaa, alpha: 0.85 } as const;
const PICKUP_RADIUS_STROKE = { width: 1, color: 0xffcc00, alpha: 0.75 } as const;
const AI_AGGRO_STROKE = { width: 1, color: 0x88ccff, alpha: 0.55 } as const;
const AI_ATTACK_STROKE = { width: 1, color: 0xff6688, alpha: 0.65 } as const;

const labelStyle = {
  fontFamily: "system-ui, sans-serif",
  fontSize: 11,
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 3 },
} as const;

export type DebugOverlay = {
  readonly root: PixiContainer;
  setVisible(visible: boolean): void;
  toggle(): void;
  update(world: World, playerEid: number, gameTime: GameTime): void;
  dispose(): void;
};

/**
 * Слой отладки в координатах мира (дочерний к worldRoot): хитбоксы, HP врагов, позиция игрока.
 * Только чтение ECS; переключение по клавише D — снаружи (main).
 */
export function createDebugOverlay(worldRoot: PixiContainer): DebugOverlay {
  const root = new Container();
  root.visible = false;
  root.eventMode = "none";
  worldRoot.addChild(root);

  function bringToFront(): void {
    const n = worldRoot.children.length;
    if (n > 0) {
      worldRoot.setChildIndex(root, n - 1);
    }
  }

  const hitGfx = new Graphics();
  hitGfx.eventMode = "none";
  root.addChild(hitGfx);

  const playerPosText = new Text({
    text: "",
    style: labelStyle,
  });
  playerPosText.eventMode = "none";
  playerPosText.anchor.set(0, 0.5);
  root.addChild(playerPosText);

  const enemyHpPool: Text[] = [];
  const animLabelPool: Text[] = [];
  const aiLabelPool: Text[] = [];
  const lootLabelPool: Text[] = [];

  function ensureAiLabel(index: number): Text {
    let t = aiLabelPool[index];
    if (!t) {
      t = new Text({ text: "", style: labelStyle });
      t.eventMode = "none";
      t.anchor.set(0.5, 0);
      aiLabelPool.push(t);
      root.addChild(t);
    }
    return t;
  }

  function ensureLootLabel(index: number): Text {
    let t = lootLabelPool[index];
    if (!t) {
      t = new Text({ text: "", style: labelStyle });
      t.eventMode = "none";
      t.anchor.set(0.5, 0);
      lootLabelPool.push(t);
      root.addChild(t);
    }
    return t;
  }

  function ensureAnimLabel(index: number): Text {
    let t = animLabelPool[index];
    if (!t) {
      t = new Text({ text: "", style: labelStyle });
      t.eventMode = "none";
      t.anchor.set(0.5, 0);
      animLabelPool.push(t);
      root.addChild(t);
    }
    return t;
  }

  function ensureEnemyHpLabel(index: number): Text {
    let t = enemyHpPool[index];
    if (!t) {
      t = new Text({ text: "", style: labelStyle });
      t.eventMode = "none";
      t.anchor.set(0.5, 1);
      enemyHpPool.push(t);
      root.addChild(t);
    }
    return t;
  }

  return {
    root,

    setVisible(visible: boolean): void {
      root.visible = visible;
    },

    toggle(): void {
      root.visible = !root.visible;
    },

    update(world: World, playerEid: number, gameTime: GameTime): void {
      if (!root.visible) {
        return;
      }

      bringToFront();

      hitGfx.clear();

      const withHitbox = query(world, [Position, Hitbox]);
      for (let i = 0; i < withHitbox.length; i++) {
        const eid = withHitbox[i];
        const cx = Position.x[eid];
        const cy = Position.y[eid];
        const hw = Hitbox.width[eid] / 2;
        const hh = Hitbox.height[eid] / 2;
        const left = cx - hw;
        const top = cy - hh;
        hitGfx
          .rect(left, top, Hitbox.width[eid], Hitbox.height[eid])
          .fill(HITBOX_FILL)
          .stroke(HITBOX_STROKE);
      }

      const px = Position.x[playerEid];
      const py = Position.y[playerEid];
      playerPosText.text = `tick: ${gameTime.tickId}  x: ${px.toFixed(0)}  y: ${py.toFixed(0)}`;
      playerPosText.position.set(px + 16, py);

      hitGfx.circle(px, py, LOOT.PICKUP_RADIUS).stroke(PICKUP_RADIUS_STROKE);

      let hpIndex = 0;
      const enemies = query(world, [Enemy, Health, Position, Hitbox]);
      for (let i = 0; i < enemies.length; i++) {
        const eid = enemies[i];
        if (hasComponent(world, eid, Dead)) {
          continue;
        }
        const t = ensureEnemyHpLabel(hpIndex++);
        t.text = `${Health.current[eid]}/${Health.max[eid]}`;
        const cx = Position.x[eid];
        const cy = Position.y[eid];
        const hh = Hitbox.height[eid] / 2;
        t.position.set(cx, cy - hh - 4);
        t.visible = true;
      }
      for (let j = hpIndex; j < enemyHpPool.length; j++) {
        enemyHpPool[j]!.visible = false;
      }

      let aiIndex = 0;
      const withAi = query(world, [Enemy, AI, Position]);
      for (let i = 0; i < withAi.length; i++) {
        const eid = withAi[i]!;
        if (hasComponent(world, eid, Dead)) {
          continue;
        }
        const cx = Position.x[eid];
        const cy = Position.y[eid];
        const rAgg = AI.aggroRadius[eid];
        const rAtk = AI.attackRange[eid];
        hitGfx.circle(cx, cy, rAgg).stroke(AI_AGGRO_STROKE);
        hitGfx.circle(cx, cy, rAtk).stroke(AI_ATTACK_STROKE);
        const st = AI.state[eid];
        const stLabel =
          st === AIState.Idle ? "idle" : st === AIState.Chase ? "chase" : "attack";
        const aiLab = ensureAiLabel(aiIndex++);
        aiLab.text = `ai: ${stLabel}  off=${AI.thinkOffset[eid]}`;
        aiLab.position.set(cx, cy - rAgg - 6);
        aiLab.visible = true;
      }
      for (let j = aiIndex; j < aiLabelPool.length; j++) {
        aiLabelPool[j]!.visible = false;
      }

      let animIndex = 0;
      const withAnim = query(world, [Animation, Position, Hitbox]);
      for (let i = 0; i < withAnim.length; i++) {
        const eid = withAnim[i]!;
        if (!hasComponent(world, eid, Player) && !hasComponent(world, eid, Enemy)) {
          continue;
        }
        if (hasComponent(world, eid, Dead)) {
          continue;
        }
        const label = ensureAnimLabel(animIndex++);
        label.text = `anim: ${animStateLabel(Animation.state[eid])}`;
        const cx = Position.x[eid];
        const cy = Position.y[eid];
        const hh = Hitbox.height[eid] / 2;
        label.position.set(cx, cy + hh + 6);
        label.visible = true;
      }
      for (let j = animIndex; j < animLabelPool.length; j++) {
        animLabelPool[j]!.visible = false;
      }

      let lootIndex = 0;
      const lootEnts = query(world, [Loot, LootState, Position, Hitbox]);
      for (let i = 0; i < lootEnts.length; i++) {
        const eid = lootEnts[i]!;
        const label = ensureLootLabel(lootIndex++);
        label.text = `loot: ${lootStateLabel(LootState.state[eid])}`;
        const cx = Position.x[eid];
        const cy = Position.y[eid];
        const hh = Hitbox.height[eid] / 2;
        label.position.set(cx, cy + hh + 10);
        label.visible = true;
      }
      for (let j = lootIndex; j < lootLabelPool.length; j++) {
        lootLabelPool[j]!.visible = false;
      }
    },

    dispose(): void {
      worldRoot.removeChild(root);
      root.destroy({ children: true });
    },
  };
}

/** Подписка на D / Shift+D не нужна — одна клавиша D. */
export function bindDebugOverlayToggle(
  target: Window,
  overlay: DebugOverlay
): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "d" && e.key !== "D") {
      return;
    }
    if (e.repeat) {
      return;
    }
    e.preventDefault();
    overlay.toggle();
  };
  target.addEventListener("keydown", onKeyDown);
  return () => target.removeEventListener("keydown", onKeyDown);
}
