import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { EntityRepository } from "../apps/api/src/repositories/EntityRepository.mjs";
import { AirportEngine } from "../apps/api/src/services/AirportEngine.mjs";
import {
  parseAodb,
  parseAidx,
  parseAcris,
  referenceFile,
  MockFlightSource,
  MockZoneSource,
  createMockQueueMeasurement,
  mockQueueCount,
} from "../apps/api/src/adapters/airport-sources.mjs";
import { profile, timeAt } from "../apps/api/src/database/seed.mjs";
import { validateProposal } from "../apps/api/src/models/decision.model.mjs";
import { validateAidxXml } from "../apps/api/src/adapters/aidx-validation.mjs";
import {
  LlmAiScorer,
  OfflineHeuristicScorer,
} from "../apps/api/src/adapters/ai-scorers.mjs";

const setup = (aiScorer) => {
  const store = new EntityRepository(":memory:");
  return { store, engine: new AirportEngine(store, { aiScorer }) };
};

test("AI scorers produce an offline ranking and validate the LLM request contract", async () => {
  const presence = {
    evidence: [{ id: "F1" }],
    queueEvidence: { id: "Q1" },
    calendarEvidence: [],
  };
  const candidates = [
    { id: "C1", score: 0.86, eligible: true },
    { id: "C2", score: 0.52, eligible: true },
    { id: "C3", score: 0.21, eligible: false },
  ];
  const offline = new OfflineHeuristicScorer().rank({
    presence,
    candidates,
    now: timeAt(14, 10),
  });
  assert.deepEqual(
    offline.ranking.map((item) => item.campaignId),
    ["C1", "C2"],
  );
  assert.deepEqual(offline.evidenceIds, ["F1", "Q1"]);

  let sent;
  const llm = new LlmAiScorer({
    endpoint: "https://ai.example.test/rank",
    fetchImplementation: async (url, options) => {
      sent = { url, options };
      return new Response(
        JSON.stringify({
          ranking: [{ campaignId: "C1", score: 0.86, evidenceIds: ["F1"] }],
          rationale: "Trusted flight evidence supports C1.",
          generatedAt: "2026-10-14T14:10:00.000Z",
        }),
      );
    },
  });
  const answer = await llm.rank({
    presence,
    candidates,
    now: timeAt(14, 10),
  });
  assert.equal(sent.url, "https://ai.example.test/rank");
  assert.deepEqual(
    JSON.parse(sent.options.body).eligibleCandidates.map(
      (candidate) => candidate.campaignId,
    ),
    ["C1", "C2"],
  );
  assert.deepEqual(answer.evidenceIds, ["F1"]);
});

test("async AI rankings pass through the decision gate before publication", async () => {
  const aiScorer = {
    isAsync: true,
    async rank(input) {
      return new OfflineHeuristicScorer().rank(input);
    },
  };
  const { store, engine } = setup(aiScorer);
  try {
    await engine.ready;
    assert.equal(store.get("playlists", "S124").decision.source, "ai");

    engine.aiScorer.rank = async () => {
      throw new Error("AI endpoint unavailable");
    };
    await engine.evaluate(false);
    const decision = store.get("playlists", "S124").decision;
    assert.equal(decision.source, "rules");
    assert.ok(
      decision.rejectionReasons.some((reason) =>
        reason.includes("AI scorer request failed"),
      ),
    );
  } finally {
    store.close();
  }
});

test("independent validator rejects invented scores and contradictory stored evidence", () => {
  const { store, engine } = setup();
  try {
    engine.event({ type: "delay", minutes: 45 });
    const d = store.get("playlists", "S124").decision;
    const winner = d.candidates.find((c) => c.id === "C1");
    assert.ok(
      validateProposal(
        { ...winner, score: 0.99 },
        d.presence,
        engine.clock,
        (id) => store.get("flights", id),
      ).some((s) => s.includes("reproduced")),
    );

    const f = store.get("flights", "XY501");
    store.put("flights", { ...f, pax: 9999 });

    assert.ok(
      validateProposal(winner, d.presence, engine.clock, (id) =>
        store.get("flights", id),
      ).some((s) => s.includes("Contradictory")),
    );
  } finally {
    store.close();
  }
});

test("hallucinated evidence, stale AI timestamps and invented scores fall back to rules", () => {
  const cases = [
    {
      alter: (proposal) => proposal.evidenceIds.push("HALLUCINATED-FLIGHT"),
      reason: "Untrusted evidence ID",
    },
    {
      alter: (proposal) => {
        proposal.generatedAt = "2020-01-01T00:00:00.000Z";
      },
      reason: "stale or unverifiable",
    },
    {
      alter: (proposal) => {
        proposal.ranking[0].score = 0.99;
      },
      reason: "does not match recomputed score",
    },
  ];
  for (const [index, scenario] of cases.entries()) {
    const aiScorer = {
      rank(input) {
        const proposal = new OfflineHeuristicScorer().rank(input);
        scenario.alter(proposal);
        return proposal;
      },
    };
    const { store, engine } = setup(aiScorer);
    try {
      engine.event({
        id: `ai-failure-${index}`,
        type: "delay",
        flightId: "XY501",
        minutes: 45,
      });
      const decision = store.get("playlists", "S124").decision;
      assert.equal(decision.campaignId, "C1");
      assert.equal(decision.source, "rules");
      assert.ok(
        decision.rejectionReasons.some((message) =>
          message.toLowerCase().includes(scenario.reason.toLowerCase()),
        ),
      );
    } finally {
      store.close();
    }
  }
});

test("one broadcast QR issues distinct single-use claim tokens without collecting identity", () => {
  const { store, engine } = setup();
  try {
    engine.event({ type: "delay", minutes: 45 });
    const root = store.get("playlists", "S124").decision.promo.id;

    const a = engine.promo(root, "scan", { issue: true }),
      b = engine.promo(root, "scan", { issue: true });
    assert.notEqual(a.id, b.id);

    assert.equal(a.offerToken, root);
    for (const p of [a, b]) {
      engine.promo(p.id, "claim");
      engine.promo(p.id, "redeem");

      assert.throws(() => engine.promo(p.id, "redeem"), /Already redeemed/);
    }
    assert.equal(engine.metrics("O1").redemptions, 2);
    assert.equal(engine.metrics("O1").scans, 2);
  } finally {
    store.close();
  }
});

test("reference CSV maps all 320 records and preserves all 33 raw fields, A-CDM and linked references", () => {
  const flights = parseAodb(fs.readFileSync(referenceFile, "utf8"));
  assert.equal(flights.length, 320);

  assert.equal(Object.keys(flights[0].source.raw).length, 33);
  const f = flights.find((f) => f.id === "100180");
  assert.equal(f.number, "XH960");

  assert.equal(f.pax, 224);
  assert.equal(f.actual, "2026-10-14T00:18:00Z");

  assert.equal(f.linkedFlightId, "100181");
  assert.ok(flights.some((f) => f.tobt));
});

test("AIDX sample parses text-bearing attributes and rejects malformed XML and external entities", () => {
  const xml = fs.readFileSync(
    "fixtures/reference/AIDX_FlightLegNotifRQ_XH960_arrival_ILLUSTRATIVE.xml",
    "utf8",
  );

  const e = parseAidx(xml);
  assert.equal(e.number, "XH960");

  assert.equal(e.status, "ARR");
  assert.equal(e.gate, "C38");
  assert.equal(e.id, "MQI-AODB-000184533");

  assert.equal(e.times.length, 3);
  assert.throws(() => parseAidx("<oops>"));

  assert.throws(() => parseAidx("<!DOCTYPE evil><x/>"));
});

test("ACRIS fixtures normalize property and relationship wrappers; source interfaces are stream-capable", async () => {
  const source = new MockZoneSource();
  const entities = await source.getZones();

  assert.ok(entities.find((e) => e.type === "Checkpoint"));
  assert.equal(entities.find((e) => e.id === "Q6").count, 36);

  assert.throws(() => parseAcris([{}]));
  const flights = await new MockFlightSource().getSnapshot();
  assert.equal(flights.length, 898);
  assert.equal(Object.keys(flights[320].source.raw).length, 33);
  assert.equal(flights[320].id, "F320");

  const abort = new AbortController();
  const events = [];
  for await (const event of new MockFlightSource({ intervalMs: 0 }).stream({
    signal: abort.signal,
  })) {
    events.push(event);
    if (events.length === 3) {
      abort.abort();
      break;
    }
  }
  assert.deepEqual(
    events.map((event) => event.status),
    ["SCH", "DLY", "BRD"],
  );
  await Promise.all(events.map((event) => validateAidxXml(event.xml)));
});

test("mock ACRIS queue counts follow peak demand and rise after a flight delay", () => {
  const offPeak = mockQueueCount(36, timeAt(14, 10));
  const peak = mockQueueCount(36, timeAt(8, 10));
  const delayed = mockQueueCount(36, timeAt(14, 10), 45);
  assert.ok(peak > offPeak);
  assert.ok(delayed > offPeak);
  assert.equal(
    createMockQueueMeasurement("Z7", delayed, timeAt(14, 10)).count,
    delayed,
  );

  const { store, engine } = setup();
  try {
    const previous = store.get("queues", "Q6").count;
    engine.event({ type: "delay", flightId: "XY501", minutes: 45 });
    assert.ok(store.get("queues", "Q6").count > previous);
    const feeds = engine.snapshot().feeds;
    assert.ok(feeds.find((feed) => feed.name === "AIDX").messagesPerMinute > 0);
    assert.ok(feeds.find((feed) => feed.name === "ACRIS").lastMessageAt);
  } finally {
    store.close();
  }
});

test("seed has required counts, thirty history days, valid gate/zone/terminal relationships", () => {
  const { store } = setup();
  try {
    for (const [k, n] of Object.entries({
      flights: 900,
      screens: 180,
      outlets: 40,
      airlines: 10,
      campaigns: 25,
    }))
      assert.equal(store.all(k).length, n, k);

    for (const screen of store.all("screens")) {
      const zone = store.get("zones", screen.zoneId);
      assert.equal(zone.terminal, screen.terminal);

      assert.equal(store.get("gates", screen.gate).zoneId, screen.zoneId);
    }
    for (const flight of store.all("flights")) {
      assert.ok(store.get("airlines", flight.airlineId));

      assert.equal(store.get("gates", flight.gate).zoneId, flight.zoneId);
      assert.equal(store.get("zones", flight.zoneId).terminal, flight.terminal);

      assert.ok(flight.pax <= flight.seats);
    }
    assert.equal(
      new Set(
        store.all("activity").map((a) => Math.floor(a.timestamp / 86400000)),
      ).size,
      30,
    );
  } finally {
    store.close();
  }
});

test("seeded profiles vary by route and reflect business and holiday travel patterns", () => {
  const monday = profile({
    index: 7,
    origin: "MQI",
    destination: "ADN",
    international: false,
    scheduled: "2026-10-19T07:00:00.000Z",
    aircraft: "A320",
    seats: 180,
    passengers: 144,
  });
  const friday = profile({
    index: 42,
    origin: "MQI",
    destination: "DXB",
    international: true,
    scheduled: "2026-10-23T18:30:00.000Z",
    aircraft: "A359",
    seats: 320,
    passengers: 276,
    festivalActive: true,
  });

  assert.ok(monday.purpose.business > 0.55);
  assert.ok(monday.age["25–34"] + monday.age["35–44"] > 0.6);
  assert.ok(friday.purpose.holiday > 0.5);
  assert.ok(friday.party.family > 0.35);
  assert.ok(friday.party.couple > 0.2);
  assert.equal(friday.destination, "DXB");
  assert.equal(friday.region, "Gulf");
  assert.equal(friday.travelType, "international");
  assert.equal(friday.festivalActive, true);
  assert.equal(friday.schoolHoliday, false);
  assert.equal(monday.travelType, "domestic");
  assert.notDeepEqual(monday.nationalities, friday.nationalities);
  assert.deepEqual(Object.keys(monday.age), [
    "<12",
    "12–17",
    "18–24",
    "25–34",
    "35–44",
    "45–54",
    "55+",
  ]);
  assert.equal(
    Math.round((monday.gender.female + monday.gender.male) * 100),
    100,
  );
  assert.ok(monday.cabin.economy > monday.cabin.business);
  assert.equal(monday.delayMinutes, 0);
  assert.ok(monday.dwellMinutes > 0);
});

test("flight-delay cascade changes presence, scores and delivered creative under two seconds", () => {
  const { store, engine } = setup();
  try {
    assert.equal(store.get("playlists", "S124").decision.campaignId, "C2");
    const baseline = engine.presences.Z7.count;

    const start = performance.now();
    engine.event({
      id: "example-delay",
      type: "delay",
      flightId: "XY501",
      minutes: 45,
    });

    const elapsed = performance.now() - start;
    const p = engine.presences.Z7,
      d = store.get("playlists", "S124").decision;
    assert.equal(store.get("flights", "XY501").status, "Delayed");
    assert.ok(p.count > baseline);

    assert.equal(d.campaignId, "C1");
    for (const [id, score] of [
      ["C1", 0.86],
      ["C2", 0.52],
      ["C3", 0.21],
    ]) {
      assert.ok(
        Math.abs(d.candidates.find((c) => c.id === id).score - score) <= 0.02,
        `${id} score should be approximately ${score}`,
      );
    }
    assert.deepEqual(
      d.candidates
        .filter((candidate) => ["C1", "C2", "C3"].includes(candidate.id))
        .map((candidate) => candidate.id),
      ["C1", "C2", "C3"],
    );
    assert.deepEqual(
      d.presence.flightWeights
        .filter(({ flightId }) => ["XY501", "ZQ88"].includes(flightId))
        .map(({ flightId, gateDistance, timeToBoarding, weight }) => ({
          flightId,
          gateDistance,
          timeToBoarding,
          weight,
        })),
      [
        {
          flightId: "XY501",
          gateDistance: 0,
          timeToBoarding: 55,
          weight: 1,
        },
        {
          flightId: "ZQ88",
          gateDistance: 0,
          timeToBoarding: 48,
          weight: 1,
        },
      ],
    );
    assert.equal(d.candidates.find((c) => c.id === "C3").eligible, false);
    assert.ok(elapsed < 2000, `cascade ${elapsed}ms`);

    assert.ok(store.get("campaigns", "G-XY501"));

    console.log(`Delay cascade: ${elapsed.toFixed(1)} ms`);
  } finally {
    store.close();
  }
});

test("all evidence failure modes reject proposals and persist a safe fallback", () => {
  const { store, engine } = setup();
  try {
    engine.event({ type: "delay", minutes: 45 });
    for (const mode of ["missing", "stale", "contradictory", "unverifiable"]) {
      engine.event({ type: "evidence", mode });
      const d = store.get("playlists", "S124").decision;

      assert.equal(d.campaignId, null);
      assert.match(d.fallback, new RegExp(mode));
      assert.equal(d.validated, false);
    }
    engine.event({ type: "evidence", mode: "fresh" });
    assert.equal(store.get("playlists", "S124").decision.campaignId, "C1");
  } finally {
    store.close();
  }
});

test("hard rules exclude stock, approval, placement, daily caps, frequency and safety failures", () => {
  const { store, engine } = setup();
  try {
    engine.event({ type: "delay", minutes: 45 });

    const original = store.get("campaigns", "C1");
    for (const patch of [
      { stock: false },
      { status: "pending" },
      { creativeApproved: false },
      { brandSafe: false },
      { paused: true },
      { budget: 0 },
      { minimumCrowd: 9999 },
      { minimumDwell: 999 },
      { destination: "INVALID" },
      { zoneIds: ["Z1"] },
    ]) {
      store.put("campaigns", { ...original, ...patch });
      engine.evaluate(false);
      assert.notEqual(store.get("playlists", "S124").decision.campaignId, "C1");
    }

    store.put("campaigns", original);
    engine.evaluate(false);
    assert.equal(store.get("playlists", "S124").decision.campaignId, "C1");
  } finally {
    store.close();
  }
});

test("promotions distinguish scans, claims, redemption, family sharing, duplicate rejection and expiry", () => {
  const { store, engine } = setup();
  try {
    engine.event({ type: "delay", minutes: 45 });
    const token = store.get("playlists", "S124").decision.promo.id;
    assert.match(token, /^[0-9a-f]{48}$/);

    assert.throws(() => engine.promo(token, "redeem"), /Claim/);
    engine.promo(token, "scan");

    assert.equal(engine.metrics("O1").revenue, 0);
    engine.promo(token, "claim");

    assert.equal(engine.metrics("O1").redemptions, 0);
    engine.promo(token, "redeem");
    const m = engine.metrics("O1");
    assert.equal(m.scans, 1);
    assert.equal(m.claims, 1);

    assert.equal(m.redemptions, 1);
    assert.equal(m.revenue, 24);
    assert.throws(() => engine.promo(token, "redeem"), /Already redeemed/);

    const child = engine.promo(token, "share");
    assert.equal(child.parentToken, token);
    assert.equal(child.expiry, store.get("promos", token).expiry);

    assert.throws(() => engine.promo(token, "share"), /already issued/);
    assert.throws(() => engine.promo(child.id, "share"), /already issued/);

    engine.clock.time = child.expiry;

    assert.throws(() => engine.promo(child.id, "claim"), /expired/);
    assert.throws(() => engine.promo("forged", "scan"), /not found/);
  } finally {
    store.close();
  }
});

test("idempotency prevents replayed feed effects and reset restores deterministic scenario", () => {
  const { store, engine } = setup();
  try {
    engine.event({ id: "same", type: "delay", minutes: 45 });
    const n = store.all("campaigns").length;
    const seq = engine.clock.sequence;

    assert.equal(
      engine.event({ id: "same", type: "delay", minutes: 45 }).duplicate,
      true,
    );
    assert.equal(engine.clock.sequence, seq);

    assert.equal(store.all("campaigns").length, n);

    engine.reset();
    assert.equal(engine.clock.time, timeAt(14, 10));

    assert.equal(store.get("flights", "XY501").delay, 0);
    assert.equal(store.get("playlists", "S124").decision.campaignId, "C2");
  } finally {
    store.close();
  }
});

test("simulation speeds, pause, gate change and offline incident use one shared clock", () => {
  const { store, engine } = setup();
  try {
    engine.control({ action: "play", speed: 60 });
    engine.tick();
    assert.equal(engine.clock.time, timeAt(14, 11));

    engine.control({ action: "pause" });
    engine.tick();

    assert.equal(engine.clock.time, timeAt(14, 11));
    engine.event({ type: "gate-change", flightId: "XY501", gate: "48" });

    assert.equal(store.get("flights", "XY501").zoneId, "Z8");
    engine.event({ type: "screen-offline", screenId: "S124" });

    assert.equal(store.get("playlists", "S124").decision.campaignId, null);
    engine.control({ action: "play", speed: 60 });

    for (let i = 0; i < 6; i++) engine.tick();
    assert.ok(store.all("incidents").some((i) => i.screenId === "S124"));
    assert.equal(store.get("playlists", "S124").decision.delivered, false);
  } finally {
    store.close();
  }
});

test("booking-aware slot recommendations rank three distinct available slots", () => {
  const { store, engine } = setup();
  try {
    const recs = engine.recommendations("C1");
    assert.equal(recs.length, 3);

    assert.equal(new Set(recs.map((r) => r.id)).size, 3);
    const r = recs[0];
    store.put("bookings", { ...r, id: "reserved" });

    assert.ok(!engine.recommendations("C1").some((x) => x.id === r.id));
  } finally {
    store.close();
  }
});

test("SSE subscribers observe the same version after event, redemption and reset", () => {
  const { store, engine } = setup();
  try {
    const a = [],
      b = [];
    engine.on((e) => a.push(e));

    engine.on((e) => b.push(e));
    engine.event({ type: "delay", minutes: 45 });
    const token = store.get("playlists", "S124").decision.promo.id;

    engine.promo(token, "claim");
    engine.promo(token, "redeem");
    engine.reset();

    assert.deepEqual(a, b);
    assert.deepEqual(
      a.map((e) => e.type),
      [
        "flight.changed",
        "promotion.claim",
        "promotion.redeem",
        "simulation.reset",
      ],
    );
  } finally {
    store.close();
  }
});
