/**
 * Telegram Web Apps: проверка initData (HMAC-SHA256 по документации TWA).
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Клиентский SaveData (позиция, HP) принимается как снимок клиентского состояния для MVP;
 * при авторитетном сервере канон игрового мира — на сервере, не этот JSON.
 */
const crypto = require("crypto");

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** @type {Map<string, { userId: string; expiresAt: number }>} */
const sessions = new Map();

function cleanupSessions() {
  const now = Date.now();
  for (const [k, v] of sessions.entries()) {
    if (v.expiresAt <= now) {
      sessions.delete(k);
    }
  }
}

/**
 * @param {string} initData
 * @param {string} botToken
 * @returns {{ ok: true, userId: string } | { ok: false, reason: string }}
 */
function verifyTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== "string" || !botToken) {
    return { ok: false, reason: "missing_init_or_token" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return { ok: false, reason: "no_hash" };
  }

  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push([key, value]);
  }
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculated !== hash) {
    return { ok: false, reason: "bad_signature" };
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    return { ok: false, reason: "no_user" };
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return { ok: false, reason: "bad_user_json" };
  }

  const id = user && user.id;
  if (typeof id !== "number" && typeof id !== "string") {
    return { ok: false, reason: "no_user_id" };
  }

  return { ok: true, userId: String(id) };
}

/**
 * @param {string} userId
 * @returns {string} session token
 */
function createSession(userId) {
  cleanupSessions();
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

/**
 * @param {string} token
 * @returns {string | null} userId
 */
function getUserIdForSession(token) {
  if (!token) return null;
  cleanupSessions();
  const s = sessions.get(token);
  if (!s || s.expiresAt <= Date.now()) {
    if (s) sessions.delete(token);
    return null;
  }
  return s.userId;
}

/** Express middleware: Authorization: Bearer <token> → req.telegramUserId */
function requireTelegramSession(req, res, next) {
  const h = req.headers.authorization;
  if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "auth_required" });
    return;
  }
  const token = h.slice("Bearer ".length).trim();
  const userId = getUserIdForSession(token);
  if (!userId) {
    res.status(401).json({ ok: false, error: "invalid_session" });
    return;
  }
  req.telegramUserId = userId;
  next();
}

module.exports = {
  verifyTelegramInitData,
  createSession,
  getUserIdForSession,
  requireTelegramSession,
};
