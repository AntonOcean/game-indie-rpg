import { query, type World } from "bitecs";
import { FacingDir } from "../animation/animationTypes";
import { Facing, Velocity } from "./components";

const VX_EPS = 1e-4;

/** Обновить Facing по dx движения; при locked — не трогать. */
export function updateFacingFromVelocity(world: World): void {
  const movers = query(world, [Facing, Velocity]);
  for (let i = 0; i < movers.length; i++) {
    const eid = movers[i]!;
    if (Facing.locked[eid]) {
      continue;
    }
    const vx = Velocity.vx[eid];
    if (Math.abs(vx) > VX_EPS) {
      Facing.direction[eid] =
        vx < 0 ? FacingDir.Left : FacingDir.Right;
    }
  }
}
