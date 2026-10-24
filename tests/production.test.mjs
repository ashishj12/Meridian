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
  const server = http.createServer((request, response) => {
    assert.equal(request.headers.authorization, "Bearer local-test");
    if (request.url === "/flights")
      response.end(
        fs.readFileSync(
          "fixtures/reference/MQI_aodb_flights_2026-10-14_SYNTHETIC.csv",
        ),
      );
    else {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          headline: "A better journey",
          headlineHi: "एक बेहतर यात्रा",
          offer: "15% off",
          offerHi: "15% छूट",
          category: "coffee",
        }),
      );
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
    });
    assert.equal(
      (await provider.generate("An airport coffee offer")).headline,
      "A better journey",
    );
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
