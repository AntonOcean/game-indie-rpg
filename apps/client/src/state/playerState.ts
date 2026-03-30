export type ItemStack = { itemId: string; quantity: number };

export type PlayerState = {
  inventory: ItemStack[];
};

export function createPlayerState(): PlayerState {
  return {
    inventory: [],
  };
}

