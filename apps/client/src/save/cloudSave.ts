import type { World } from "bitecs";
import { ITEMS } from "../constants/gameBalance";
import { Health, Position } from "../ecs/components";
import type { PlayerState } from "../state/playerState";

/** Синхронно с сервером `saveStore.SAVE_SCHEMA_VERSION`. */
export const SAVE_SCHEMA_VERSION = 1;

export type SaveItemStack = { itemId: string; quantity: number };

export type SaveData = {
  version: number;
  position: { x: number; y: number };
  health: { current: number; max: number };
  inventory: SaveItemStack[];
  gold: number;
  timestamp: string;
};

function goldFromInventory(inv: readonly SaveItemStack[]): number {
  const g = inv.find((s) => s.itemId === ITEMS.GOLD);
  return g?.quantity ?? 0;
}

export function applyLoadedSave(
  world: World,
  playerEid: number,
  playerState: PlayerState,
  save: SaveData
): void {
  Position.x[playerEid] = save.position.x;
  Position.y[playerEid] = save.position.y;
  const maxHp = save.health.max;
  const cur = Math.min(save.health.current, maxHp);
  Health.max[playerEid] = maxHp;
  Health.current[playerEid] = Math.max(0, cur);
  playerState.inventory.length = 0;
  for (const s of save.inventory) {
    playerState.inventory.push({ itemId: s.itemId, quantity: s.quantity });
  }
}

export function buildSaveData(
  world: World,
  playerEid: number,
  playerState: PlayerState
): SaveData {
  const inventory = playerState.inventory.map((s) => ({
    itemId: s.itemId,
    quantity: s.quantity,
  }));
  return {
    version: SAVE_SCHEMA_VERSION,
    position: {
      x: Position.x[playerEid] ?? 0,
      y: Position.y[playerEid] ?? 0,
    },
    health: {
      current: Health.current[playerEid] ?? 0,
      max: Health.max[playerEid] ?? 0,
    },
    inventory,
    gold: goldFromInventory(inventory),
    timestamp: new Date().toISOString(),
  };
}

export function isValidLoadedSave(x: unknown): x is SaveData {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== SAVE_SCHEMA_VERSION) return false;
  const pos = o.position;
  if (!pos || typeof pos !== "object") return false;
  const p = pos as Record<string, unknown>;
  if (typeof p.x !== "number" || typeof p.y !== "number") return false;
  const h = o.health;
  if (!h || typeof h !== "object") return false;
  const hp = h as Record<string, unknown>;
  if (typeof hp.current !== "number" || typeof hp.max !== "number") return false;
  if (!Array.isArray(o.inventory)) return false;
  for (const row of o.inventory) {
    if (!row || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    if (typeof r.itemId !== "string" || typeof r.quantity !== "number") return false;
  }
  if (typeof o.gold !== "number") return false;
  if (typeof o.timestamp !== "string") return false;
  return true;
}

export type CloudSession = {
  sessionToken: string;
  save: SaveData | null;
};

const MIN_SAVE_INTERVAL_MS = 5000;
const PERIODIC_SAVE_MS = 30000;

export type CloudSaveController = {
  markDirty(): void;
  dispose(): void;
};

/**
 * Автосейв: debounce минимум 5 с между POST; раз в 30 с при наличии изменений.
 */
export function createCloudSaveController(args: {
  getSessionToken: () => string | null;
  build: () => SaveData;
}): CloudSaveController {
  const { getSessionToken, build } = args;
  let dirty = false;
  let lastPostAt = 0;
  let inflight = false;

  const tryPost = async (): Promise<void> => {
    const token = getSessionToken();
    if (!token || !dirty) {
      return;
    }
    if (inflight) {
      return;
    }
    const now = Date.now();
    if (now - lastPostAt < MIN_SAVE_INTERVAL_MS) {
      return;
    }
    inflight = true;
    lastPostAt = now;
    const body = build();
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        dirty = true;
        return;
      }
      dirty = false;
    } catch {
      dirty = true;
    } finally {
      inflight = false;
    }
  };

  const intervalId = window.setInterval(() => {
    void tryPost();
  }, PERIODIC_SAVE_MS);

  let rafId = 0;
  const rafLoop = (): void => {
    void tryPost();
    rafId = requestAnimationFrame(rafLoop);
  };
  rafId = requestAnimationFrame(rafLoop);

  return {
    markDirty(): void {
      dirty = true;
    },
    dispose(): void {
      window.clearInterval(intervalId);
      cancelAnimationFrame(rafId);
    },
  };
}

export async function authenticateAndLoadSave(): Promise<CloudSession | null> {
  const initData = window.Telegram?.WebApp?.initData ?? "";
  if (!initData) {
    return null;
  }

  const authRes = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  if (!authRes.ok) {
    if (import.meta.env.DEV) {
      console.warn("[cloudSave] /api/auth failed", authRes.status);
    }
    return null;
  }
  const auth = (await authRes.json()) as {
    ok?: boolean;
    sessionToken?: string;
  };
  if (!auth.ok || typeof auth.sessionToken !== "string") {
    return null;
  }

  const loadRes = await fetch("/api/load", {
    headers: { Authorization: `Bearer ${auth.sessionToken}` },
  });
  if (!loadRes.ok) {
    return { sessionToken: auth.sessionToken, save: null };
  }
  const load = (await loadRes.json()) as { empty?: true } | SaveData;
  if (load && typeof load === "object" && "empty" in load && load.empty === true) {
    return { sessionToken: auth.sessionToken, save: null };
  }
  if (!isValidLoadedSave(load)) {
    return { sessionToken: auth.sessionToken, save: null };
  }
  return { sessionToken: auth.sessionToken, save: load };
}
