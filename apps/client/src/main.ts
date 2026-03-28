import "./style.css";
import "./protocol";
import { Application } from "pixi.js";
import { createGameWorld } from "./ecs/createGameWorld";
import { spawnPlayerEntity } from "./ecs/playerSpawn";
import { loadGameMap } from "./gameMap";
import { mountPlayerVisual } from "./render/mountPlayerVisual";
import { createRenderRegistry } from "./render/renderRegistry";
import { runRenderSystem } from "./render/renderSystem";
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
  const ecsWorld = createGameWorld();
  const renderRegistry = createRenderRegistry();
  const playerRenderId = mountPlayerVisual(worldRoot, renderRegistry);
  spawnPlayerEntity(ecsWorld, playerRenderId, meta);

  app.ticker.add(() => {
    runRenderSystem(ecsWorld, renderRegistry);
  });

  subscribeViewportResize(() => app.queueResize());
}

main().catch((err) => {
  console.error(err);
});
