import type { Container } from "pixi.js";

export type RenderRegistry = {
  /** Map<renderId, узел сцены> */
  nodes: Map<number, Container>;
  allocateId(): number;
};

let nextRenderId = 1;

export function createRenderRegistry(): RenderRegistry {
  const nodes = new Map<number, Container>();
  return {
    nodes,
    allocateId(): number {
      const id = nextRenderId;
      nextRenderId += 1;
      return id;
    },
  };
}
