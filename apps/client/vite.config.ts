import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const port = Number(env.CLIENT_DEV_PORT || process.env.CLIENT_DEV_PORT || 5173);
  const host = env.CLIENT_DEV_HOST || process.env.CLIENT_DEV_HOST || "0.0.0.0";
  const apiTarget =
    env.VITE_API_PROXY_TARGET ||
    process.env.VITE_API_PROXY_TARGET ||
    `http://127.0.0.1:${process.env.PORT || 3000}`;

  return {
    root: __dirname,
    envDir: repoRoot,
    server: {
      port,
      host,
      proxy: {
        "/api": apiTarget,
        "/health": apiTarget,
      },
    },
  };
});
