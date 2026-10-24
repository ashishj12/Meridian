import fs from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import "dotenv/config";

if (!fs.existsSync("dist/index.html")) {
  const built = spawnSync(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "build"],
    { stdio: "inherit" },
  );
  if (built.status) process.exit(built.status);
}
process.env.PUBLIC_PORT = process.env.PUBLIC_PORT || process.env.PORT || "3001";
const server = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  stdio: "inherit",
  env: process.env,
});
server.on("exit", (code) => process.exit(code || 0));
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => server.kill(s));
