const fs = require("fs/promises");
const path = require("path");

/** Текущая версия схемы сейва (run-22). При смене — см. migrateSave в TODO. */
const SAVE_SCHEMA_VERSION = 1;

const DEFAULT_SAVE_DIR = path.join(process.cwd(), "data", "saves");

function saveDir() {
  const raw = process.env.SAVE_DATA_DIR;
  if (!raw) return DEFAULT_SAVE_DIR;
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

function pathForUser(userId) {
  const safe = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(saveDir(), `${safe}.json`);
}

/**
 * Лёгкая валидация тела сохранения (не античит: сейв всё равно от аутентифицированного пользователя).
 * @param {unknown} body
 * @returns {{ ok: true, data: object } | { ok: false, reason: string }}
 */
function validateSaveBody(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "not_object" };
  }
  const o = /** @type {Record<string, unknown>} */ (body);
  if (typeof o.version !== "number" || !Number.isFinite(o.version)) {
    return { ok: false, reason: "bad_version" };
  }
  const pos = o.position;
  if (!pos || typeof pos !== "object") {
    return { ok: false, reason: "bad_position" };
  }
  const p = /** @type {Record<string, unknown>} */ (pos);
  if (typeof p.x !== "number" || typeof p.y !== "number") {
    return { ok: false, reason: "bad_position_xy" };
  }
  const hp = o.health;
  if (!hp || typeof hp !== "object") {
    return { ok: false, reason: "bad_health" };
  }
  const h = /** @type {Record<string, unknown>} */ (hp);
  if (typeof h.current !== "number" || typeof h.max !== "number") {
    return { ok: false, reason: "bad_health_fields" };
  }
  if (!Array.isArray(o.inventory)) {
    return { ok: false, reason: "bad_inventory" };
  }
  for (const row of o.inventory) {
    if (!row || typeof row !== "object") {
      return { ok: false, reason: "bad_inventory_row" };
    }
    const r = /** @type {Record<string, unknown>} */ (row);
    if (typeof r.itemId !== "string" || typeof r.quantity !== "number") {
      return { ok: false, reason: "bad_stack" };
    }
  }
  if (typeof o.gold !== "number" || !Number.isFinite(o.gold)) {
    return { ok: false, reason: "bad_gold" };
  }
  if (typeof o.timestamp !== "string") {
    return { ok: false, reason: "bad_timestamp" };
  }
  return { ok: true, data: o };
}

/**
 * TODO(run-22 / фаза 5): при bump SAVE_SCHEMA_VERSION — миграции старых файлов.
 * @param {object} parsed
 * @returns {object | null}
 */
function migrateSave(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const v = /** @type {{ version?: number }} */ (parsed).version;
  if (v !== SAVE_SCHEMA_VERSION) {
    return null;
  }
  return parsed;
}

async function ensureDir() {
  await fs.mkdir(saveDir(), { recursive: true });
}

/**
 * @param {string} userId
 * @returns {Promise<{ empty: true } | { empty: false, save: object }>}
 */
async function loadSave(userId) {
  const fp = pathForUser(userId);
  try {
    const raw = await fs.readFile(fp, "utf8");
    const parsed = JSON.parse(raw);
    const migrated = migrateSave(parsed);
    if (!migrated) {
      return { empty: true };
    }
    return { empty: false, save: migrated };
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === "ENOENT") {
      return { empty: true };
    }
    throw e;
  }
}

/**
 * @param {string} userId
 * @param {object} save validated object
 */
async function writeSave(userId, save) {
  await ensureDir();
  const fp = pathForUser(userId);
  const tmp = `${fp}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(save, null, 2), "utf8");
  await fs.rename(tmp, fp);
}

module.exports = {
  SAVE_SCHEMA_VERSION,
  validateSaveBody,
  loadSave,
  writeSave,
};
