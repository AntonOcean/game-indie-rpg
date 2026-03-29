/**
 * События рендера → симуляция (architecture.md: только через poll(), без мутации ECS из колбэков Pixi).
 */
export type RenderEvent =
  | { type: "ANIMATION_COMPLETE"; entity: number }
  | { type: "POINTER_TAP"; worldX: number; worldY: number };
