import { applyVendorSnapshot } from "../apps/api/src/services/feed-ingestion.service.mjs";
import { validateProposal } from "../apps/api/src/models/decision.model.mjs";
import { fork } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { EntityRepository } from "../apps/api/src/repositories/EntityRepository.mjs";
import { AirportEngine } from "../apps/api/src/services/AirportEngine.mjs";
import { createRuntimeCoordinator } from "../apps/api/src/services/runtime-coordinator.mjs";
import { createAidxMessage } from "../apps/api/src/adapters/aidx.adapter.mjs";
import { validateAidxXml } from "../apps/api/src/adapters/aidx-validation.mjs";
import { parseAcris } from "../apps/api/src/adapters/acris.adapter.mjs";
import { VendorFlightSource } from "../apps/api/src/adapters/flight-source.adapters.mjs";
import { VendorCreativeProvider } from "../apps/api/src/adapters/creative-providers.mjs";
import {
  scheduleForDate,
  segmentHeatmap,
  sevenDayYield,
} from "../apps/api/src/services/schedule.service.mjs";

test("typed-entity migration backfills an existing JSON-only database", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "meridian-migration-"),
  );
  const file = path.join(directory, "legacy.sqlite");
  let legacy = new DatabaseSync(file);
  try {
    legacy.exec("PRAGMA foreign_keys=ON;");
    for (const migration of [
      "001_initial.sql",
      "002_activity_index.sql",
      "003_runtime_leases.sql",
    ])
      legacy.exec(fs.readFileSync(path.join("migrations", migration), "utf8"));
    const insert = legacy.prepare(
      "INSERT INTO entities(kind, id, body) VALUES(?, ?, ?)",
    );
    const entities = [
      ["airlines", "XY", { id: "XY", name: "Skylark Air" }],
      ["terminals", "T1", { id: "T1", name: "Terminal 1" }],
      ["zones", "Z1", { id: "Z1", terminal: "T1" }],
      ["outlets", "O1", { id: "O1", name: "Saffron Table" }],
      [
        "screens",
        "S1",
        {
          id: "S1",
          zoneId: "Z1",
          terminal: "T1",
          name: "Gate Screen",
          gate: "1",
          orientation: "landscape",
          size: 55,
          status: "online",
          nearestGates: ["1"],
        },
      ],
      [
        "campaigns",
        "C1",
        {
          id: "C1",
          outletId: "O1",
          name: "Test campaign",
          category: "food",
          status: "approved",
          budget: 100,
          spend: 0,
          start: "2026-10-14T00:00:00.000Z",
          end: "2026-10-15T00:00:00.000Z",
          creativeApproved: true,
          brandSafe: true,
          paused: false,
          stock: true,
        },
      ],
      [
        "flights",
        "F1",
        {
          id: "F1",
          number: "XY101",
          airlineId: "XY",
          zoneId: "Z1",
          direction: "D",
          origin: "MQI",
          destination: "DXB",
          terminal: "T1",
          gate: "1",
          scheduled: "2026-10-14T15:00:00.000Z",
          estimated: "2026-10-14T15:00:00.000Z",
          status: "Scheduled",
          delay: 0,
          aircraft: "A320",
          seats: 180,
          pax: 150,
          international: true,
        },
      ],
      [
        "promos",
        "P1",
        {
          id: "P1",
          campaignId: "C1",
          outletId: "O1",
          zoneId: "Z1",
          variant: "A",
          offer: "15% off",
          expiry: 200,
          scans: 1,
          claimed: true,
          redeemed: false,
        },
      ],
      [
        "decisions",
        "D1",
        {
          id: "D1",
          screenId: "S1",
          campaignId: "C1",
          timestamp: 100,
          source: "rules",
          candidates: [{ id: "C1", score: 0.85 }],
          reason: "Audience match",
          presence: {},
          scoreWeights: {},
          validated: true,
          delivered: true,
        },
      ],
      [
        "activity",
        "A1",
        {
          id: "A1",
          campaignId: "C1",
          outletId: "O1",
          promoCodeId: "P1",
          timestamp: 100,
          plays: 1,
          impressions: 10,
          redemptions: 1,
          revenue: 24,
          segment: "family",
          variant: "A",
        },
      ],
    ];
    for (const [kind, id, body] of entities)
      insert.run(kind, id, JSON.stringify(body));
    legacy.close();
    legacy = null;

    const store = new EntityRepository(file);
    try {
      assert.equal(
        store.db
          .prepare(
            "SELECT COUNT(*) AS count FROM schema_migrations WHERE version=4",
          )
          .get().count,
        1,
      );
      assert.equal(
        store.db.prepare("SELECT number FROM flights WHERE id='F1'").get()
          .number,
        "XY101",
      );
      assert.equal(
        store.db.prepare("SELECT score FROM decisions WHERE id='D1'").get()
          .score,
        0.85,
      );
      assert.equal(
        store.db
          .prepare(
            "SELECT promo_code_id FROM redemptions WHERE activity_id='A1'",
          )
          .get().promo_code_id,
        "P1",
      );
      assert.deepEqual(store.db.prepare("PRAGMA foreign_key_check").all(), []);
    } finally {
      store.close();
    }
  } finally {
    if (legacy) legacy.close();
    removeTemporaryWorkspace(directory);
  }
});

test("IATA XSD accepts generated AIDX and rejects well-formed but schema-invalid XML", async () => {
  const store = new EntityRepository(":memory:");
  try {
    const engine = new AirportEngine(store),
      flight = store.all("flights")[0];
    const xml = createAidxMessage(
      { id: "schema-test", type: "delay", minutes: 45 },
      flight,
      engine.clock.time,
    );
    assert.equal((await validateAidxXml(xml)).valid, true);
    await assert.rejects(() =>
      validateAidxXml(xml.replace(/<Originator[^>]*\/>/, "")),
    );
    await assert.rejects(() => validateAidxXml("<!DOCTYPE x><x/>"));
  } finally {
    store.close();
  }
});

test("published ACRIS queue schema rejects invalid occupancy", () => {
  const entities = JSON.parse(
    fs.readFileSync("fixtures/acris/entities.json", "utf8"),
  );
  const queue = entities.find((entity) => entity.type === "QueueMeasurement");
  assert.ok(queue);
  queue.Occupancy.value = -1;
  assert.throws(() => parseAcris(entities));
});

test("calendar eligibility activates only during the configured window and correct zone", () => {
  const store = new EntityRepository(":memory:");
  try {
    const engine = new AirportEngine(store),
      screen = store.get("screens", "S124");
    const campaign = {
      ...store.get("campaigns", "C1"),
      delayTrigger: 0,
      festivalId: "family-festival",
      minimumCrowd: 0,
      minimumDwell: 0,
      internationalOnly: false,
    };
    const candidate = () =>
      engine.candidates(screen, engine.presence(screen.zoneId), [campaign])[0];
    assert.ok(
      candidate().reasons.includes("Festival calendar trigger not active"),
    );
    engine.control({ time: "2026-10-14T16:00:00Z" });
    assert.equal(candidate().boost, 1.2);
    const presence = engine.presence(screen.zoneId);
    const issues = validateProposal(
      candidate(),
      presence,
      engine.clock,
      (id) => store.get("flights", id),
      (id) => ({ ...store.get("calendarEvents", id), zoneIds: ["Z1"] }),
    );
    assert.ok(issues.includes("Unverifiable calendar evidence"));
    assert.ok(
      !candidate().reasons.includes("Festival calendar trigger not active"),
    );
    engine.control({ time: "2026-10-14T18:00:00Z" });
    assert.ok(
      candidate().reasons.includes("Festival calendar trigger not active"),
    );
  } finally {
    store.close();
  }
});

test("forward schedules vary by date, full heatmap uses all flights and projected yield separates bookings", () => {
  const store = new EntityRepository(":memory:");
  try {
    const engine = new AirportEngine(store),
      flights = store.all("flights");
    const tomorrow = engine.clock.time + 86400000,
      next = tomorrow + 86400000;
    const first = scheduleForDate(flights, tomorrow),
      second = scheduleForDate(flights, next);
    assert.notEqual(first[0].pax, second[0].pax);
    assert.equal(flights[0].scheduled.slice(0, 10), "2026-10-14");
    assert.equal(
      segmentHeatmap(engine, "holiday", "2026-10-14").sourceCount,
      900,
    );
    const yieldForecast = sevenDayYield(engine);
    assert.ok(yieldForecast.revenueForecast > yieldForecast.committedRevenue);
    assert.equal(yieldForecast.expectedFillRate, 0.35);
  } finally {
    store.close();
  }
});

test("independent SQLite connections share commands, invalidate caches and elect one clock owner", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-runtime-"));
  const firstStore = new EntityRepository(
    path.join(directory, "shared.sqlite"),
  );
  const first = new AirportEngine(firstStore),
    a = createRuntimeCoordinator(first, { timer: false });
  const secondStore = new EntityRepository(
    path.join(directory, "shared.sqlite"),
  );
  const second = new AirportEngine(secondStore),
    b = createRuntimeCoordinator(second, { timer: false });
  try {
    a.execute(() => first.control({ action: "play" }));
    const start = first.clock.time;
    a.tick();
    b.tick();
    b.synchronize();
    assert.equal(second.clock.time, start + 1000);
    b.execute(() =>
      second.event({ id: "cross-connection", type: "delay", minutes: 45 }),
    );
    a.synchronize();
    assert.equal(
      first.store.all("flights").find((f) => f.number === "XY501").delay,
      45,
    );
    a.close();
    b.tick();
    a.synchronize();
    assert.equal(first.clock.time, start + 2000);
  } finally {
    a.close();
    b.close();
    firstStore.close();
    secondStore.close();
    removeTemporaryWorkspace(directory);
  }
});

test("configured vendor providers make real HTTP requests and validate responses", async () => {
  let creativeRequest;
  const server = http.createServer((request, response) => {
    assert.equal(request.headers.authorization, "Bearer local-test");
    if (request.url === "/flights")
      response.end(
        fs.readFileSync(
          "fixtures/reference/MQI_aodb_flights_2026-10-14_SYNTHETIC.csv",
        ),
      );
    else {
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        creativeRequest = JSON.parse(Buffer.concat(chunks).toString());
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            headline: "A better journey",
            headlineSecond: "Un meilleur voyage",
            offer: "15% off",
            offerSecond: "15% de réduction",
            category: "coffee",
          }),
        );
      });
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const source = new VendorFlightSource({
      snapshotUrl: base + "/flights",
      token: "local-test",
    });
    assert.ok((await source.getSnapshot()).length > 0);
    const provider = new VendorCreativeProvider({
      endpoint: base + "/creative",
      token: "local-test",
      secondLanguage: "fr",
    });
    const creative = await provider.generate("An airport coffee offer");
    assert.equal(creative.headline, "A better journey");
    assert.equal(creative.headlineSecond, "Un meilleur voyage");
    assert.equal(creative.secondLanguage, "fr");
    assert.deepEqual(creativeRequest.languages, ["en", "fr"]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("two operating-system processes enforce event idempotency and single-use claims", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-process-"));
  const database = path.join(directory, "shared.sqlite");
  const store = new EntityRepository(database),
    engine = new AirportEngine(store);
  engine.event({ type: "delay", minutes: 45 });
  const token = store.get("playlists", "S124").decision.promo.id;
  const claim = engine.promo(token, "scan", { issue: true });
  store.close();
  const children = [
    fork(new URL("./helpers/runtime-worker.mjs", import.meta.url), [database], {
      stdio: ["ignore", "ignore", "inherit", "ipc"],
    }),
    fork(new URL("./helpers/runtime-worker.mjs", import.meta.url), [database], {
      stdio: ["ignore", "ignore", "inherit", "ipc"],
    }),
  ];
  try {
    await Promise.all(children.map((child) => once(child, "message")));
    const send = async (child, command) => {
      const response = once(child, "message");
      child.send(command);
      return (await response)[0];
    };
    const outcomes = await Promise.all(
      children.map((child) =>
        send(child, {
          type: "event",
          value: { id: "process-event", type: "delay", minutes: 45 },
        }),
      ),
    );
    assert.equal(
      outcomes.filter((outcome) => outcome.result?.duplicate).length,
      1,
    );
    const claims = await Promise.all(
      children.map((child) =>
        send(child, { type: "promo", token: claim.id, action: "claim" }),
      ),
    );
    assert.equal(claims.filter((outcome) => outcome.result?.claimed).length, 1);
    assert.equal(
      claims.filter((outcome) => outcome.error === "Already claimed").length,
      1,
    );
  } finally {
    await Promise.all(
      children.map(async (child) => {
        const exited = once(child, "exit");
        child.disconnect();
        await exited;
      }),
    );
    removeTemporaryWorkspace(directory);
  }
});

function removeTemporaryWorkspace(directory) {
  const target = path.resolve(directory);
  if (
    path.dirname(target) !== path.resolve(os.tmpdir()) ||
    !path.basename(target).startsWith("meridian-")
  )
    throw new Error("Unexpected temporary test path");
  fs.rmSync(target, { recursive: true, force: true });
}

test("vendor snapshots preserve canonical relationships and roll back invalid batches", () => {
  const store = new EntityRepository(":memory:"),
    engine = new AirportEngine(store),
    coordinator = createRuntimeCoordinator(engine, { timer: false });
  const runtime = { store, engine, coordinator };
  try {
    const flight = store.get("flights", "XY501");
    applyVendorSnapshot(runtime, [{ ...flight, gate: "43" }]);
    assert.equal(
      store.get("flights", "XY501").zoneId,
      store.get("gates", "43").zoneId,
    );
    assert.equal(store.get("gateAssignments", "XY501").gateId, "43");
    assert.throws(() =>
      applyVendorSnapshot(runtime, [
        { ...flight, gate: "42" },
        { ...flight, id: "unmapped" },
      ]),
    );
    assert.equal(store.get("flights", "XY501").gate, "43");
    assert.throws(() =>
      applyVendorSnapshot(runtime, [{ ...flight, pax: flight.seats + 1 }]),
    );
  } finally {
    coordinator.close();
    store.close();
  }
});
