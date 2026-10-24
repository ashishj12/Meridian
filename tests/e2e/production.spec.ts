import { test, expect } from "@playwright/test";

test("full heatmap, projected yield and editable campaign triggers render real data", async ({
  page,
  request,
}) => {
  await request.post("/api/simulation/control", { data: { action: "reset" } });
  await page.goto("/media");
  await expect(page.locator(".segment-heatmap tbody tr")).toHaveCount(10);
  await expect(
    page.getByText(/Canonical flight movements included:/),
  ).toContainText("900");
  await page.getByLabel("Heatmap segment").selectOption("family");
  await expect(
    page.locator(".segment-heatmap tbody td").first(),
  ).not.toBeEmpty();
  await expect(
    page.locator(".kpi").filter({ hasText: "7-day revenue forecast" }),
  ).toContainText("Committed");
  await page.goto("/retailer");
  await page
    .getByRole("button", { name: "Create campaign", exact: true })
    .click();
  await page.getByLabel("Festival calendar").selectOption("family-festival");
  await page.getByLabel("Flight event trigger").selectOption("boarding");
  await expect(page.getByLabel("Offer in Hindi")).not.toBeEmpty();
});

test("Hindi includes explanatory interface copy and landing FAQs", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("meridian-language", "hi"),
  );
  await page.goto("/admin");
  await expect(page.locator(".page-heading p")).toHaveText(
    "एयरपोर्ट की लाइव स्थिति। हर स्क्रीन, हर संकेत, हर अवसर।",
  );
  await page.goto("/passenger");
  await expect(
    page.getByText("एक जुड़ा एयरपोर्ट। अधिक प्रासंगिक सफर।"),
  ).toBeVisible();
  await page.goto("/");
  const question = page
    .locator(".faq-list summary")
    .filter({ hasText: "वर्तमान परिदृश्य कैसे काम करता है?" });
  await question.click();
  await expect(page.locator(".faq-list details[open]")).toBeVisible();
  await expect(page.locator(".faq-list")).not.toContainText(
    "How does the live scenario work?",
  );
});

test("passenger has shared jump, reset and event controls", async ({
  page,
  request,
}) => {
  await request.post("/api/simulation/control", { data: { action: "reset" } });
  await page.goto("/passenger");
  await page.locator(".studio-simulation-menu summary").click();
  await page.getByLabel("Jump to time", { exact: true }).fill("16:00");
  await expect
    .poll(
      async () => (await (await request.get("/api/state")).json()).clock.time,
    )
    .toBe(Date.parse("2026-10-14T16:00:00Z"));
  await page
    .getByRole("button", { name: "Reset simulation", exact: true })
    .click();
  await expect
    .poll(
      async () => (await (await request.get("/api/state")).json()).clock.time,
    )
    .toBe(Date.parse("2026-10-14T14:10:00Z"));
  await page.getByRole("button", { name: "Gate change", exact: true }).click();
  await expect
    .poll(
      async () => (await (await request.get("/api/flights/XY501")).json()).gate,
    )
    .toBe("43");
});
