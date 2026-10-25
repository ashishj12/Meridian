import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../apps/api/src/app.mjs";
import { EntityRepository } from "../apps/api/src/repositories/EntityRepository.mjs";
import { createAidxMessage } from "../apps/api/src/adapters/airport-sources.mjs";

test("HTTP campaign lifecycle, booking conflicts, QR rendering, validation and master data persistence", async () => {
  const instance = createApp({
    store: new EntityRepository(":memory:"),
    timer: false,
  });
  const server = instance.app.listen(0, "127.0.0.1");

  await new Promise((r) => server.on("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const req = async (url, body, method = "POST") => {
    const res = await fetch(
      base + url,
      body !== undefined
        ? {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : undefined,
    );
    return {
      status: res.status,
      data: res.status === 204 ? null : await res.json(),
    };
  };
  try {
    assert.equal((await req("/health")).data.status, "ok");
    const prewarmed = instance.engine.snapshot().metrics;
    const prewarmedRevenue = instance.engine.metrics("O1").revenue;
    assert.ok(prewarmed.plays > 0);
    assert.ok(prewarmed.impressions > 0);
    assert.ok(prewarmed.scans > 0);
    assert.ok(prewarmed.revenue > 0);
    const runtimeSnapshot = (await req("/state")).data;
    assert.ok(Number.isFinite(runtimeSnapshot.performance.apiP95));
    assert.ok(runtimeSnapshot.performance.uptimeSeconds >= 0);
    assert.equal("uptime" in runtimeSnapshot.performance, false);

    const flight = instance.store.get("flights", "XY501");

    const xml = createAidxMessage(
      { id: "incoming-xml-delay", type: "delay", minutes: 45 },
      flight,
      instance.engine.clock.time,
    );
    assert.equal((await req("/feeds/aidx", { xml })).status, 200);

    assert.equal(instance.store.get("flights", "XY501").delay, 45);
    assert.equal(instance.store.all("feedEvents").at(-1).xml, xml);

    instance.engine.reset();

    assert.equal((await req("/flights?limit=1000")).data.total, 900);
    const inventory = (await req("/inventory")).data;
    assert.ok(inventory.bookings.length > 0);
    assert.ok(inventory.slotForecasts["Z1:0"]);
    const premiumHours = (zoneId) =>
      Object.entries(inventory.slotForecasts)
        .filter(([key, slot]) => key.startsWith(`${zoneId}:`) && slot.premium)
        .map(([key]) => key.split(":")[1]);
    assert.notDeepEqual(premiumHours("Z1"), premiumHours("Z7"));
    assert.equal((await req("/campaigns", { name: "" })).status, 400);

    const original = (await req("/campaigns")).data[0];
    const payload = {
      ...original,
      name: "Lifecycle regression campaign",
      delayTrigger: 0,
    };
    const created = await req("/campaigns", payload);
    assert.equal(created.status, 201);

    assert.equal(created.data.status, "pending");
    const id = created.data.id;
    assert.equal((await req(`/campaigns/${id}/approve`, {})).status, 400);

    assert.equal(
      (await req(`/campaigns/${id}/approve`, { brandSafe: true })).data.status,
      "approved",
    );
    assert.equal(
      (await req(`/campaigns/${id}/duplicate`, {})).data.status,
      "pending",
    );
    assert.equal(
      (await req(`/campaigns/${id}/reject`, { reason: "Review regression" }))
        .data.status,
      "rejected",
    );

    const slots = (await req("/recommendations/slots")).data;
    const booking = {
      screenId: slots[0].screenId,
      timestamp: slots[0].timestamp,
      campaignId: "C1",
    };
    assert.equal((await req("/inventory/book", booking)).status, 201);
    assert.equal((await req("/inventory/book", booking)).status, 409);
    const vendor = (
      await req("/vendors", {
        name: "Test vendor",
        contact: "demo@example.test",
      })
    ).data;
    assert.equal(
      (await req("/vendors/" + vendor.id, { name: "Updated vendor" }, "PATCH"))
        .data.name,
      "Updated vendor",
    );
    assert.equal(
      (await req("/vendors/" + vendor.id, {}, "DELETE")).status,
      204,
    );
    assert.equal((await req("/zones/Z7", {}, "DELETE")).status, 409);

    await req("/simulation/events", { type: "delay", minutes: 45 });
    const d = (await req("/screens/S124/decision")).data;

    const qr = await fetch(base + "/promos/" + d.promo.id + "/qr");
    assert.equal(qr.headers.get("content-type").includes("svg"), true);

    assert.ok((await qr.text()).includes("<svg"));
    assert.equal(
      (await req("/promos/" + d.promo.id + "/claim", {})).status,
      200,
    );
    assert.equal(
      (await req("/promos/" + d.promo.id + "/redeem", {})).status,
      200,
    );
    assert.equal(
      (await req("/promos/" + d.promo.id + "/redeem", {})).status,
      409,
    );
    assert.equal(
      (await req("/analytics/retailer?outletId=O1")).data.revenue,
      prewarmedRevenue + 24,
    );
    const creative = (
      await req("/creatives/generate", {
        brief: "Festive sweets, 20% off for families",
      })
    ).data;
    assert.equal(creative.provider, "offline-template");
    assert.ok(creative.headlineHi);
    assert.ok(creative.offer.includes("20%"));
    assert.equal(
      (await req("/simulation/control", { speed: 500 })).status,
      400,
    );
    const specification = (await req("/openapi.json")).data;
    assert.equal(specification.openapi, "3.1.0");
    assert.ok(specification.paths["/api/campaigns/{id}"].patch);
    assert.deepEqual(
      specification.paths["/api/campaigns/{id}"].patch.parameters[0],
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", minLength: 1 },
      },
    );
    assert.ok(
      specification.paths["/api/campaigns"].post.requestBody.content[
        "application/json"
      ].schema.required.includes("zoneIds"),
    );
    assert.deepEqual(
      specification.components.schemas.SimulationEvent.properties.type.enum,
      [
        "delay",
        "gate-change",
        "screen-offline",
        "boarding",
        "departure",
        "arrival",
        "cancellation",
        "evidence",
        "feed-lag",
        "creative-failure",
      ],
    );
    for (const operations of Object.values(specification.paths))
      for (const operation of Object.values(operations))
        assert.ok(Object.keys(operation.responses).length > 0);
    const docs = await fetch(base + "/docs");
    assert.equal(docs.status, 200);
    assert.match(await docs.text(), /redoc spec-url="\/api\/openapi\.json"/);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    instance.close();
  }
});
