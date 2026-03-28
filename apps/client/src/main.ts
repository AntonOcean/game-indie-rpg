import "./style.css";
import "./protocol";
import { Application } from "pixi.js";
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

  subscribeViewportResize(() => app.queueResize());
}

main().catch((err) => {
  console.error(err);
});
