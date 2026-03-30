import { ITEM_DEFS, type ItemId } from "../data/itemDefs";
import { ITEMS, POTION_HP } from "../constants/gameBalance";
import type { InventoryService } from "../state/inventoryService";
import type { World } from "bitecs";
import { Health } from "../ecs/components";
import { sendPlayerEvent, PlayerEventType } from "../protocol";
import { getItemIconFramePx } from "../render/itemAtlas";

type InventoryOverlay = {
  isOpen(): boolean;
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
  refresh(): void;
};

function makeIconEl(itemId: ItemId): HTMLDivElement {
  const frame = getItemIconFramePx(ITEM_DEFS[itemId].iconId);
  const el = document.createElement("div");
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.borderRadius = "8px";
  el.style.backgroundImage = "url(/assets/icons/items.png)";
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
  el.style.backgroundSize = "512px 576px"; // 16 cols * 32px, 18 rows * 32px
  el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)";
  return el;
}

export function createInventoryOverlay(args: {
  inventoryService: InventoryService;
  ecsWorld: World;
  playerEid: number;
  getPlayerMaxHp: () => number;
  onInventoryMutated?: () => void;
}): InventoryOverlay {
  const { inventoryService, ecsWorld, playerEid, getPlayerMaxHp, onInventoryMutated } =
    args;

  const overlay = document.createElement("div");
  overlay.id = "inventory-overlay";
  overlay.style.display = "none";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "20";
  overlay.style.background = "rgba(10, 10, 20, 0.72)";
  overlay.style.pointerEvents = "auto";
  overlay.style.touchAction = "none";

  const panel = document.createElement("div");
  panel.style.position = "absolute";
  panel.style.left = "50%";
  panel.style.top = "50%";
  panel.style.transform = "translate(-50%, -50%)";
  panel.style.width = "min(92vw, 420px)";
  panel.style.maxHeight = "min(76vh, 520px)";
  panel.style.overflow = "auto";
  panel.style.borderRadius = "16px";
  panel.style.padding = "14px";
  panel.style.background = "rgba(22, 22, 38, 0.96)";
  panel.style.border = "1px solid rgba(255,255,255,0.08)";
  panel.style.boxShadow = "0 18px 50px rgba(0,0,0,0.55)";
  panel.style.font = "600 14px/1.3 system-ui, sans-serif";
  panel.style.color = "#e8e8ef";

  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.justifyContent = "space-between";
  titleRow.style.gap = "12px";

  const title = document.createElement("div");
  title.textContent = "Inventory";
  title.style.font = "800 18px/1.1 system-ui, sans-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.padding = "8px 10px";
  closeBtn.style.borderRadius = "10px";
  closeBtn.style.border = "1px solid rgba(255,255,255,0.12)";
  closeBtn.style.background = "rgba(255,255,255,0.06)";
  closeBtn.style.color = "#e8e8ef";
  closeBtn.style.cursor = "pointer";

  titleRow.appendChild(title);
  titleRow.appendChild(closeBtn);

  const list = document.createElement("div");
  list.style.marginTop = "12px";
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "10px";

  const hint = document.createElement("div");
  hint.textContent = "Tap outside the panel to close.";
  hint.style.marginTop = "12px";
  hint.style.opacity = "0.7";
  hint.style.fontWeight = "500";

  panel.appendChild(titleRow);
  panel.appendChild(list);
  panel.appendChild(hint);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  let open = false;

  const close = (): void => {
    open = false;
    overlay.style.display = "none";
  };

  const openOverlay = (): void => {
    open = true;
    overlay.style.display = "block";
    refresh();
  };

  const toggle = (): void => {
    if (open) close();
    else openOverlay();
  };

  const refresh = (): void => {
    list.innerHTML = "";
    const inv = inventoryService.getInventory();
    if (inv.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "Empty.";
      empty.style.opacity = "0.8";
      empty.style.fontWeight = "600";
      list.appendChild(empty);
      return;
    }

    for (const stack of inv) {
      const itemId = stack.itemId as ItemId;
      const def = ITEM_DEFS[itemId];
      if (!def) {
        continue;
      }

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.gap = "10px";
      row.style.padding = "10px";
      row.style.borderRadius = "12px";
      row.style.background = "rgba(255,255,255,0.04)";
      row.style.border = "1px solid rgba(255,255,255,0.06)";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "10px";

      const icon = makeIconEl(itemId);
      const text = document.createElement("div");
      text.textContent = `${def.name} x ${stack.quantity}`;
      text.style.fontWeight = "700";

      left.appendChild(icon);
      left.appendChild(text);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "8px";

      if (def.usable) {
        const useBtn = document.createElement("button");
        useBtn.textContent = "Use";
        useBtn.style.padding = "8px 10px";
        useBtn.style.borderRadius = "10px";
        useBtn.style.border = "0";
        useBtn.style.cursor = "pointer";
        useBtn.style.font = "800 13px/1 system-ui, sans-serif";
        useBtn.style.background = "#ef4444";
        useBtn.style.color = "#fff";

        useBtn.addEventListener("click", () => {
          if (!inventoryService.removeItem(itemId, 1)) {
            refresh();
            return;
          }

          if (itemId === ITEMS.POTION_HP) {
            const maxHp = getPlayerMaxHp();
            const cur = Health.current[playerEid] ?? 0;
            const next = Math.min(maxHp, cur + POTION_HP.HEAL_AMOUNT);
            Health.current[playerEid] = next;
          }

          sendPlayerEvent({
            type: PlayerEventType.USE_ITEM,
            payload: { itemId },
          });

          onInventoryMutated?.();
          refresh();
        });

        right.appendChild(useBtn);
      }

      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    }
  };

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      close();
    }
  });

  return {
    isOpen: () => open,
    open: openOverlay,
    close,
    toggle,
    destroy: () => {
      overlay.remove();
    },
    refresh,
  };
}

