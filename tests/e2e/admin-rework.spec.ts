import { test, expect } from "@playwright/test";
import fs from "node:fs";
const output = "artifacts/screenshots/admin-rework";

test("Admin layout stays readable and contained at desktop, compact and phone widths", async ({
  page,
  request,
}) => {
  fs.mkdirSync(output, { recursive: true });
  await request.post("/api/simulation/control", { data: { action: "reset" } });
  const measurements = [];
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [1024, 768],
    [800, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Network overview", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("region", { name: "Airport screen map", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".network-screen")).toHaveCount(180);
    const layout = await page.evaluate(() => {
      const sidebar = document
        .querySelector(".sidebar")!
        .getBoundingClientRect();
      const brand = document.querySelector(".brand")!.getBoundingClientRect();
      const subtitle = document
        .querySelector(".brand small")!
        .getBoundingClientRect();
      const kpi = document.querySelector(".kpi")!.getBoundingClientRect();
      return {
        width: innerWidth,
        rootFont: getComputedStyle(document.documentElement).fontSize,
        heading: parseFloat(
          getComputedStyle(document.querySelector("h1")!).fontSize,
        ),
        nav: parseFloat(
          getComputedStyle(document.querySelector(".sidebar nav button")!)
            .fontSize,
        ),
        overflow: document.documentElement.scrollWidth > innerWidth,
        brandContained:
          brand.right <= sidebar.right && subtitle.right <= sidebar.right,
        cardHeight: kpi.height,
        columns: getComputedStyle(
          document.querySelector(".kpi-grid")!,
        ).gridTemplateColumns.split(" ").length,
        mapColumns: getComputedStyle(
          document.querySelector(".network-terminals")!,
        ).gridTemplateColumns.split(" ").length,
        pageHeight: document.documentElement.scrollHeight,
      };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.brandContained).toBe(true);
    expect(layout.rootFont).toBe("16px");
    expect(layout.heading).toBeGreaterThanOrEqual(32);
    expect(layout.nav).toBeGreaterThanOrEqual(14);
    expect(layout.cardHeight).toBeLessThan(185);
    if (width >= 1440) {
      expect(layout.columns).toBe(6);
      expect(layout.mapColumns).toBe(2);
    }
    await page.screenshot({
      path: `${output}/admin-${width}x${height}.png`,
      fullPage: true,
    });
    if (width === 1440)
      await page.screenshot({ path: `${output}/admin-1440x900-viewport.png` });
    measurements.push(layout);
  }
  fs.writeFileSync(
    `${output}/measurements.json`,
    JSON.stringify(measurements, null, 2),
  );
});

test("Admin terminal filters, screen inspection, incident navigation and live delay remain functional", async ({
  page,
  request,
}) => {
  await request.post("/api/simulation/control", { data: { action: "reset" } });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");
  await expect(page.locator(".network-screen")).toHaveCount(180);
  await page.getByRole("button", { name: "T2", exact: true }).click();
  await expect(page.locator(".network-screen")).toHaveCount(90);
  await page
    .getByRole("button", { name: "S124 online gate 42", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "screen", exact: true })
      .getByRole("heading", { name: "MQI-T2-124", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "+45m XY501", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "420 passengers in catchment" }),
  ).toBeVisible();
  await expect(page.locator(".network-focus")).toContainText(
    "420 estimated passengers",
  );
  await page
    .getByRole("button", { name: "Review incidents", exact: false })
    .click();
  await expect(page.locator("h1")).toHaveText("Incidents");
  await expect(
    page.getByText("Screen S012 offline for more than five minutes", {
      exact: true,
    }),
  ).toBeVisible();
});
