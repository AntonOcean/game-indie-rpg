import type { ItemIconId } from "../render/itemAtlas";

export type ItemDef = {
  id: string;
  name: string;
  iconId: ItemIconId;
  stackable: boolean;
  maxStack: number;
  usable: boolean;
};

export const ITEM_DEFS = {
  gold: {
    id: "gold",
    name: "Gold",
    iconId: "gold",
    stackable: true,
    maxStack: 999,
    usable: false,
  },
  potion_hp: {
    id: "potion_hp",
    name: "Health Potion",
    iconId: "potion_hp",
    stackable: true,
    maxStack: 10,
    usable: true,
  },
} as const satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof ITEM_DEFS;

