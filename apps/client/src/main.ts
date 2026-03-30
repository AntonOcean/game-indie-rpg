import "./style.css";
import "./protocol";
import { Application } from "pixi.js";
import { hasComponent } from "bitecs";
import { applyWorldScale, updateWorldCamera } from "./camera/worldCamera";
import { CAMERA, ENGINE, ITEMS, PLAYER } from "./constants/gameBalance";
import { bindDebugOverlayToggle, createDebugOverlay } from "./debug/debugOverlay";
import { createGameWorld } from "./ecs/createGameWorld";
import { pickEnemyAtWorld } from "./ecs/enemyHitTest";
import { spawnEnemyEntity } from "./ecs/enemySpawn";
import { consumeDeferredRenderEvents } from "./ecs/consumeRenderEvents";
import { processEnemyDeath } from "./ecs/enemyDeath";
import { processPlayerDeath } from "./ecs/playerDeath";
import { runLootSystem } from "./ecs/lootPickup";
import { spawnLootEntity } from "./ecs/lootSpawn";
import type { AttackIntent } from "./events/attackIntent";
import { createGameEventQueues } from "./events/gameEventQueues";
import { createProcessedEvents } from "./events/processedEvents";
import { advanceGameTime, createGameTime } from "./ecs/gameTime";
import { runHealthSystem } from "./ecs/healthSystem";
import {
  collectPlayerAttackIntents,
  resolveCombatAndEmitDamage,
} from "./ecs/playerCombat";
import {
  moveEntityWithTileCollisions,
  resolvePlayerIntentToVelocity,
} from "./ecs/playerLocomotion";
import {
  applyEnemyVelocityFromAI,
  collectEnemyAttackIntents,
  moveEnemiesWithTileCollisions,
  runAIThinkSystem,
  syncEnemyVelocityAfterAIThink,
  updateStuckDetectorsAfterMovement,
} from "./ecs/aiSystem";
import { runAnimationSystem } from "./ecs/animationSystem";
import { updateFacingFromVelocity } from "./ecs/facingSystem";
import { enqueueLocomotionAnimationRequests } from "./ecs/locomotionAnimationIntent";
import { spawnPlayerEntity } from "./ecs/playerSpawn";
import { Position, CombatState, CombatStateEnum } from "./ecs/components";
import { loadGameMap } from "./gameMap";
import { bindGameInput } from "./input/inputBindings";
import { emptyPlayerIntent } from "./input/playerIntent";
import { createAnimationIntentBuffer } from "./animation/animationIntentBuffer";
import { createLootVisualAt } from "./render/mountLootVisual";
import { loadItemAtlas } from "./render/itemAtlas";
import { loadCharacterAnimationFrames } from "./render/loadCharacterAnimationTextures";
import { mountEnemyVisual } from "./render/mountEnemyVisual";
import { mountPlayerVisual } from "./render/mountPlayerVisual";
import { createRenderRegistry } from "./render/renderRegistry";
import { createRenderAdapter } from "./render/renderAdapter";
import type { RenderEvent } from "./render/renderEvent";
import { createHpBarLayer } from "./render/hpBarLayer";
import { runRenderSystem } from "./render/renderSystem";
import { initTelegramWebAppOnce, subscribeViewportResize } from "./twaShell";
import { createInventoryService } from "./state/inventoryService";
import { createPlayerState } from "./state/playerState";
import { createInventoryOverlay } from "./ui/inventoryOverlay";
import { rollLoot } from "./data/lootTable";
import { LootItemKindEnum } from "./ecs/components";

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
  await loadItemAtlas();
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
  const gameTime = createGameTime();
  const eventQueues = createGameEventQueues();
  const processedEvents = createProcessedEvents();
  const attackIntents: AttackIntent[] = [];
  const pendingDestroyRenderIds: number[] = [];
  const animationIntentBuffer = createAnimationIntentBuffer();
  const renderAdapter = createRenderAdapter();
  const renderEventMailbox: RenderEvent[] = [];
  const playerState = createPlayerState();
  const inventoryService = createInventoryService(playerState);
  const devAnimWarn = (msg: string): void => {
    if (import.meta.env.DEV) {
      console.warn(msg);
    }
  };
  const goldHud = document.querySelector<HTMLDivElement>("#hud-gold");

  const input = bindGameInput(
    app,
    worldRoot,
    () => ({
      x: Position.x[playerEid],
      y: Position.y[playerEid],
    }),
    (wx, wy) => pickEnemyAtWorld(ecsWorld, wx, wy),
    (wx, wy) => {
      if (!canAcceptGameplayInput()) {
        return;
      }
      renderAdapter.push({ type: "POINTER_TAP", worldX: wx, worldY: wy });
    }
  );

  const debugOverlay = createDebugOverlay(worldRoot);
  bindDebugOverlayToggle(window, debugOverlay);
  const hpBarLayer = createHpBarLayer(app.stage);

  const gameOverOverlay = document.createElement("div");
  gameOverOverlay.id = "game-over-overlay";
  gameOverOverlay.style.display = "none";
  gameOverOverlay.style.position = "fixed";
  gameOverOverlay.style.inset = "0";
  gameOverOverlay.style.background = "rgba(10, 10, 20, 0.65)";
  gameOverOverlay.style.zIndex = "10";
  gameOverOverlay.style.alignItems = "center";
  gameOverOverlay.style.justifyContent = "center";
  gameOverOverlay.style.pointerEvents = "auto";
  gameOverOverlay.style.flexDirection = "column";

  const gameOverTitle = document.createElement("div");
  gameOverTitle.textContent = "Game Over";
  gameOverTitle.style.font = "800 28px/1.1 system-ui, sans-serif";
  gameOverTitle.style.color = "#e8e8ef";
  gameOverTitle.style.textShadow = "0 2px 10px #000";

  const gameOverButton = document.createElement("button");
  gameOverButton.textContent = "Restart";
  gameOverButton.style.marginTop = "16px";
  gameOverButton.style.padding = "10px 16px";
  gameOverButton.style.borderRadius = "10px";
  gameOverButton.style.border = "0";
  gameOverButton.style.cursor = "pointer";
  gameOverButton.style.font = "700 16px/1.2 system-ui, sans-serif";
  gameOverButton.style.background = "#7c3aed";
  gameOverButton.style.color = "#fff";
  gameOverButton.addEventListener("click", () => {
    location.reload();
  });

  gameOverOverlay.appendChild(gameOverTitle);
  gameOverOverlay.appendChild(gameOverButton);
  document.body.appendChild(gameOverOverlay);

  let gameOverShown = false;

  const spawnLootAt = (wx: number, wy: number): void => {
    const drops = rollLoot("orc", 0xabcddcba, gameTime.tickId);
    const spread = 10;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]!;
      const ox = (i - (drops.length - 1) / 2) * spread;
      const oy = ((i % 2 === 0 ? -1 : 1) * spread) / 2;

      const lootRenderId = createLootVisualAt(
        worldRoot,
        renderRegistry,
        wx + ox,
        wy + oy,
        d.itemId
      );
      const kind =
        d.itemId === ITEMS.POTION_HP ? LootItemKindEnum.PotionHp : LootItemKindEnum.Gold;
      spawnLootEntity(ecsWorld, lootRenderId, wx + ox, wy + oy, kind, d.quantity);
    }
  };

  const inventoryOverlay = createInventoryOverlay({
    inventoryService,
    ecsWorld,
    playerEid,
    getPlayerMaxHp: () => PLAYER.MAX_HP,
  });

  const inventoryButton = document.createElement("button");
  inventoryButton.id = "hud-inventory-button";
  inventoryButton.textContent = "Inventory";
  inventoryButton.style.position = "fixed";
  inventoryButton.style.right = "12px";
  inventoryButton.style.top = "12px";
  inventoryButton.style.zIndex = "15";
  inventoryButton.style.padding = "10px 12px";
  inventoryButton.style.borderRadius = "12px";
  inventoryButton.style.border = "1px solid rgba(255,255,255,0.12)";
  inventoryButton.style.background = "rgba(22, 22, 38, 0.75)";
  inventoryButton.style.color = "#e8e8ef";
  inventoryButton.style.font = "800 13px/1 system-ui, sans-serif";
  inventoryButton.style.cursor = "pointer";
  inventoryButton.style.touchAction = "manipulation";
  inventoryButton.addEventListener("click", () => inventoryOverlay.toggle());
  document.body.appendChild(inventoryButton);

  const canAcceptGameplayInput = (): boolean =>
    !inventoryOverlay.isOpen() && !gameOverShown;

  app.ticker.add(() => {
    const renderEventsFromLastFrame = renderEventMailbox.splice(0);
    consumeDeferredRenderEvents(
      ecsWorld,
      renderEventsFromLastFrame,
      animationIntentBuffer,
      spawnLootAt,
      playerEid,
      canAcceptGameplayInput,
      () => {
        if (gameOverShown) {
          return;
        }
        gameOverShown = true;
        gameOverOverlay.style.display = "flex";
      }
    );

    advanceGameTime(gameTime, app.ticker.deltaMS);

    attackIntents.length = 0;

    const playerCombatDeadAtStart =
      hasComponent(ecsWorld, playerEid, CombatState) &&
      CombatState.state[playerEid] === CombatStateEnum.dead;

    if (!playerCombatDeadAtStart && canAcceptGameplayInput()) {
      input.fillIntent(intent);
      collectPlayerAttackIntents(ecsWorld, playerEid, intent, attackIntents);
    } else {
      input.fillIntent(emptyPlayerIntent());
    }

    collectEnemyAttackIntents(
      ecsWorld,
      playerEid,
      gameTime,
      attackIntents
    );

    resolveCombatAndEmitDamage(
      ecsWorld,
      gameTime,
      eventQueues,
      attackIntents,
      animationIntentBuffer
    );

    runHealthSystem(
      ecsWorld,
      eventQueues,
      processedEvents,
      undefined,
      animationIntentBuffer,
      playerEid
    );

    processPlayerDeath(ecsWorld, playerEid, animationIntentBuffer);
    const playerCombatDeadNow =
      hasComponent(ecsWorld, playerEid, CombatState) &&
      CombatState.state[playerEid] === CombatStateEnum.dead;

    processEnemyDeath(ecsWorld, animationIntentBuffer);
    runLootSystem(
      ecsWorld,
      playerEid,
      gameTime,
      eventQueues,
      inventoryService,
      pendingDestroyRenderIds
    );

    applyEnemyVelocityFromAI(ecsWorld, playerEid, gameTime);
    if (!playerCombatDeadNow && canAcceptGameplayInput()) {
      resolvePlayerIntentToVelocity(playerEid, intent);
      moveEntityWithTileCollisions(playerEid, meta, gameTime.dt);
    } else {
      resolvePlayerIntentToVelocity(playerEid, emptyPlayerIntent());
    }
    moveEnemiesWithTileCollisions(ecsWorld, meta, gameTime.dt);
    updateStuckDetectorsAfterMovement(ecsWorld, gameTime);
    runAIThinkSystem(
      ecsWorld,
      playerEid,
      gameTime,
      animationIntentBuffer
    );
    syncEnemyVelocityAfterAIThink(ecsWorld);

    enqueueLocomotionAnimationRequests(ecsWorld, animationIntentBuffer);
    updateFacingFromVelocity(ecsWorld);
    runAnimationSystem(ecsWorld, animationIntentBuffer, gameTime.dt, devAnimWarn);
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
    hpBarLayer.update(ecsWorld, worldRoot, playerEid);
    debugOverlay.update(ecsWorld, playerEid, gameTime);
    if (goldHud) {
      const s = inventoryService.getInventory().find((x) => x.itemId === ITEMS.GOLD);
      const qty = s?.quantity ?? 0;
      goldHud.textContent = `Gold: ${qty}`;
    }
    if (inventoryOverlay.isOpen()) {
      inventoryOverlay.refresh();
    }

    eventQueues.swap();
    gameTime.tickId += 1;
    if (gameTime.tickId % ENGINE.PROCESSED_EVENTS_CLEANUP_EVERY_TICKS === 0) {
      processedEvents.cleanup(gameTime.tickId, 60);
    }
  });

  subscribeViewportResize(() => {
    app.queueResize();
    app.stage.hitArea = app.screen;
  });
}

main().catch((err) => {
  console.error(err);
});
