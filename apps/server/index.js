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

app.use(express.static(dist));

app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`server listening on http://0.0.0.0:${port} (static from ${dist})`);
});
