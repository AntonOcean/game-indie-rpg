import type {
  Application,
  Container,
  FederatedPointerEvent,
} from "pixi.js";
import { PLAYER } from "../constants/gameBalance";
import { screenToWorld } from "./screenToWorld";
import type { PlayerIntent } from "./playerIntent";

const MOVE_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/**
 * Мобила: движение только пока палец на экране (удержание).
 * Отпускание / cancel обнуляет направление — без бесконечного дрейфа (implementation-plan §3).
 */
export type InputBindingHandles = {
  dispose: () => void;
  /** Заполняет intent на кадр; вызывать после сброса полей intent. */
  fillIntent: (out: PlayerIntent) => void;
};

export type PointerMode = "coarse" | "fine";

function detectPointerMode(): PointerMode {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "fine";
  }
  return window.matchMedia("(pointer: coarse)").matches ? "coarse" : "fine";
}

function normalizeDir(dx: number, dy: number): { x: number; y: number } | null {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  return { x: dx / len, y: dy / len };
}

export function bindGameInput(
  app: Application,
  worldRoot: Container,
  getPlayerWorldPos: () => { x: number; y: number },
  /** Мировые px → eid врага или -1 (run-08: hit-test перед движением по тапу). */
  pickEnemyAtWorld: (worldX: number, worldY: number) => number
): InputBindingHandles {
  const keysDown = new Set<string>();
  let pointerMode = detectPointerMode();
  const mq =
    typeof window !== "undefined"
      ? window.matchMedia("(pointer: coarse)")
      : null;
  const onMq = (): void => {
    pointerMode = detectPointerMode();
  };
  mq?.addEventListener("change", onMq);

  let pointerHeld = false;
  let pointerWorldX = 0;
  let pointerWorldY = 0;

  let desktopMoveGoal: { x: number; y: number } | null = null;

  /** Следующий кадр: атака по eid после pointertap (приоритет над moveTo на десктопе). */
  let pendingAttackTarget: number | null = null;

  const onKeyDown = (e: KeyboardEvent): void => {
    if (MOVE_KEYS.has(e.key)) {
      keysDown.add(e.key);
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    keysDown.delete(e.key);
  };

  const refreshStageHitArea = (): void => {
    app.stage.hitArea = app.screen;
  };

  app.stage.eventMode = "static";
  refreshStageHitArea();

  const onPointerDown = (e: FederatedPointerEvent): void => {
    if (pointerMode === "coarse") {
      pointerHeld = true;
      const w = screenToWorld(e.globalX, e.globalY, worldRoot);
      pointerWorldX = w.x;
      pointerWorldY = w.y;
    }
  };

  const onPointerMove = (e: FederatedPointerEvent): void => {
    if (pointerMode === "coarse" && pointerHeld) {
      const w = screenToWorld(e.globalX, e.globalY, worldRoot);
      pointerWorldX = w.x;
      pointerWorldY = w.y;
    }
  };

  const endPointer = (): void => {
    pointerHeld = false;
  };

  const onPointerTap = (e: FederatedPointerEvent): void => {
    const w = screenToWorld(e.globalX, e.globalY, worldRoot);
    const enemyEid = pickEnemyAtWorld(w.x, w.y);
    if (enemyEid >= 0) {
      pendingAttackTarget = enemyEid;
      return;
    }
    if (pointerMode === "fine") {
      desktopMoveGoal = { x: w.x, y: w.y };
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  app.stage.on("pointerdown", onPointerDown);
  app.stage.on("pointermove", onPointerMove);
  app.stage.on("pointerup", endPointer);
  app.stage.on("pointerupoutside", endPointer);
  app.stage.on("pointercancel", endPointer);
  app.stage.on("pointertap", onPointerTap);

  const resizeObs =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => refreshStageHitArea())
      : null;
  resizeObs?.observe(app.canvas);

  function fillIntent(out: PlayerIntent): void {
    out.moveTo = null;
    out.moveDirection = null;
    out.attackTarget = null;

    if (pendingAttackTarget !== null) {
      out.attackTarget = pendingAttackTarget;
      pendingAttackTarget = null;
    }

    const { x: px, y: py } = getPlayerWorldPos();

    if (pointerMode === "coarse") {
      if (pointerHeld) {
        out.moveDirection = normalizeDir(pointerWorldX - px, pointerWorldY - py);
      }
      return;
    }

    let dx = 0;
    let dy = 0;
    if (keysDown.has("ArrowLeft")) {
      dx -= 1;
    }
    if (keysDown.has("ArrowRight")) {
      dx += 1;
    }
    if (keysDown.has("ArrowUp")) {
      dy -= 1;
    }
    if (keysDown.has("ArrowDown")) {
      dy += 1;
    }

    const fromKeys = normalizeDir(dx, dy);
    if (fromKeys) {
      out.moveDirection = fromKeys;
      return;
    }

    if (desktopMoveGoal) {
      const d = Math.hypot(desktopMoveGoal.x - px, desktopMoveGoal.y - py);
      if (d < PLAYER.MOVE_TO_STOP_PX) {
        desktopMoveGoal = null;
      } else {
        out.moveTo = { x: desktopMoveGoal.x, y: desktopMoveGoal.y };
      }
    }
  }

  return {
    dispose: () => {
      mq?.removeEventListener("change", onMq);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      app.stage.off("pointerdown", onPointerDown);
      app.stage.off("pointermove", onPointerMove);
      app.stage.off("pointerup", endPointer);
      app.stage.off("pointerupoutside", endPointer);
      app.stage.off("pointercancel", endPointer);
      app.stage.off("pointertap", onPointerTap);
      resizeObs?.disconnect();
    },
    fillIntent,
  };
}
