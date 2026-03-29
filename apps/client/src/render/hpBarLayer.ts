import { hasComponent, query, type World } from "bitecs";
import { Container, Graphics, Text, type Container as PixiContainer } from "pixi.js";
import { CHARACTER, HP_BAR } from "../constants/gameBalance";
import { Dead, Enemy, Health, Player, Position } from "../ecs/components";
import { worldToScreen } from "../input/screenToWorld";

type EnemyBarNodes = {
  root: Container;
  bg: Graphics;
  fill: Graphics;
};

const labelStyle = {
  fontFamily: "system-ui, sans-serif",
  fontSize: 11,
  fill: 0xe8e8ef,
  stroke: { color: 0x000000, width: 3 },
} as const;

function fillColorForHpRatio(ratio: number): number {
  if (ratio >= 0.6) {
    return HP_BAR.COLOR_HIGH;
  }
  if (ratio >= 0.3) {
    return HP_BAR.COLOR_MID;
  }
  return HP_BAR.COLOR_LOW;
}

function redrawFill(g: Graphics, widthPx: number, color: number): void {
  g.clear();
  if (widthPx <= 0) {
    return;
  }
  g.rect(0, 0, widthPx, HP_BAR.HEIGHT).fill({ color });
}

function createEnemyBar(): EnemyBarNodes {
  const root = new Container();
  root.eventMode = "none";
  const bg = new Graphics();
  bg.eventMode = "none";
  bg.rect(0, 0, HP_BAR.WIDTH, HP_BAR.HEIGHT).fill({ color: HP_BAR.BG_COLOR });
  const fill = new Graphics();
  fill.eventMode = "none";
  root.addChild(bg);
  root.addChild(fill);
  return { root, bg, fill };
}

export type HpBarLayer = {
  readonly root: PixiContainer;
  /** После `updateWorldCamera`: пересчёт screen-space позиций и ширины fill. Только чтение ECS. */
  update(world: World, worldRoot: PixiContainer, playerEid: number): void;
};

/**
 * Слой HP-баров поверх мира (не дочерний к worldRoot — без масштаба камеры).
 * run-15 / architecture: worldToScreen → Math.round.
 */
export function createHpBarLayer(stage: PixiContainer): HpBarLayer {
  const root = new Container();
  root.eventMode = "none";
  root.sortableChildren = false;
  stage.addChild(root);

  const enemyBars = new Map<number, EnemyBarNodes>();

  const playerRoot = new Container();
  playerRoot.eventMode = "none";
  const playerBg = new Graphics();
  playerBg.eventMode = "none";
  const playerFill = new Graphics();
  playerFill.eventMode = "none";
  const playerCaption = new Text({
    text: "HP",
    style: labelStyle,
  });
  playerCaption.eventMode = "none";
  const playerValues = new Text({
    text: "",
    style: labelStyle,
  });
  playerValues.eventMode = "none";

  playerBg.rect(0, 0, HP_BAR.WIDTH, HP_BAR.HEIGHT).fill({ color: HP_BAR.BG_COLOR });
  playerRoot.addChild(playerBg);
  playerRoot.addChild(playerFill);
  playerCaption.position.set(0, -16);
  playerRoot.addChild(playerCaption);
  playerValues.position.set(28, -16);
  playerRoot.addChild(playerValues);
  root.addChild(playerRoot);

  function update(
    world: World,
    worldRoot: PixiContainer,
    playerEid: number
  ): void {
    const halfSprite = CHARACTER.SPRITE_WORLD_HEIGHT_PX / 2;
    const anchorYOffset = halfSprite + HP_BAR.OFFSET_Y;

    const wantedEnemy = new Set<number>();
    const enemies = query(world, [Enemy, Health, Position]);
    for (let i = 0; i < enemies.length; i++) {
      const eid = enemies[i]!;
      if (hasComponent(world, eid, Dead)) {
        continue;
      }
      const cur = Health.current[eid] ?? 0;
      const max = Health.max[eid] ?? 1;
      if (cur <= 0) {
        continue;
      }
      /** Опционально run-15: не показывать полоску у полного HP. */
      if (cur >= max) {
        continue;
      }
      wantedEnemy.add(eid);

      let nodes = enemyBars.get(eid);
      if (!nodes) {
        nodes = createEnemyBar();
        enemyBars.set(eid, nodes);
        root.addChild(nodes.root);
      }

      const wx = Position.x[eid];
      const wy = Position.y[eid] - anchorYOffset;
      const g = worldToScreen(wx, wy, worldRoot);
      const sx = Math.round(g.x - HP_BAR.WIDTH / 2);
      const sy = Math.round(g.y);
      nodes.root.position.set(sx, sy);

      const ratio = Math.max(0, Math.min(1, cur / max));
      const fillW = Math.round(HP_BAR.WIDTH * ratio);
      redrawFill(nodes.fill, fillW, fillColorForHpRatio(ratio));
    }

    for (const [eid, nodes] of enemyBars) {
      if (!wantedEnemy.has(eid)) {
        nodes.root.destroy();
        enemyBars.delete(eid);
      }
    }

    if (hasComponent(world, playerEid, Health)) {
      const pCur = Health.current[playerEid] ?? 0;
      const pMax = Health.max[playerEid] ?? 1;
      const pr = Math.max(0, Math.min(1, pCur / pMax));
      const pFillW = Math.round(HP_BAR.WIDTH * pr);
      redrawFill(playerFill, pFillW, fillColorForHpRatio(pr));
      playerValues.text = `${pCur}/${pMax}`;
      playerRoot.position.set(
        Math.round(HP_BAR.HUD_MARGIN_X),
        Math.round(HP_BAR.HUD_MARGIN_Y)
      );
      playerRoot.visible = true;
    } else {
      playerRoot.visible = false;
    }
  }

  return { root, update };
}
