import "./style.css";
import "./protocol";
import { Application } from "pixi.js";
import { createGameWorld } from "./ecs/createGameWorld";
import {
  deltaSecondsClamped,
  movePlayerWithTileCollisions,
  resolvePlayerIntentToVelocity,
} from "./ecs/playerLocomotion";
import { spawnPlayerEntity } from "./ecs/playerSpawn";
import { Position } from "./ecs/components";
import { loadGameMap } from "./gameMap";
import { bindGameInput } from "./input/inputBindings";
import { emptyPlayerIntent } from "./input/playerIntent";
import { mountPlayerVisual } from "./render/mountPlayerVisual";
import { createRenderRegistry } from "./render/renderRegistry";
import { runRenderSystem } from "./render/renderSystem";
import {
  applyWorldScale,
  DEFAULT_WORLD_SCALE,
  updateWorldCamera,
} from "./camera/worldCamera";
import { initTelegramWebAppOnce, subscribeViewportResize } from "./twaShell";

async function main(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>("#app");
  if (!host) {
    console.error("game-rpg: missing #app container");
    return;
  }

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
  applyWorldScale(worldRoot, DEFAULT_WORLD_SCALE);
  const ecsWorld = createGameWorld();
  const renderRegistry = createRenderRegistry();
  const playerRenderId = mountPlayerVisual(worldRoot, renderRegistry);
  const playerEid = spawnPlayerEntity(ecsWorld, playerRenderId, meta);

  const intent = emptyPlayerIntent();
  const input = bindGameInput(app, worldRoot, () => ({
    x: Position.x[playerEid],
    y: Position.y[playerEid],
  }));

  app.ticker.add(() => {
    const dtSec = deltaSecondsClamped(app.ticker.deltaMS);
    input.fillIntent(intent);
    resolvePlayerIntentToVelocity(playerEid, intent);
    movePlayerWithTileCollisions(playerEid, meta, dtSec);
    runRenderSystem(ecsWorld, renderRegistry);
    updateWorldCamera(
      worldRoot,
      meta,
      Position.x[playerEid],
      Position.y[playerEid],
      app.screen.width,
      app.screen.height
    );
  });

  subscribeViewportResize(() => {
    app.queueResize();
    app.stage.hitArea = app.screen;
  });
}

main().catch((err) => {
  console.error(err);
});
