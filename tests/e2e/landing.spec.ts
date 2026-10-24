import { test, expect } from "@playwright/test";
import fs from "node:fs";
const out = "artifacts/screenshots/landing";
test.beforeEach(async ({ request }) => {
  fs.mkdirSync(out, { recursive: true });
  await request.post("/api/simulation/control", { data: { action: "reset" } });
});
test("Landing page is readable, complete and responsive at desktop and mobile sizes", async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [800, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Every airport signal.A better retail moment.",
    );
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator("img")
      .evaluateAll((imgs: any[]) =>
        imgs.forEach((img) => (img.loading = "eager")),
      );
    await expect
      .poll(() =>
        page
          .locator("img")
          .evaluateAll((imgs: any[]) =>
            imgs.every((img) => img.complete && img.naturalWidth > 0),
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("h1")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(40);
    await page.screenshot({
      path: `${out}/landing-${width}x${height}.png`,
      fullPage: true,
    });
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `${out}/landing-${width}x${height}-viewport.png`,
      });
    if (width === 1440)
      for (const id of ["how-it-works", "workspaces", "faq"])
        await page
          .locator(`#${id}`)
          .screenshot({ path: `${out}/section-${id}.png` });
  }
});
test("Workspace previews, illustrative scenario, FAQs and mobile navigation work", async ({
  page,
  request,
}) => {
  await page.goto("/");
  for (const [name, role] of [
    ["Retail", "retailer"],
    ["Media", "media"],
    ["Airlines", "airline"],
    ["Displays", "passenger"],
    ["Operations", "admin"],
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator(".product-window-image img")).toHaveAttribute(
      "src",
      `/product-previews/${role}.png`,
    );
    await expect(page.locator(".product-caption>a")).toHaveAttribute(
      "href",
      `/${role}`,
    );
  }
  const before = await (await request.get("/api/simulation/state")).json();
  await page.getByRole("tab", { name: "Operations", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Retail", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "45-minute delay", exact: true })
    .click();
  await expect(page.locator(".scenario-value").nth(1)).toContainText("420");
  await expect(page.locator(".scenario-campaign")).toContainText(
    "15% off fragrance",
  );
  await expect(page.locator(".scenario-campaign")).toContainText("0.86");
  await page
    .locator("#how-it-works")
    .screenshot({ path: `${out}/section-delay-example.png` });
  expect((await (await request.get("/api/simulation/state")).json()).time).toBe(
    before.time,
  );
  await page
    .locator(".faq-list summary")
    .filter({ hasText: "Can I try every workspace?" })
    .click();
  await expect(page.locator(".faq-list details[open]")).toContainText(
    "without an account",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: "FAQ", exact: true })
    .click();
  await expect(page).toHaveURL(/#faq$/);
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
});
test("The landing page and every workspace share the brand and real entry links", async ({
  page,
}) => {
  for (const role of ["admin", "retailer", "media", "airline", "passenger"]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator(`#workspaces a[href="/${role}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${role}$`));
    await expect(page.locator("h1")).toBeVisible();
    if (role === "retailer") {
      const primary = page.getByRole("button", {
        name: "Create campaign",
        exact: true,
      });
      expect(
        await primary.evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe("rgb(27, 27, 27)");
      expect(await primary.evaluate((el) => getComputedStyle(el).color)).toBe(
        "rgb(255, 255, 255)",
      );
    }
    const surface = page.locator(
      role === "passenger" ? ".screen-studio" : ".app",
    );
    expect(
      await surface.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe(role === "admin" ? "rgb(17, 18, 17)" : "rgb(250, 250, 249)");
    expect(
      await surface.evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain("Instrument Sans");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${out}/workspace-${role}-1440.png`,
      fullPage: true,
    });
    await page
      .locator(role === "passenger" ? ".studio-brand" : ".sidebar .brand")
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Every airport signal.",
    );
    if (role === "admin") {
      await page.goBack();
      await expect(page).toHaveURL(/\/admin$/);
      await expect(
        page.getByRole("heading", { name: "Network overview", exact: true }),
      ).toBeVisible();
      await page.goForward();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Every airport signal.",
      );
    }
  }
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Every airport signal.",
  );
});
