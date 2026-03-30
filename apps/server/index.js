const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const {
  verifyTelegramInitData,
  createSession,
  requireTelegramSession,
} = require("./auth");
const {
  SAVE_SCHEMA_VERSION,
  validateSaveBody,
  loadSave,
  writeSave,
} = require("./saveStore");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

const defaultDist = path.join(__dirname, "..", "client", "dist");

function resolveDist() {
  const raw = process.env.CLIENT_DIST_PATH;
  if (!raw) return defaultDist;
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

const dist = resolveDist();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth", (req, res) => {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken || typeof botToken !== "string") {
    res.status(503).json({ ok: false, error: "bot_token_missing" });
    return;
  }

  const initData = req.body && req.body.initData;
  const v = verifyTelegramInitData(
    typeof initData === "string" ? initData : "",
    botToken
  );

  if (!v.ok) {
    res.status(401).json({ ok: false, error: v.reason || "unauthorized" });
    return;
  }

  const sessionToken = createSession(v.userId);
  res.json({ ok: true, userId: v.userId, sessionToken });
});

app.get("/api/load", requireTelegramSession, async (req, res) => {
  try {
    const r = await loadSave(req.telegramUserId);
    if (r.empty) {
      res.json({ empty: true });
      return;
    }
    res.json(r.save);
  } catch (err) {
    console.error("loadSave", err);
    res.status(500).json({ ok: false, error: "load_failed" });
  }
});

app.post("/api/save", requireTelegramSession, async (req, res) => {
  /**
   * MVP: сохраняем JSON как прислал клиент. Это не античит: позиция/HP — снимок
   * клиент-authorитет игры; при серверной симуляции канон будет на сервере.
   */
  const checked = validateSaveBody(req.body);
  if (!checked.ok) {
    res.status(400).json({ ok: false, error: checked.reason });
    return;
  }
  if (checked.data.version !== SAVE_SCHEMA_VERSION) {
    res.status(400).json({ ok: false, error: "unsupported_save_version" });
    return;
  }
  try {
    await writeSave(req.telegramUserId, checked.data);
    res.json({ ok: true });
  } catch (err) {
    console.error("writeSave", err);
    res.status(500).json({ ok: false, error: "save_failed" });
  }
});

app.use(express.static(dist));

app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`server listening on http://0.0.0.0:${port} (static from ${dist})`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `game-rpg-server: port ${port} is already in use (EADDRINUSE).\n` +
        `  Stop the other process, or set PORT in .env (e.g. PORT=3001).\n` +
        `  From repo root: make stop   (frees the port from your .env)\n` +
        `  Or inspect: lsof -nP -iTCP:${port} -sTCP:LISTEN`
    );
    process.exit(1);
  }
  throw err;
});
