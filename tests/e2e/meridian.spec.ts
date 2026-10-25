import { test, expect } from "@playwright/test";
import fs from "node:fs";
test("60x evaluates all slots while the dashboard remains interactive", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "60×", exact: true }).click();
  await page
    .getByRole("button", { name: "Play simulation", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/simulation/state")).json()).time,
    )
    .toBeGreaterThanOrEqual(Date.parse("2026-10-14T14:12:00Z"));
  const started = Date.now();
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play simulation", exact: true }),
  ).toBeVisible();
  expect(Date.now() - started).toBeLessThan(2000);
  const state = await (await request.get("/api/state")).json();
  expect(state.metrics.plays).toBeGreaterThanOrEqual(1000);
  console.log(`60x pause interaction ${Date.now() - started} ms`);
});
test.beforeEach(async ({ request }) => {
  const r = await request.post("/api/simulation/control", {
    data: { action: "reset" },
  });
  expect(r.ok()).toBeTruthy();
});
test("delay changes all role state and a phone claim updates retailer analytics", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Network overview", exact: true }),
  ).toBeVisible();
  const passenger = await context.newPage();
  await passenger.goto("/passenger");
  await expect(
    passenger.getByRole("heading", {
      name: "Big adventures. Little explorers.",
    }),
  ).toBeVisible();
  const started = Date.now();
  await page.getByRole("button", { name: "+45m XY501", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /\d+ passengers in catchment/ }),
  ).toBeVisible();
  const elapsed = Date.now() - started;
  expect(elapsed).toBeLessThan(2000);
  console.log(`Browser delay cascade ${elapsed} ms`);
  await expect(
    passenger.getByRole("heading", {
      name: "Your journey. A little more extraordinary.",
    }),
  ).toBeVisible();
  await passenger
    .getByRole("button", { name: "Why this ad?", exact: true })
    .click();
  await expect(
    passenger
      .getByRole("dialog", { name: "Why this ad?", exact: true })
      .locator(".player-candidate strong"),
  ).toHaveText([
    /^0\.(?:84|85|86|87|88)$/,
    /^0\.5(?:0|1|2|3|4)$/,
    /^0\.(?:19|20|21|22|23)$/,
  ]);
  const href = await passenger
    .getByRole("link", { name: "Open mobile offer claim" })
    .getAttribute("href");
  const claim = await context.newPage();
  await claim.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
    Object.defineProperty(navigator, "share", { value: undefined });
  });
  await claim.goto(href!);
  await expect(
    claim.getByRole("button", { name: "Claim my offer", exact: true }),
  ).toBeVisible();
  await claim
    .getByRole("button", { name: "Claim my offer", exact: true })
    .click();
  await expect(
    claim.getByRole("button", { name: "Offer claimed ✓", exact: true }),
  ).toBeDisabled();
  const metricsBefore = await (
    await request.get("/api/analytics/retailer?outletId=O1")
  ).json();
  await claim
    .getByRole("button", { name: "Use offer · demo redemption", exact: true })
    .click();
  await expect(
    claim.getByRole("button", { name: "Redeemed ✓", exact: true }),
  ).toBeDisabled();
  await claim
    .getByRole("button", {
      name: "Share a second code with family",
      exact: true,
    })
    .click();
  await expect(
    claim.getByLabel("Family offer link", { exact: true }),
  ).toHaveValue(/\/claim\/[0-9a-f]{48}$/);
  const metrics = await (
    await request.get("/api/analytics/retailer?outletId=O1")
  ).json();
  expect(metrics.redemptions).toBe(metricsBefore.redemptions + 1);
  expect(metrics.revenue).toBe(metricsBefore.revenue + 24);
  await page.getByLabel("Role", { exact: true }).selectOption("retailer");
  await expect(
    page.getByText(`$${metricsBefore.revenue + 24}`, { exact: true }),
  ).toBeVisible();
  await passenger.close();
  await claim.close();
});
test("campaign builder saves, approval changes eligibility, duplicate enters queue", async ({
  page,
  request,
}) => {
  await page.goto("/retailer");
  await page
    .getByRole("button", { name: "Create campaign", exact: true })
    .click();
  await page
    .getByLabel("Campaign name", { exact: true })
    .fill("Browser lifecycle campaign");
  await page
    .getByLabel("Headline", { exact: true })
    .fill("A better gate-side moment.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit for approval", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("submitted");
  await page.getByLabel("Role", { exact: true }).selectOption("media");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  const card = page
    .locator(".approval-card")
    .filter({ hasText: "Browser lifecycle campaign" });
  await expect(card).toBeVisible();
  await page.getByLabel("Brand safety checklist complete").check();
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(card).toHaveCount(0);
  const campaigns = await (await request.get("/api/campaigns")).json();
  const c = campaigns.find((c: any) => c.name === "Browser lifecycle campaign");
  expect(c.status).toBe("approved");
  const duplicate = await request.post(
    "/api/campaigns/" + c.id + "/duplicate",
    { data: {} },
  );
  expect((await duplicate.json()).status).toBe("pending");
});
test("offline creative assistant, inventory booking and evidence fallback are functional", async ({
  page,
  request,
}) => {
  await page.goto("/retailer");
  await page
    .getByRole("button", { name: "Library & history", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate template", exact: true })
    .click();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    "A sweeter start to your journey.",
  );
  await page
    .getByRole("button", { name: "Save creative to library", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.getByLabel("Role", { exact: true }).selectOption("media");
  const book = page.getByRole("button", { name: /Book for/ }).first();
  await expect(book).toBeVisible();
  const bookingsBefore = await (await request.get("/api/inventory")).json();
  await book.click();
  await expect(page.getByRole("status")).toContainText("booked");
  const bookings = await (await request.get("/api/inventory")).json();
  expect(bookings.bookings.length).toBe(bookingsBefore.bookings.length + 1);
  await page.getByLabel("Role", { exact: true }).selectOption("admin");
  await page
    .getByRole("button", { name: "Decision intelligence", exact: true })
    .click();
  await page.getByRole("button", { name: "stale", exact: true }).click();
  await expect(
    page
      .getByText("Evidence validation failed: stale", { exact: true })
      .first(),
  ).toBeVisible();
  const decision = await (
    await request.get("/api/screens/S124/decision")
  ).json();
  expect(decision.campaignId).toBeNull();
  expect(decision.validated).toBeFalsy();
});
test("1440/1920 desktop, Hindi, keyboard, reduced motion and mobile claim screenshots", async ({
  page,
  request,
}) => {
  fs.mkdirSync("artifacts/screenshots/screenshots", { recursive: true });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Network overview", exact: true }),
  ).toBeVisible();
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/screenshots/screenshots/admin-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "नेटवर्क अवलोकन", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("ऑनलाइन स्क्रीन", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/screenshots/hindi-1440.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement?.tagName !== "BODY"),
  ).toBeTruthy();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => getComputedStyle(document.querySelector("main")!).animationName,
    ),
  ).toBe("none");
  for (const role of ["retailer", "media", "airline", "passenger"]) {
    await page.getByLabel("Role", { exact: true }).selectOption(role);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/screenshots/screenshots/${role}-1440.png`,
      fullPage: true,
    });
  }
  const d = await (await request.get("/api/screens/S124/decision")).json();
  await page.goto("/claim/" + d.promo.id);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Claim my offer", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "artifacts/screenshots/screenshots/claim-mobile.png",
    fullPage: true,
  });
});
