import fs from "node:fs";
import assert from "node:assert/strict";
import { EntityRepository } from "../apps/api/src/repositories/EntityRepository.mjs";
import { AirportEngine } from "../apps/api/src/services/AirportEngine.mjs";

fs.mkdirSync("data", { recursive: true });
fs.mkdirSync("docs", { recursive: true });
fs.mkdirSync("artifacts/reports", { recursive: true });

const file = `data/qa-performance-${Date.now()}.sqlite`;
let store = new EntityRepository(file);
let engine = new AirportEngine(store);

const delayStart = performance.now();
engine.event({ type: "delay", minutes: 45 });
const delayMs = performance.now() - delayStart;

const revenueBeforeRedemption = engine.metrics("O1").revenue;
const token = store.get("playlists", "S124").decision.promo.id;
engine.promo(token, "claim");
engine.promo(token, "redeem");

const sequence = engine.clock.sequence;
store.close();
store = new EntityRepository(file);
engine = new AirportEngine(store);

assert.equal(engine.metrics("O1").revenue, revenueBeforeRedemption + 24);
assert.equal(engine.clock.sequence, sequence);
engine.control({ action: "play", speed: 60 });

const durations = [];
const playStart = engine.metrics().plays;
for (let i = 0; i < 10; i++) {
  const started = performance.now();
  engine.tick();
  durations.push(performance.now() - started);
}

engine.control({ action: "pause" });
const result = {
  date: new Date().toISOString(),
  storage: "file-backed SQLite/WAL",
  screens: 180,

  flights: 900,
  delayMs: +delayMs.toFixed(1),

  simulationSpeed: 60,

  realTicks: 10,
  simulatedMinutes: 10,
  slotEvaluations: 40,

  meanTickMs: +(
    durations.reduce((a, b) => a + b, 0) / durations.length
  ).toFixed(1),

  maxTickMs: +Math.max(...durations).toFixed(1),

  decisionRows: store.all("decisions").length,

  activityRows: store.all("activity").length,

  deliveredPlays: engine.metrics().plays - playStart,

  persistenceVerified: true,
};
fs.writeFileSync(
  "artifacts/reports/performance-results.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
assert.ok(delayMs < 2000);

assert.ok(result.decisionRows <= 900);
assert.ok(result.activityRows < 10000);

store.close();
for (const suffix of ["", "-wal", "-shm"])
  fs.rmSync(file + suffix, { force: true });
