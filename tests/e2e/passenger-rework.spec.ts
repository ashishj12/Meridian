import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { PNG } from "pngjs";
import jsQR from "jsqr";
const out = "artifacts/screenshots/passenger-rework";
test.beforeEach(async ({ request }) => {
  fs.mkdirSync(out, { recursive: true });
  const response = await request.post("/api/simulation/control", {
    data: { action: "reset" },
  });
  expect(response.ok()).toBeTruthy();
});
async function ready(page: any) {
  await expect(page.locator(".campaign-headline")).toContainText(
    "Big adventures. Little explorers.",
  );
  await expect
    .poll(() =>
      page
        .locator(".campaign-photography")
        .evaluate((el: any) => el.complete && el.naturalWidth > 0),
    )
    .toBeTruthy();
  await page.evaluate(() => document.fonts.ready);
}
async function decodeQR(page: any) {
  const png = PNG.sync.read(await page.locator(".redemption-qr").screenshot());
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, {
    inversionAttempts: "dontInvert",
  });
  expect(decoded, "Actual displayed QR must decode").toBeTruthy();
  expect(decoded!.data).toMatch(/^http[s]?:\/\/.+\/claim\/[0-9a-f]{48}$/);
  return { url: decoded!.data, width: png.width, height: png.height };
}
test("Screen Studio uses the viewport, genuine campaign artwork, readable type and a decodable QR", async ({
  page,
}) => {
  const measurements = [];
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/passenger");
    await ready(page);
    await expect(
      page.getByRole("heading", { name: "Passenger displays", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".sidebar")).toHaveCount(0);
    const frame = await page.locator(".physical-frame").boundingBox();
    const layout = await page.locator(".studio-layout").boundingBox();
    expect(frame!.width / frame!.height).toBeCloseTo(16 / 9, 2);
    expect(frame!.width / layout!.width).toBeGreaterThan(0.75);
    expect(frame!.width / layout!.width).toBeLessThan(0.86);
    expect(
      await page
        .locator(".campaign-headline")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(90);
    expect(
      await page
        .locator(".studio-heading>div>span")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(15);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const qr = await decodeQR(page);
    expect(
      (await page.locator(".redemption-qr img").boundingBox())!.width,
    ).toBeGreaterThanOrEqual(160);
    await expect(page.locator(".player-departures")).toContainText("SCHEDULED");
    await expect(page.locator(".player-departures")).toContainText("ESTIMATED");
    await expect(page.locator(".player-departures")).toContainText("GATE 42");
    await page.screenshot({
      path: `${out}/studio-${width}x${height}.png`,
      fullPage: true,
    });
    measurements.push({
      width,
      height,
      frame,
      previewShare: frame!.width / layout!.width,
      qr,
    });
  }
  await page.getByLabel("Art direction").selectOption("postcards");
  await expect(page.locator(".campaign-photography")).toHaveAttribute(
    "src",
    "/campaign-art/little-orbit-postcards.png",
  );
  await expect
    .poll(() =>
      page
        .locator(".campaign-photography")
        .evaluate((el: any) => el.complete && el.naturalWidth > 0),
    )
    .toBeTruthy();
  await page.screenshot({
    path: `${out}/postcards-1920x1080.png`,
    fullPage: true,
  });
  fs.writeFileSync(
    `${out}/visual-measurements.json`,
    JSON.stringify(measurements, null, 2),
  );
});
test("Immersive landscape and portrait retain physical ratio, legible flights and large QR", async ({
  page,
}) => {
  for (const [width, height, portrait] of [
    [1440, 900, false],
    [1920, 1080, false],
    [1080, 1920, true],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/passenger");
    await ready(page);
    if (portrait)
      await page
        .getByRole("button", { name: "Portrait orientation", exact: true })
        .click();
    await page
      .getByRole("button", {
        name: "Fullscreen passenger display",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("immersive-stage")).toBeVisible();
    await expect(page.locator(".studio-navigation")).toBeHidden();
    const stage = await page.getByTestId("immersive-stage").boundingBox();
    expect(stage!.width).toBe(width);
    expect(stage!.height).toBe(height);
    const frame = await page.locator(".physical-frame").boundingBox();
    expect(frame!.width / frame!.height).toBeCloseTo(
      portrait ? 9 / 16 : 16 / 9,
      2,
    );
    expect(frame!.height).toBeLessThanOrEqual(height + 1);
    expect(frame!.width).toBeLessThanOrEqual(width + 1);
    expect(
      (await page.locator(".redemption-qr img").boundingBox())!.width,
    ).toBeGreaterThanOrEqual(160);
    await decodeQR(page);
    await page.mouse.move(0, height - 1);
    await page.screenshot({ path: `${out}/immersive-${width}x${height}.png` });
    await page
      .getByRole("button", { name: "Exit fullscreen", exact: true })
      .focus();
    await page
      .getByRole("button", { name: "Exit fullscreen", exact: true })
      .click();
    await expect(page.locator(".studio-navigation")).toBeVisible();
  }
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page
    .getByRole("button", { name: "Portrait orientation", exact: true })
    .click();
  await page.screenshot({
    path: `${out}/studio-portrait-1080x1920.png`,
    fullPage: true,
  });
});
test("Live selection, evidence, screen switching and mobile redemption survive the redesign", async ({
  page,
  context,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/passenger");
  await ready(page);
  await page.getByRole("button", { name: "Inject XY501 delay" }).click();
  await expect(page.locator(".campaign-headline")).toHaveText(
    "Your journey. A little more extraordinary.",
  );
  await expect(page.locator(".campaign-photography")).toHaveAttribute(
    "src",
    "/campaign-art/aurelia-atelier.png",
  );
  await expect(page.locator(".player-departures")).toContainText("Delayed");
  await page.locator(".player-why").click();
  const explanation = page.getByRole("dialog", {
    name: "Why this ad?",
    exact: true,
  });
  await expect(explanation.getByText("0.86", { exact: true })).toBeVisible();
  await expect(explanation.getByText("0.52", { exact: true })).toBeVisible();
  await expect(explanation.getByText("0.21", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `${out}/evidence-1440x900.png`,
    fullPage: true,
  });
  await explanation.getByRole("button", { name: "Close explanation" }).click();
  await page.screenshot({
    path: `${out}/atelier-1440x900.png`,
    fullPage: true,
  });
  const url = await page
    .getByRole("link", { name: "Open mobile offer claim" })
    .getAttribute("href");
  const phone = await context.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(url!);
  await expect(
    phone.getByRole("button", { name: "Claim my offer", exact: true }),
  ).toBeVisible();
  await phone.screenshot({ path: `${out}/claim-390x844.png`, fullPage: true });
  expect(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await phone
    .getByRole("button", { name: "Claim my offer", exact: true })
    .click();
  await phone
    .getByRole("button", { name: "Use offer · demo redemption", exact: true })
    .click();
  await expect(
    phone.getByRole("button", { name: "Redeemed ✓", exact: true }),
  ).toBeDisabled();
  expect(
    (await (await request.get("/api/analytics/retailer?outletId=O1")).json())
      .revenue,
  ).toBe(24);
  await phone.close();
  await page
    .getByLabel("Physical screen", { exact: true })
    .selectOption("S012");
  await expect(
    page.getByRole("heading", { name: "Temporarily offline." }),
  ).toBeVisible();
  await page
    .getByLabel("Physical screen", { exact: true })
    .selectOption("S124");
  await expect(page.locator(".campaign-headline")).toHaveText(
    "Your journey. A little more extraordinary.",
  );
  await request.post("/api/simulation/events", {
    data: { type: "gate-change", flightId: "XY501", gate: "48" },
  });
  await expect(page.locator(".campaign-headline")).toHaveText(
    "Big adventures. Little explorers.",
  );
});

test("Immersive fallback keeps live campaign and clock updates and exits with Escape", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/passenger");
  await ready(page);
  await page.evaluate(() => {
    HTMLElement.prototype.requestFullscreen = () =>
      Promise.reject(new Error("Fullscreen blocked for fallback verification"));
  });
  await page
    .getByRole("button", { name: "Fullscreen passenger display", exact: true })
    .click();
  await expect(page.getByTestId("immersive-stage")).toBeVisible();
  await request.post("/api/simulation/events", {
    data: { type: "delay", flightId: "XY501", minutes: 45 },
  });
  await expect(page.locator(".campaign-headline")).toHaveText(
    "Your journey. A little more extraordinary.",
  );
  await expect(page.locator(".player-departures")).toContainText("Delayed");
  await decodeQR(page);
  await request.post("/api/simulation/control", {
    data: { action: "play", speed: 60 },
  });
  await expect(page.locator(".player-masthead time")).not.toHaveText("14:10");
  await request.post("/api/simulation/control", { data: { action: "pause" } });
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("immersive-stage")).toHaveCount(0);
  await expect(page.locator(".studio-navigation")).toBeVisible();
});
