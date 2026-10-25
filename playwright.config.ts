import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const e2eDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-e2e-"));
const port = Number(process.env.MERIDIAN_E2E_PORT) || 3101;
const baseURL = `http://127.0.0.1:${port}`;

process.on("exit", () => {
  const target = path.resolve(e2eDirectory);
  if (
    path.dirname(target) === path.resolve(os.tmpdir()) &&
    path.basename(target).startsWith("meridian-e2e-")
  )
    fs.rmSync(target, { recursive: true, force: true });
});

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "node scripts/start.mjs",
    url: `${baseURL}/api/health`,
    env: {
      DB_PATH: path.join(e2eDirectory, "meridian.sqlite"),
      PORT: String(port),
      PUBLIC_PORT: String(port),
    },
    reuseExistingServer: false,
    timeout: 120000,
  },
});
