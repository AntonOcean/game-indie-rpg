import "./style.css";
import "./protocol";
import { Application } from "pixi.js";
import { applyWorldScale, updateWorldCamera } from "./camera/worldCamera";
import { CAMERA } from "./constants/gameBalance";
import { bindDebugOverlayToggle, createDebugOverlay } from "./debug/debugOverlay";
import { createGameWorld } from "./ecs/createGameWorld";
import { pickEnemyAtWorld } from "./ecs/enemyHitTest";
import { spawnEnemyEntity } from "./ecs/enemySpawn";
import { consumeDeferredRenderEvents } from "./ecs/consumeRenderEvents";
import { processEnemyDeath } from "./ecs/enemyDeath";
import { processLootPickup } from "./ecs/lootPickup";
import { spawnLootEntity } from "./ecs/lootSpawn";
import {
  deltaSecondsClamped,
  movePlayerWithTileCollisions,
  resolvePlayerIntentToVelocity,
} from "./ecs/playerLocomotion";
import { resolvePlayerAttack } from "./ecs/playerCombat";
import { runAnimationSystem } from "./ecs/animationSystem";
import { updateFacingFromVelocity } from "./ecs/facingSystem";
import { enqueueLocomotionAnimationRequests } from "./ecs/locomotionAnimationIntent";
import { spawnPlayerEntity } from "./ecs/playerSpawn";
import { Position } from "./ecs/components";
import { loadGameMap } from "./gameMap";
import { bindGameInput } from "./input/inputBindings";
import { emptyPlayerIntent } from "./input/playerIntent";
import { createAnimationIntentBuffer } from "./animation/animationIntentBuffer";
import { createLootVisualAt } from "./render/mountLootVisual";
import { loadCharacterAnimationFrames } from "./render/loadCharacterAnimationTextures";
import { mountEnemyVisual } from "./render/mountEnemyVisual";
import { mountPlayerVisual } from "./render/mountPlayerVisual";
import { createRenderRegistry } from "./render/renderRegistry";
import { createRenderAdapter } from "./render/renderAdapter";
import type { RenderEvent } from "./render/renderEvent";
import { runRenderSystem } from "./render/renderSystem";
import { initTelegramWebAppOnce, subscribeViewportResize } from "./twaShell";

async function main(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>("#app");
  if (!host) {
    console.error("game-rpg: missing #app container");
    return;
  }

  host.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  initTelegramWebAppOnce();

  const app = new Application();
  await app.init({
    resizeTo: host,
    background: 0x1a1a2e,
    antialias: true,
    resolution: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    autoDensity: true,
  });

  host.appendChild(app.canvas);

  const { meta, worldRoot } = await loadGameMap(app);
  applyWorldScale(worldRoot, CAMERA.WORLD_SCALE);
  const characterAnimFrames = await loadCharacterAnimationFrames();
  const ecsWorld = createGameWorld();
  const renderRegistry = createRenderRegistry();
  const playerRenderId = mountPlayerVisual(
    worldRoot,
    renderRegistry,
    characterAnimFrames.soldier.idle[0]!
  );
  const playerEid = spawnPlayerEntity(ecsWorld, playerRenderId, meta);

  const enemyRenderId = mountEnemyVisual(
    worldRoot,
    renderRegistry,
    characterAnimFrames.orc.idle[0]!
  );
  spawnEnemyEntity(ecsWorld, enemyRenderId, meta);

  const intent = emptyPlayerIntent();
  const pendingDestroyRenderIds: number[] = [];
  const animationIntentBuffer = createAnimationIntentBuffer();
  const renderAdapter = createRenderAdapter();
  const renderEventMailbox: RenderEvent[] = [];
  const devAnimWarn = (msg: string): void => {
    if (import.meta.env.DEV) {
      console.warn(msg);
    }
  };
  let goldCount = 0;
  const goldHud = document.querySelector<HTMLDivElement>("#hud-gold");

  const input = bindGameInput(
    app,
    worldRoot,
    () => ({
      x: Position.x[playerEid],
      y: Position.y[playerEid],
    }),
    (wx, wy) => pickEnemyAtWorld(ecsWorld, wx, wy)
  );

  const debugOverlay = createDebugOverlay(worldRoot);
  bindDebugOverlayToggle(window, debugOverlay);

  const spawnLootAt = (wx: number, wy: number): void => {
    const lootRenderId = createLootVisualAt(worldRoot, renderRegistry, wx, wy);
    spawnLootEntity(ecsWorld, lootRenderId, wx, wy);
  };

  app.ticker.add(() => {
    const dtSec = deltaSecondsClamped(app.ticker.deltaMS);

    const renderEventsFromLastFrame = renderEventMailbox.splice(0);
    consumeDeferredRenderEvents(
      ecsWorld,
      renderEventsFromLastFrame,
      animationIntentBuffer,
      spawnLootAt
    );

    input.fillIntent(intent);
    resolvePlayerIntentToVelocity(playerEid, intent);
    movePlayerWithTileCollisions(playerEid, meta, dtSec);
    resolvePlayerAttack(
      ecsWorld,
      playerEid,
      intent,
      performance.now(),
      animationIntentBuffer
    );
    processEnemyDeath(ecsWorld, animationIntentBuffer);
    const picked = processLootPickup(
      ecsWorld,
      playerEid,
      pendingDestroyRenderIds
    );
    if (picked > 0) {
      goldCount += picked;
      if (goldHud) {
        goldHud.textContent = `Gold: ${goldCount}`;
      }
    }
    enqueueLocomotionAnimationRequests(ecsWorld, animationIntentBuffer);
    updateFacingFromVelocity(ecsWorld);
    runAnimationSystem(ecsWorld, animationIntentBuffer, dtSec, devAnimWarn);
    runRenderSystem(
      ecsWorld,
      renderRegistry,
      pendingDestroyRenderIds,
      characterAnimFrames,
      renderAdapter
    );
    renderEventMailbox.push(...renderAdapter.poll());
    updateWorldCamera(
      worldRoot,
      meta,
      Position.x[playerEid],
      Position.y[playerEid],
      app.screen.width,
      app.screen.height
    );
    debugOverlay.update(ecsWorld, playerEid);
  });

  subscribeViewportResize(() => {
    app.queueResize();
    app.stage.hitArea = app.screen;
  });
}

main().catch((err) => {
  console.error(err);
});
