const path = require("path");
const express = require("express");

const app = express();
const port = Number(process.env.PORT || 3000);

const defaultDist = path.join(__dirname, "..", "client", "dist");

function resolveDist() {
  const raw = process.env.CLIENT_DIST_PATH;
  if (!raw) return defaultDist;
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

const dist = resolveDist();

app.get("/health", (_req, res) => {
  res.json({ ok: true });
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
