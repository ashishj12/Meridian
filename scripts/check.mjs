import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
const files = ["apps/api", "scripts", "tests"]
  .flatMap(walk)
  .filter((f) => f.endsWith(".mjs"));
for (const file of files) {
  const r = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (r.status) process.exit(r.status);
}
console.log(`Syntax checks passed for ${files.length} JavaScript modules.`);
