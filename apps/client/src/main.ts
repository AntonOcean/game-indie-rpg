import "./style.css";
import { Application } from "pixi.js";

async function main(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>("#app");
  if (!host) {
    console.error('game-rpg: missing #app container');
    return;
  }

  const app = new Application();
  await app.init({
    resizeTo: host,
    background: 0x1a1a2e,
    antialias: true,
    resolution: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    autoDensity: true,
  });

  host.appendChild(app.canvas);
}

main().catch((err) => {
  console.error(err);
});
