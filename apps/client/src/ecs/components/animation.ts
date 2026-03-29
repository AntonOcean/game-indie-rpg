/** Клип: state (AnimState), тайминги и параметры FSM (секунды, interruptAt 0..1). */
export const Animation = {
  state: [] as number[],
  time: [] as number[],
  duration: [] as number[],
  loop: [] as number[],
  locked: [] as number[],
  minHoldTime: [] as number[],
  interruptAt: [] as number[],
  /** Монотонно +1 при каждом входе в новый клип (дедуп ANIMATION_COMPLETE в RenderSync). */
  clipGeneration: [] as number[],
};
