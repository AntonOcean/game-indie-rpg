import { INVENTORY } from "../constants/gameBalance";
import type { ItemStack, PlayerState } from "./playerState";

export type AddItemRejectReason = "inventory_full" | "stack_cap";

export type TryAddItemResult =
  | { ok: true }
  | { ok: false; reason: AddItemRejectReason };

export type InventoryService = {
  tryAddItem(itemId: string, quantity?: number): TryAddItemResult;
  removeItem(itemId: string, quantity?: number): boolean;
  hasItem(itemId: string, minQuantity?: number): boolean;
  getInventory(): readonly ItemStack[];
};

export function createInventoryService(playerState: PlayerState): InventoryService {
  const normalizeQuantity = (q: number | undefined): number => {
    const n = q ?? 1;
    if (!Number.isFinite(n) || n <= 0) {
      return 1;
    }
    return Math.floor(n);
  };

  return {
    tryAddItem(itemId: string, quantity?: number): TryAddItemResult {
      const q = normalizeQuantity(quantity);
      const stacks = playerState.inventory;

      const existing = stacks.find((s) => s.itemId === itemId);
      if (existing) {
        if (existing.quantity + q <= INVENTORY.STACK_CAP) {
          existing.quantity += q;
          return { ok: true };
        }
        return { ok: false, reason: "stack_cap" };
      }

      if (stacks.length >= INVENTORY.MAX_SLOTS) {
        return { ok: false, reason: "inventory_full" };
      }

      if (q > INVENTORY.STACK_CAP) {
        return { ok: false, reason: "stack_cap" };
      }

      stacks.push({ itemId, quantity: q });
      return { ok: true };
    },

    removeItem(itemId: string, quantity?: number): boolean {
      const q = normalizeQuantity(quantity);
      const stacks = playerState.inventory;
      const idx = stacks.findIndex((s) => s.itemId === itemId);
      if (idx < 0) {
        return false;
      }
      const s = stacks[idx]!;
      if (s.quantity < q) {
        return false;
      }
      s.quantity -= q;
      if (s.quantity <= 0) {
        stacks.splice(idx, 1);
      }
      return true;
    },

    hasItem(itemId: string, minQuantity?: number): boolean {
      const need = normalizeQuantity(minQuantity);
      const s = playerState.inventory.find((x) => x.itemId === itemId);
      return (s?.quantity ?? 0) >= need;
    },

    getInventory(): readonly ItemStack[] {
      return playerState.inventory;
    },
  };
}

