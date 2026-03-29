import type { RenderEvent } from "./renderEvent";

export type RenderAdapter = {
  push(event: RenderEvent): void;
  poll(): RenderEvent[];
};

/**
 * Единая очередь Pixi → игра. Без импорта ECS; колбэки только push().
 */
export function createRenderAdapter(): RenderAdapter {
  const queue: RenderEvent[] = [];
  return {
    push(event: RenderEvent): void {
      queue.push(event);
    },
    poll(): RenderEvent[] {
      if (queue.length === 0) {
        return [];
      }
      const out = queue.slice();
      queue.length = 0;
      return out;
    },
  };
}
