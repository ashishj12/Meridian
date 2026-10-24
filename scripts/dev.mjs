import { spawn } from "node:child_process";
import "dotenv/config";

const children = [
  spawn(process.execPath, ["apps/api/src/server.mjs"], { stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
  }),
];
for (const c of children)
  c.on("exit", (code) => {
    if (code) process.exitCode = code;
  });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    children.forEach((c) => c.kill());
    process.exit();
  });
