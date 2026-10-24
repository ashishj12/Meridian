import { chromium } from "@playwright/test";
import fs from "node:fs";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3001";
fs.mkdirSync("public/product-previews", { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await context.request.post(`${baseURL}/api/simulation/control`, {
    data: { action: "reset" },
  });
  const page = await context.newPage();
  for (const role of ["admin", "retailer", "media", "airline", "passenger"]) {
    await page.goto(`${baseURL}/${role}`);
    await page.locator("h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (role === "passenger") {
      await page
        .locator(".campaign-headline")
        .filter({ hasText: "Big adventures." })
        .waitFor();
      await page
        .locator(".campaign-photography")
        .evaluate((img) => img.decode());
      await page
        .locator(".physical-frame")
        .screenshot({ path: `public/product-previews/${role}.png` });
    } else
      await page.screenshot({ path: `public/product-previews/${role}.png` });
    console.log(`Saved actual ${role} application preview`);
  }
  await context.request.post(`${baseURL}/api/simulation/control`, {
    data: { action: "reset" },
  });
} finally {
  await browser.close();
}
